const multer = require('multer');
const path = require('path');
const fs = require('fs');

const tempDir = path.join(__dirname, '..', 'uploads', 'temp');

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const createDiskUpload = ({ fileSize, fileFilter } = {}) => multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      cb(null, tempDir);
    },
    filename(req, file, cb) {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  }),
  limits: {
    fileSize: fileSize || 5 * 1024 * 1024 * 1024,
  },
  fileFilter,
});

const upload = createDiskUpload();

const imageUpload = createDiskUpload({
  fileSize: 5 * 1024 * 1024,
  fileFilter(req, file, cb) {
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
    if (!allowed.has(file.mimetype)) {
      return cb(new Error('Image must be JPG, PNG, WEBP, or GIF.'));
    }
    return cb(null, true);
  },
});

module.exports = {
  createDiskUpload,
  imageUpload,
  upload,
};
