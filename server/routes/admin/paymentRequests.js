const express = require('express');
const router = express.Router();
const db = require('../../db/knex');
const { authenticate, isAdmin } = require('../../middleware/auth');
const { createOrRestoreEnrollment } = require('../../utils/enrollments');
const { notifyUser } = require('../../services/notifications');
const { sendUnexpectedError } = require('../../utils/http');

const adminRequestFields = [
  'payment_requests.id',
  'payment_requests.user_id',
  'payment_requests.course_id',
  'payment_requests.amount',
  'payment_requests.status',
  'payment_requests.contact_number',
  'payment_requests.note',
  'payment_requests.admin_note',
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
  'payment_requests.reviewed_by',
  'payment_requests.reviewed_at',
  'payment_requests.created_at',
  'users.name as user_name',
  'users.email as user_email',
  'courses.title as course_title',
  'courses.thumbnail_url as course_thumbnail_url',
  'reviewers.name as reviewer_name'
];

const normalizeAdminNote = (value) => {
  const text = String(value || '').trim();
  return text ? text.slice(0, 1000) : null;
};

const serializeAdminRequest = (request) => {
  if (!request) return null;
  return {
    id: request.id,
    user_id: request.user_id,
    course_id: request.course_id,
    amount: request.amount,
    status: request.status,
    contact_number: request.contact_number,
    note: request.note,
    admin_note: request.admin_note,
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
    reviewed_by: request.reviewed_by,
    reviewed_at: request.reviewed_at,
    created_at: request.created_at,
    user_name: request.user_name,
    user_email: request.user_email,
    course_title: request.course_title,
    course_thumbnail_url: request.course_thumbnail_url,
    reviewer_name: request.reviewer_name
  };
};

const getAdminRequest = (trx, id) => {
  return trx('payment_requests')
    .leftJoin('users', 'payment_requests.user_id', 'users.id')
    .leftJoin('courses', 'payment_requests.course_id', 'courses.id')
    .leftJoin('users as reviewers', 'payment_requests.reviewed_by', 'reviewers.id')
    .where('payment_requests.id', id)
    .select(adminRequestFields)
    .first();
};

router.get('/', authenticate, isAdmin, async (req, res) => {
  try {
    const requests = await db('payment_requests')
      .leftJoin('users', 'payment_requests.user_id', 'users.id')
      .leftJoin('courses', 'payment_requests.course_id', 'courses.id')
      .leftJoin('users as reviewers', 'payment_requests.reviewed_by', 'reviewers.id')
      .select(adminRequestFields)
      .orderByRaw("FIELD(payment_requests.status, 'pending', 'approved', 'rejected')")
      .orderBy('payment_requests.created_at', 'desc');

    res.json(requests.map(serializeAdminRequest));
  } catch (error) {
    if (error.statusCode && error.statusCode < 500) return res.status(error.statusCode).json({ error: error.message });
    return sendUnexpectedError(res, error, 'Get payment requests failed');
  }
});

router.post('/:id/approve', authenticate, isAdmin, async (req, res) => {
  const requestId = Number(req.params.id);
  if (!Number.isInteger(requestId) || requestId <= 0) {
    return res.status(400).json({ error: 'Select a valid payment request.' });
  }

  try {
    const result = await db.transaction(async (trx) => {
      const request = await trx('payment_requests').where({ id: requestId }).forUpdate().first();
      if (!request) {
        const error = new Error('Payment request not found.');
        error.statusCode = 404;
        throw error;
      }

      if (request.status !== 'pending') {
        const error = new Error('Only pending payment requests can be approved.');
        error.statusCode = 409;
        throw error;
      }

      const enrollment = await createOrRestoreEnrollment(trx, request.user_id, request.course_id);
      await trx('payment_requests').where({ id: requestId }).update({
        status: 'approved',
        reviewed_by: req.user.id,
        reviewed_at: trx.raw('NOW()'),
        admin_note: normalizeAdminNote((req.body || {}).admin_note)
      });

      const updatedRequest = await getAdminRequest(trx, requestId);
      if (!updatedRequest) {
        const error = new Error('Payment request details could not be retrieved.');
        error.statusCode = 500;
        throw error;
      }
      return { enrollment, request: serializeAdminRequest(updatedRequest) };
    });

    res.json({
      message: 'Payment request approved and course access opened.',
      enrollment: result.enrollment,
      request: result.request
    });
    await notifyUser(result.request.user_id, {
      actor_user_id: req.user.id,
      type: 'payment_request_approved',
      title: 'Payment approved',
      message: `Your payment request for ${result.request.course_title || 'your course'} was approved. The course is now available in your dashboard.`,
      entity_type: 'payment_request',
      entity_id: result.request.id,
      metadata: { course_id: result.request.course_id, course_title: result.request.course_title },
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

router.post('/:id/reject', authenticate, isAdmin, async (req, res) => {
  const requestId = Number(req.params.id);
  if (!Number.isInteger(requestId) || requestId <= 0) {
    return res.status(400).json({ error: 'Select a valid payment request.' });
  }

  try {
    const updated = await db.transaction(async (trx) => {
      const request = await trx('payment_requests').where({ id: requestId }).forUpdate().first();
      if (!request) {
        const error = new Error('Payment request not found.');
        error.statusCode = 404;
        throw error;
      }

      if (request.status !== 'pending') {
        const error = new Error('Only pending payment requests can be rejected.');
        error.statusCode = 409;
        throw error;
      }

      await trx('payment_requests').where({ id: requestId }).update({
        status: 'rejected',
        admin_note: normalizeAdminNote((req.body || {}).admin_note),
        reviewed_by: req.user.id,
        reviewed_at: trx.raw('NOW()')
      });

      const updatedRequest = await getAdminRequest(trx, requestId);
      if (!updatedRequest) {
        const error = new Error('Payment request details could not be retrieved.');
        error.statusCode = 500;
        throw error;
      }
      return serializeAdminRequest(updatedRequest);
    });

    res.json({
      message: 'Payment request rejected.',
      request: updated
    });
    await notifyUser(updated.user_id, {
      actor_user_id: req.user.id,
      type: 'payment_request_rejected',
      title: 'Payment rejected',
      message: `Your payment request for ${updated.course_title || 'your course'} was rejected. Please review the admin note or contact support.`,
      entity_type: 'payment_request',
      entity_id: updated.id,
      metadata: { course_id: updated.course_id, course_title: updated.course_title },
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

module.exports = router;
