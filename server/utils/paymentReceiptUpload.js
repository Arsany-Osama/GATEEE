const cloudinary = require('../config/cloudinary');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const fs = require('fs');
const receiptUploadDir = path.join(__dirname, '..', 'uploads', 'receipts');
if (!fs.existsSync(receiptUploadDir)) {
  fs.mkdirSync(receiptUploadDir, { recursive: true });
}
const maxReceiptSize = 5 * 1024 * 1024; // 5MB
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const extensionFor = (file) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (allowedExtensions.has(ext)) {
    return ext === '.jpeg' ? '.jpg' : ext;
  }
  if (file.mimetype === 'image/jpeg') return '.jpg';
  if (file.mimetype === 'image/png') return '.png';
  if (file.mimetype === 'image/webp') return '.webp';
  return '';
};

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!allowedMimeTypes.has(file.mimetype) || !allowedExtensions.has(ext)) {
    return cb(new Error('Receipt must be a JPG, PNG, or WebP image.'));
  }
  return cb(null, true);
};

const receiptUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: maxReceiptSize },
});

const unlinkQuietly = async (filePath) => {
  if (!filePath) return;
  const fs = require('fs');
  await fs.promises.unlink(filePath).catch(() => { });
};

const buildReceiptHash = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

const validateImageSignatureBuffer = (buffer, mimeType) => {
  if (!buffer || !Buffer.isBuffer(buffer)) return false;
  const header = buffer.subarray(0, 16);

  if (mimeType === 'image/jpeg') return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  if (mimeType === 'image/png') {
    return header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (mimeType === 'image/webp') {
    return header.subarray(0, 4).toString('ascii') === 'RIFF' && header.subarray(8, 12).toString('ascii') === 'WEBP';
  }
  return false;
};

const uploadReceiptToCloudinary = (file, receiptHash = buildReceiptHash(file.buffer)) => {
  const publicId = `payment_receipts/${receiptHash}`;
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'payment_receipts',
        public_id: publicId,
        overwrite: true,
        resource_type: 'image',
        use_filename: false,
        unique_filename: false,
        tags: ['payment_receipt'],
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve(result);
      }
    );

    stream.end(file.buffer);
  });
};

const destroyCloudinaryReceipt = async (publicId) => {
  if (!publicId) return null;
  try {
    return await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  } catch {
    return null;
  }
};

module.exports = {
  allowedMimeTypes,
  buildReceiptHash,
  destroyCloudinaryReceipt,
  extensionFor,
  maxReceiptSize,
  receiptUpload,
  receiptUploadDir,
  unlinkQuietly,
  uploadReceiptToCloudinary,
  validateImageSignatureBuffer,
};
