const fs = require('fs/promises');
const path = require('path');
const {
  receiptUploadDir,
  validateImageSignatureBuffer,
  uploadReceiptToCloudinary,
  buildReceiptHash,
} = require('../utils/paymentReceiptUpload');

const normalizeMime = (receiptUrl, fallback = null) => {
  const ext = path.extname(String(receiptUrl || '')).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return fallback;
};

exports.up = async (db) => {
  await db.raw('ALTER TABLE payment_requests MODIFY receipt_url VARCHAR(1024) NULL');
  const hasPublicId = await db.schema.hasColumn('payment_requests', 'receipt_public_id');
  if (!hasPublicId) {
    await db.raw('ALTER TABLE payment_requests ADD COLUMN receipt_public_id VARCHAR(255) NULL AFTER receipt_url');
  }

  const cloudinaryReady = Boolean(
    process.env.CLOUDINARY_URL
    || (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
  );
  if (!cloudinaryReady) {
    console.warn('Skipping payment receipt Cloudinary backfill because Cloudinary env vars are missing.');
    return;
  }

  const rows = await db('payment_requests')
    .whereNotNull('receipt_url')
    .whereNull('receipt_public_id')
    .orderBy('id');

  for (const row of rows) {
    const receiptUrl = String(row.receipt_url || '');
    if (/^https?:\/\//i.test(receiptUrl)) {
      continue;
    }

    const filePath = path.join(receiptUploadDir, path.basename(receiptUrl));
    let buffer;
    try {
      buffer = await fs.readFile(filePath);
    } catch {
      console.warn(`Skipping payment receipt backfill for request ${row.id}: file missing.`);
      continue;
    }

    const mimeType = normalizeMime(receiptUrl, row.receipt_mime_type);
    if (!validateImageSignatureBuffer(buffer, mimeType)) {
      console.warn(`Skipping payment receipt backfill for request ${row.id}: invalid image signature.`);
      continue;
    }

    const hash = row.receipt_hash || buildReceiptHash(buffer);
    const uploaded = await uploadReceiptToCloudinary(
      {
        buffer,
        originalname: row.receipt_original_name || path.basename(receiptUrl),
        mimetype: mimeType,
      },
      hash
    );

    await db('payment_requests')
      .where({ id: row.id })
      .update({
        receipt_url: uploaded.secure_url,
        receipt_public_id: uploaded.public_id,
        receipt_mime_type: mimeType,
        receipt_size: uploaded.bytes || row.receipt_size || buffer.length,
      });
  }
};
