const express = require('express');
const router = express.Router();
const db = require('../db/knex');
const { authenticate, isAdmin } = require('../middleware/auth');
const {
  allowedSettingKeys,
  ensurePlatformSettings,
  listAdminSettings,
  listPublicSettings,
  settingDefinitions,
} = require('../services/platformSettings');
const { sendUnexpectedError } = require('../utils/http');

const secretKeyPattern = /(password|secret|token|smtp_pass|smtp_user|hash)/i;
const phonePattern = /^[+\d][\d\s().-]{5,31}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const serializeAdminRows = (rows) => rows.reduce((acc, row) => {
  acc[row.setting_key] = {
    value: row.setting_value || '',
    type: row.setting_type,
    is_public: Boolean(row.is_public),
    label: row.label,
    description: row.description,
    updated_at: row.updated_at,
  };
  return acc;
}, {});

const validateSetting = (key, rawValue) => {
  if (!allowedSettingKeys.includes(key) || secretKeyPattern.test(key)) {
    return 'This setting cannot be updated.';
  }

  const value = String(rawValue ?? '').trim();
  const type = settingDefinitions[key].type;

  if (value.length > 4000) return 'Setting value is too long.';

  if (type === 'url') {
    if (!value) return '';
    try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol)) return 'URL must start with http or https.';
    } catch {
      return 'Enter a valid URL.';
    }
  }

  if (type === 'email' && value && !emailPattern.test(value)) {
    return 'Enter a valid email address.';
  }

  if (type === 'phone' && value && !phonePattern.test(value)) {
    return 'Enter a valid phone number.';
  }

  return '';
};

router.get('/public', async (req, res) => {
  try {
    res.json(await listPublicSettings());
  } catch (error) {
    if (error.statusCode && error.statusCode < 500) return res.status(error.statusCode).json({ error: error.message });
    return sendUnexpectedError(res, error, 'Public settings failed');
  }
});

router.get('/', authenticate, isAdmin, async (req, res) => {
  try {
    const rows = await listAdminSettings();
    res.json(serializeAdminRows(rows));
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

router.put('/', authenticate, isAdmin, async (req, res) => {
  const body = req.body || {};
  const entries = Object.entries(body);
  if (!entries.length) {
    return res.status(400).json({ error: 'No settings were provided.' });
  }

  const errors = {};
  const updates = {};
  entries.forEach(([key, value]) => {
    const error = validateSetting(key, value);
    if (error) {
      errors[key] = error;
      return;
    }
    updates[key] = String(value ?? '').trim();
  });

  if (Object.keys(errors).length) {
    return res.status(400).json({ error: 'Some settings are invalid.', fields: errors });
  }

  try {
    await db.transaction(async (trx) => {
      await ensurePlatformSettings(trx);
      for (const [key, value] of Object.entries(updates)) {
        await trx('platform_settings')
          .where({ setting_key: key })
          .update({
            setting_value: value,
            updated_by: req.user.id,
          });
      }
    });

    const rows = await listAdminSettings();
    res.json(serializeAdminRows(rows));
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

module.exports = router;
