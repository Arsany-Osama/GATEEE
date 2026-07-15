const express = require('express');
const fs = require('fs');
const router = express.Router();
const cloudinary = require('../../config/cloudinary');
const { imageUpload } = require('../../middleware/upload');
const { authenticate, isAdmin } = require('../../middleware/auth');
const { sendUnexpectedError } = require('../../utils/http');

router.use(authenticate, isAdmin);

router.post('/course-image', imageUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Choose an image to upload.' });

    const uploaded = await cloudinary.uploader.upload(req.file.path, {
      resource_type: 'image',
      folder: 'gate/course-images',
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    });

    await fs.promises.unlink(req.file.path).catch(() => {});

    return res.status(201).json({
      message: 'Image uploaded.',
      url: uploaded.secure_url,
      public_id: uploaded.public_id,
      bytes: uploaded.bytes,
      format: uploaded.format,
      width: uploaded.width,
      height: uploaded.height,
    });
  } catch (error) {
    if (req.file?.path) await fs.promises.unlink(req.file.path).catch(() => {});
    if (error.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Image must be 5 MB or smaller.' });
    if (error.message?.includes('Image must be')) return res.status(400).json({ error: error.message });
    return sendUnexpectedError(res, error, 'Course image upload failed');
  }
});

module.exports = router;
