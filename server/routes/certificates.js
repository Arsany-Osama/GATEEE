const express = require('express');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const db = require('../db/knex');
const { authenticate, isAdmin } = require('../middleware/auth');
const { sendUnexpectedError } = require('../utils/http');
const {
  checkCertificateEligibility,
  ensureCertificateForCourse,
  getCertificateDetails,
  isSignatureValid,
} = require('../services/certificates');

const router = express.Router();

const publicCertificateUrl = (uuid) => {
  const origin = process.env.PUBLIC_APP_URL
    || process.env.FRONTEND_URL
    || String(process.env.CORS_ORIGIN || 'http://localhost:5173').split(',')[0];
  return `${origin.replace(/\/$/, '')}/verify/certificate/${uuid}`;
};

const publicCertificatePayload = (certificate) => ({
  uuid: certificate.uuid,
  student_name: certificate.student_name,
  course_name: certificate.course_name,
  issued_at: certificate.issued_at,
  status: certificate.revoked_at ? 'Revoked' : 'Valid',
  revoked_at: certificate.revoked_at,
});

const formatCertificateDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleDateString('en', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

router.post('/courses/:courseId/issue', authenticate, async (req, res) => {
  const courseId = Number(req.params.courseId);
  if (!Number.isInteger(courseId) || courseId <= 0) {
    return res.status(400).json({ error: 'Select a valid course.' });
  }

  try {
    const eligibility = await checkCertificateEligibility(req.user.id, courseId);
    if (!eligibility.eligible) {
      return res.status(409).json({ error: eligibility.reason, eligibility });
    }

    const certificate = await ensureCertificateForCourse(req.user.id, courseId);
    return res.status(201).json({ certificate });
  } catch (error) {
    return sendUnexpectedError(res, error, 'Certificate issue failed');
  }
});

router.get('/mine', authenticate, async (req, res) => {
  try {
    const rows = await db('certificates')
      .join('courses', 'certificates.course_id', 'courses.id')
      .where('certificates.user_id', req.user.id)
      .select(
        'certificates.uuid',
        'certificates.course_id',
        'certificates.issued_at',
        'certificates.revoked_at',
        'courses.title as course_name'
      )
      .orderBy('certificates.issued_at', 'desc');
    res.json(rows.map((row) => ({ ...row, status: row.revoked_at ? 'Revoked' : 'Valid' })));
  } catch (error) {
    return sendUnexpectedError(res, error, 'List certificates failed');
  }
});

router.get('/verify/:uuid', async (req, res) => {
  try {
    const certificate = await getCertificateDetails(req.params.uuid);
    if (!certificate || !isSignatureValid(certificate)) {
      return res.status(404).json({ error: 'Certificate not found or invalid.' });
    }

    res.json(publicCertificatePayload(certificate));
  } catch (error) {
    return sendUnexpectedError(res, error, 'Certificate verification failed');
  }
});

router.get('/:uuid/download', authenticate, async (req, res) => {
  try {
    const certificate = await getCertificateDetails(req.params.uuid);
    if (!certificate || !isSignatureValid(certificate)) {
      return res.status(404).json({ error: 'Certificate not found or invalid.' });
    }
    if (req.user.role !== 'admin' && Number(certificate.user_id) !== Number(req.user.id)) {
      return res.status(403).json({ error: 'You do not have permission to download this certificate.' });
    }

    const qrDataUrl = await QRCode.toDataURL(publicCertificateUrl(certificate.uuid), { margin: 1, width: 180 });
    const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate-${certificate.uuid}.pdf"`);

    const doc = new PDFDocument({ size: 'A4', margin: 0, info: {
      Title: `GATE Certificate ${certificate.uuid}`,
      Author: 'GATE',
      Subject: certificate.course_name || 'Course completion',
    } });
    doc.pipe(res);

    doc.rect(0, 0, 595.28, 841.89).fill('#f8fbff');
    doc.rect(24, 24, 547, 794).lineWidth(1.2).stroke('#1d4ed8');
    doc.rect(34, 34, 527, 774).lineWidth(0.6).stroke('#93c5fd');
    doc.rect(52, 52, 491, 738).fillOpacity(0.98).fill('#ffffff').fillOpacity(1);
    doc.rect(52, 52, 491, 82).fill('#0f172a');
    doc.rect(52, 134, 491, 8).fill('#2563eb');

    doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold').text('GATE TRAINING', 78, 78, { characterSpacing: 1.8 });
    doc.fontSize(9).font('Helvetica').fillColor('#bfdbfe').text('Safety and industrial learning credential', 78, 96);
    doc.circle(486, 92, 28).fill('#2563eb');
    doc.fillColor('#ffffff').fontSize(26).font('Helvetica-Bold').text('G', 476, 80);

    doc.fillColor('#0f172a').fontSize(32).font('Helvetica-Bold').text('Certificate of Completion', 78, 182, {
      width: 439,
      align: 'center',
    });
    doc.moveTo(146, 232).lineTo(449, 232).lineWidth(0.7).stroke('#bfdbfe');

    doc.fontSize(12).font('Helvetica').fillColor('#64748b').text('This certifies that', 78, 266, {
      width: 439,
      align: 'center',
    });
    doc.fontSize(30).font('Helvetica-Bold').fillColor('#111827').text(certificate.student_name || 'Student', 78, 296, {
      width: 439,
      align: 'center',
    });
    doc.fontSize(12).font('Helvetica').fillColor('#64748b').text('has successfully completed', 78, 356, {
      width: 439,
      align: 'center',
    });
    doc.fontSize(23).font('Helvetica-Bold').fillColor('#1d4ed8').text(certificate.course_name || 'Course', 86, 388, {
      width: 423,
      align: 'center',
    });

    doc.roundedRect(96, 486, 185, 68, 8).stroke('#dbeafe');
    doc.roundedRect(314, 486, 185, 68, 8).stroke('#dbeafe');
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text('ISSUED ON', 112, 504);
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#0f172a').text(formatCertificateDate(certificate.issued_at), 112, 523, { width: 150 });
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text('CERTIFICATE ID', 330, 504);
    doc.fontSize(9).font('Helvetica').fillColor('#0f172a').text(certificate.uuid, 330, 523, { width: 150 });

    doc.image(Buffer.from(qrBase64, 'base64'), 238, 592, { width: 120 });
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a').text('Scan to verify authenticity', 78, 724, {
      width: 439,
      align: 'center',
    });
    doc.fontSize(8).font('Helvetica').fillColor('#64748b').text(publicCertificateUrl(certificate.uuid), 78, 742, {
      width: 439,
      align: 'center',
    });
    doc.end();
  } catch (error) {
    return sendUnexpectedError(res, error, 'Certificate download failed');
  }
});

router.get('/admin/list', authenticate, isAdmin, async (req, res) => {
  try {
    const rows = await db('certificates')
      .join('users', 'certificates.user_id', 'users.id')
      .join('courses', 'certificates.course_id', 'courses.id')
      .leftJoin('users as revoked_users', 'certificates.revoked_by', 'revoked_users.id')
      .select(
        'certificates.uuid',
        'certificates.issued_at',
        'certificates.revoked_at',
        'users.name as student_name',
        'users.email as student_email',
        'courses.title as course_name',
        'revoked_users.name as revoked_by_name'
      )
      .orderBy('certificates.issued_at', 'desc')
      .limit(200);
    res.json(rows.map((row) => ({ ...row, status: row.revoked_at ? 'Revoked' : 'Valid' })));
  } catch (error) {
    return sendUnexpectedError(res, error, 'Admin certificates failed');
  }
});

router.post('/admin/:uuid/revoke', authenticate, isAdmin, async (req, res) => {
  try {
    const certificate = await getCertificateDetails(req.params.uuid);
    if (!certificate || !isSignatureValid(certificate)) {
      return res.status(404).json({ error: 'Certificate not found or invalid.' });
    }
    await db('certificates')
      .where({ uuid: req.params.uuid })
      .whereNull('revoked_at')
      .update({ revoked_at: db.raw('NOW()'), revoked_by: req.user.id });
    res.json({ message: 'Certificate revoked.' });
  } catch (error) {
    return sendUnexpectedError(res, error, 'Certificate revoke failed');
  }
});

module.exports = router;
