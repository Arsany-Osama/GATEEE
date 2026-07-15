const express = require('express');
const https = require('https');
const path = require('path');
const db = require('../db/knex');
const { authenticate, isAdmin } = require('../middleware/auth');
const { notifyAdminPaymentRequest } = require('../services/emailNotifications');
const { notifyAdmins } = require('../services/notifications');
const {
  receiptUpload,
  receiptUploadDir,
  unlinkQuietly,
  validateImageSignatureBuffer,
  uploadReceiptToCloudinary,
  destroyCloudinaryReceipt,
  buildReceiptHash,
} = require('../utils/paymentReceiptUpload');
const { sendUnexpectedError } = require('../utils/http');

const router = express.Router();

const safeRequestFields = [
  'payment_requests.id',
  'payment_requests.course_id',
  'payment_requests.amount',
  'payment_requests.status',
  'payment_requests.contact_number',
  'payment_requests.note',
  'payment_requests.receipt_url',
  'payment_requests.receipt_public_id',
  'payment_requests.receipt_hash',
  'payment_requests.receipt_original_name',
  'payment_requests.receipt_mime_type',
  'payment_requests.receipt_size',
  'payment_requests.payer_name',
  'payment_requests.payer_phone',
  'payment_requests.payment_method',
  'payment_requests.transfer_reference',
  'payment_requests.transfer_date',
  'payment_requests.submitted_amount',
  'payment_requests.created_at',
  'payment_requests.reviewed_at',
  'courses.title as course_title',
  'courses.thumbnail_url as course_thumbnail_url',
];

const normalizeOptionalText = (value, maxLength = 1000) => {
  const text = String(value || '').trim();
  return text ? text.slice(0, maxLength) : null;
};

const findActiveCourse = (courseId) => {
  return db('courses')
    .where({ id: courseId })
    .whereNull('deleted_at')
    .where('is_published', true)
    .first();
};

const isCloudinaryReceiptUrl = (value) => /^https?:\/\//i.test(String(value || ''));

const findActiveEnrollment = (userId, courseId) => {
  return db('enrollments')
    .where({ user_id: userId, course_id: courseId })
    .whereNull('deleted_at')
    .first();
};

const findPendingRequest = (userId, courseId) => {
  return db('payment_requests')
    .where({ user_id: userId, course_id: courseId, status: 'pending' })
    .first();
};

const serializeRequest = (request) => ({
  id: request.id,
  course_id: request.course_id,
  amount: request.amount,
  status: request.status,
  contact_number: request.contact_number,
  note: request.note,
  receipt_url: request.receipt_url ? `/payment-requests/${request.id}/receipt` : null,
  receipt_public_id: request.receipt_public_id,
  receipt_hash: request.receipt_hash,
  receipt_original_name: request.receipt_original_name,
  receipt_mime_type: request.receipt_mime_type,
  receipt_size: request.receipt_size,
  payer_name: request.payer_name,
  payer_phone: request.payer_phone,
  payment_method: request.payment_method,
  transfer_reference: request.transfer_reference,
  transfer_date: request.transfer_date,
  submitted_amount: request.submitted_amount,
  created_at: request.created_at,
  reviewed_at: request.reviewed_at,
  course_title: request.course_title,
  course_thumbnail_url: request.course_thumbnail_url,
});

const uploadReceipt = (req, res, next) => {
  receiptUpload.single('receipt')(req, res, (error) => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Receipt image must be 5MB or smaller.' });
    }
    return res.status(400).json({ error: error.message || 'Receipt upload failed.' });
  });
};

const numericAmountOrNull = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : NaN;
};

const dateOrNull = (value) => {
  const text = String(value || '').trim();
  if (!text) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : 'invalid';
};

const paymentDetailPayload = (body) => {
  const submittedAmount = numericAmountOrNull(body.submitted_amount);
  if (Number.isNaN(submittedAmount)) {
    const error = new Error('Submitted amount must be a valid non-negative number.');
    error.statusCode = 400;
    throw error;
  }

  const transferDate = dateOrNull(body.transfer_date);
  if (transferDate === 'invalid') {
    const error = new Error('Transfer date must use YYYY-MM-DD format.');
    error.statusCode = 400;
    throw error;
  }

  return {
    payer_name: normalizeOptionalText(body.payer_name, 255),
    payer_phone: normalizeOptionalText(body.payer_phone || body.contact_number, 80),
    payment_method: normalizeOptionalText(body.payment_method, 80),
    transfer_reference: normalizeOptionalText(body.transfer_reference, 255),
    transfer_date: transferDate,
    submitted_amount: submittedAmount,
    contact_number: normalizeOptionalText(body.contact_number || body.payer_phone, 80),
    note: normalizeOptionalText(body.note, 1000),
  };
};

const ensureUniqueReceiptHash = async (receiptHash, ignoreRequestId = null) => {
  if (!receiptHash) return;
  const query = db('payment_requests').where({ receipt_hash: receiptHash });
  if (ignoreRequestId) query.whereNot({ id: ignoreRequestId });
  const duplicate = await query.first('id');
  if (duplicate) {
    const error = new Error('This receipt image has already been submitted.');
    error.statusCode = 409;
    throw error;
  }
};

const validateRequiredSubmission = ({ details, receiptFileName, existing }) => {
  const merged = {
    payer_name: details.payer_name || existing?.payer_name,
    payer_phone: details.payer_phone || existing?.payer_phone,
    payment_method: details.payment_method || existing?.payment_method,
    receipt_url: receiptFileName || existing?.receipt_url,
  };

  if (!merged.payer_name) return 'Payer name is required.';
  if (!merged.payer_phone) return 'Phone or WhatsApp number is required.';
  if (!merged.payment_method) return 'Payment method is required.';
  if (!merged.receipt_url) return 'Receipt screenshot is required.';
  return '';
};

const validateReceiptFile = async (file) => {
  if (!file) return null;
  const validSignature = validateImageSignatureBuffer(file.buffer, file.mimetype);
  if (!validSignature) {
    const error = new Error('Uploaded file does not appear to be a valid image.');
    error.statusCode = 400;
    throw error;
  }
  const receiptHash = buildReceiptHash(file.buffer);
  const uploaded = await uploadReceiptToCloudinary(file, receiptHash);
  return {
    receipt_original_name: normalizeOptionalText(file.originalname, 255),
    receipt_url: uploaded.secure_url || uploaded.url,
    receipt_public_id: uploaded.public_id,
    receipt_hash: receiptHash,
    receipt_mime_type: file.mimetype,
    receipt_size: uploaded.bytes || file.size,
  };
};

const isCloudinaryReceipt = (request) => Boolean(request?.receipt_public_id)
  || /^https?:\/\/res\.cloudinary\.com\//i.test(String(request?.receipt_url || ''));

const extractCloudinaryPublicId = (receiptUrl) => {
  try {
    const pathname = new URL(receiptUrl).pathname;
    const match = pathname.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.\/]+$/i);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
};

const cleanupStoredReceipt = async (request) => {
  if (!request?.receipt_url) return;
  if (request.receipt_public_id || /^https?:\/\/res\.cloudinary\.com\//i.test(String(request.receipt_url))) {
    await destroyCloudinaryReceipt(request.receipt_public_id || extractCloudinaryPublicId(request.receipt_url));
    return;
  }
  await unlinkQuietly(path.join(receiptUploadDir, path.basename(request.receipt_url)));
};

const sendCloudinaryReceipt = (request, res) => new Promise((resolve, reject) => {
  https.get(request.receipt_url, (remote) => {
    if ((remote.statusCode || 0) >= 400) {
      remote.resume();
      const error = new Error('Receipt not found.');
      error.statusCode = 404;
      reject(error);
      return;
    }

    res.status(remote.statusCode || 200);
    res.setHeader('Content-Type', request.receipt_mime_type || remote.headers['content-type'] || 'application/octet-stream');
    if (remote.headers['content-length']) {
      res.setHeader('Content-Length', remote.headers['content-length']);
    }
    remote.pipe(res);
    remote.on('end', resolve);
    remote.on('error', reject);
  }).on('error', reject);
});

const fetchSafeRequest = (requestId) => {
  return db('payment_requests')
    .leftJoin('courses', 'payment_requests.course_id', 'courses.id')
    .where('payment_requests.id', requestId)
    .select(safeRequestFields)
    .first();
};

router.post('/', authenticate, uploadReceipt, async (req, res) => {
  let uploadedReceipt = null;
  try {
    const courseId = Number(req.body.course_id);
    if (!Number.isInteger(courseId) || courseId <= 0) {
      return res.status(400).json({ error: 'Select a valid course.' });
    }

    const details = paymentDetailPayload(req.body);
    uploadedReceipt = await validateReceiptFile(req.file);
    const receiptPayload = uploadedReceipt;

    const enrolled = await findActiveEnrollment(req.user.id, courseId);
    if (enrolled) {
      await destroyCloudinaryReceipt(receiptPayload?.receipt_public_id);
      return res.status(409).json({
        status: 'already_enrolled',
        message: 'This course is already available in your dashboard.',
      });
    }

    const course = await findActiveCourse(courseId);
    if (!course) {
      await destroyCloudinaryReceipt(receiptPayload?.receipt_public_id);
      return res.status(400).json({ error: 'Select an active published course.' });
    }

    const amount = Number(course.price);
    if (!Number.isFinite(amount) || amount <= 0) {
      await destroyCloudinaryReceipt(receiptPayload?.receipt_public_id);
      return res.status(500).json({ error: 'This course does not have a valid payment amount configured.' });
    }

    const pending = await findPendingRequest(req.user.id, courseId);
    if (pending) {
      const validation = validateRequiredSubmission({ details, receiptFileName: receiptPayload?.receipt_url, existing: pending });
      if (validation) {
        await destroyCloudinaryReceipt(receiptPayload?.receipt_public_id);
        return res.status(400).json({ error: validation });
      }
      await ensureUniqueReceiptHash(receiptPayload?.receipt_hash, pending.id);

      const wasComplete = Boolean(pending.receipt_url && pending.payer_name && pending.payer_phone && pending.payment_method);
      const updatePayload = { ...details };
      Object.keys(updatePayload).forEach((key) => {
        if (updatePayload[key] === null) delete updatePayload[key];
      });
      if (receiptPayload) Object.assign(updatePayload, receiptPayload);

      if (Object.keys(updatePayload).length) {
        await db('payment_requests').where({ id: pending.id }).update(updatePayload);
        if (receiptPayload && pending.receipt_url) {
          await cleanupStoredReceipt(pending);
        }
      }

      const request = await fetchSafeRequest(pending.id);
      const user = await db('users').where({ id: req.user.id }).first('name', 'email');
      const isComplete = Boolean(request.receipt_url && request.payer_name && request.payer_phone && request.payment_method);
      if (!wasComplete && isComplete) {
        await notifyAdminPaymentRequest({ request, user });
        await notifyAdmins({
          actor_user_id: req.user.id,
          type: 'payment_request_created',
          title: 'New payment request',
          message: `New payment request submitted by ${user?.name || user?.email || 'a student'} for ${request.course_title || 'a course'}.`,
          entity_type: 'payment_request',
          entity_id: request.id,
          metadata: { course_id: request.course_id, course_title: request.course_title },
        });
      }

      return res.json({
        status: 'pending',
        message: 'Your payment request is pending admin review.',
        request: serializeRequest(request),
      });
    }

    const validation = validateRequiredSubmission({ details, receiptFileName: receiptPayload?.receipt_url, existing: null });
    if (validation) {
      await destroyCloudinaryReceipt(receiptPayload?.receipt_public_id);
      return res.status(400).json({ error: validation });
    }
    await ensureUniqueReceiptHash(receiptPayload?.receipt_hash);

    const payload = {
      user_id: req.user.id,
      course_id: courseId,
      amount,
      status: 'pending',
      ...details,
      ...receiptPayload,
    };

    const [requestId] = await db('payment_requests').insert(payload);
    const request = await fetchSafeRequest(requestId);
    const user = await db('users').where({ id: req.user.id }).first('name', 'email');
    await notifyAdminPaymentRequest({ request, user });
    await notifyAdmins({
      actor_user_id: req.user.id,
      type: 'payment_request_created',
      title: 'New payment request',
      message: `New payment request submitted by ${user?.name || user?.email || 'a student'} for ${request.course_title || 'a course'}.`,
      entity_type: 'payment_request',
      entity_id: request.id,
      metadata: { course_id: request.course_id, course_title: request.course_title },
    });

    return res.status(201).json({
      status: 'pending',
      message: 'Your payment request has been submitted and is waiting for admin review.',
      request: serializeRequest(request),
    });
  } catch (error) {
    await destroyCloudinaryReceipt(uploadedReceipt?.receipt_public_id);
    if (error.statusCode && error.statusCode < 500) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    return sendUnexpectedError(res, error, 'Create payment request failed');
  }
});

router.get('/my', authenticate, async (req, res) => {
  try {
    const requests = await db('payment_requests')
      .leftJoin('courses', 'payment_requests.course_id', 'courses.id')
      .where('payment_requests.user_id', req.user.id)
      .select(safeRequestFields)
      .orderBy('payment_requests.created_at', 'desc');

    res.json(requests.map(serializeRequest));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/my/:courseId', authenticate, async (req, res) => {
  const courseId = Number(req.params.courseId);
  if (!Number.isInteger(courseId) || courseId <= 0) {
    return res.status(400).json({ error: 'Select a valid course.' });
  }

  try {
    const enrolled = await findActiveEnrollment(req.user.id, courseId);
    if (enrolled) {
      return res.json({
        status: 'already_enrolled',
        message: 'This course is already available in your dashboard.',
        request: null,
      });
    }

    const request = await db('payment_requests')
      .leftJoin('courses', 'payment_requests.course_id', 'courses.id')
      .where('payment_requests.user_id', req.user.id)
      .where('payment_requests.course_id', courseId)
      .select(safeRequestFields)
      .orderBy('payment_requests.created_at', 'desc')
      .first();

    res.json({
      status: request?.status || 'none',
      request: request ? serializeRequest(request) : null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/receipt', authenticate, async (req, res) => {
  const requestId = Number(req.params.id);
  if (!Number.isInteger(requestId) || requestId <= 0) {
    return res.status(400).json({ error: 'Select a valid payment request.' });
  }

  try {
    const request = await db('payment_requests').where({ id: requestId }).first();
    if (!request?.receipt_url) {
      return res.status(404).json({ error: 'Receipt not found.' });
    }

    if (request.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have permission to view this receipt.' });
    }

    if (isCloudinaryReceipt(request)) {
      try {
        await sendCloudinaryReceipt(request, res);
        return;
      } catch (error) {
        return res.status(error.statusCode || 500).json({ error: error.message });
      }
    }

    const fs = require('fs');
    const filePath = path.join(receiptUploadDir, path.basename(request.receipt_url));
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Receipt file not found on server.' });
    }
    res.type(request.receipt_mime_type || 'image/jpeg');
    return res.sendFile(filePath);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
