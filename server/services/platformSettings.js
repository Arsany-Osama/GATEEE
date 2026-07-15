const db = require('../db/knex');

const settingDefinitions = {
  platform_name: {
    defaultValue: 'GATE',
    type: 'text',
    isPublic: true,
    label: 'Platform name',
    description: 'Public platform or brand name.',
  },
  contact_email: {
    defaultValue: 'support@gatelearning.com',
    type: 'email',
    isPublic: true,
    label: 'Contact email',
    description: 'Public support contact email.',
  },
  whatsapp_number: {
    defaultValue: '201065200731',
    type: 'phone',
    isPublic: true,
    label: 'WhatsApp number',
    description: 'International WhatsApp number without a plus sign.',
  },
  whatsapp_display: {
    defaultValue: '+20 10 65200731',
    type: 'text',
    isPublic: true,
    label: 'WhatsApp display text',
    description: 'Human-readable WhatsApp or phone number.',
  },
  instapay_number: {
    defaultValue: '+20 10 65200731',
    type: 'phone',
    isPublic: true,
    label: 'InstaPay number',
    description: 'Manual payment InstaPay transfer number.',
  },
  instapay_name: {
    defaultValue: 'GATE',
    type: 'text',
    isPublic: true,
    label: 'InstaPay account name',
    description: 'Manual payment InstaPay account or recipient name.',
  },
  facebook_url: {
    defaultValue: 'https://www.facebook.com/share/1Ph9fSQUkJ/',
    type: 'url',
    isPublic: true,
    label: 'Facebook URL',
    description: 'Public Facebook profile or page link.',
  },
  instagram_url: {
    defaultValue: 'https://www.instagram.com/ahmed_gamal_elghawy?igsh=MWdhb2hod3R5MGc1dw==',
    type: 'url',
    isPublic: true,
    label: 'Instagram URL',
    description: 'Public Instagram profile link.',
  },
  footer_location: {
    defaultValue: 'Alexandria, Egypt',
    type: 'text',
    isPublic: true,
    label: 'Footer location',
    description: 'Location displayed in public footer.',
  },
  admin_notification_email: {
    defaultValue: '',
    type: 'email',
    isPublic: false,
    label: 'Admin notification email',
    description: 'Recipient for admin payment request notifications. SMTP credentials remain env-only.',
  },
  payment_instructions_title: {
    defaultValue: 'Complete Manual Course Payment',
    type: 'text',
    isPublic: true,
    label: 'Payment instructions title',
    description: 'Heading shown on the payment instructions page.',
  },
  payment_instructions_body: {
    defaultValue: 'Transfer the course amount using InstaPay, then send the payment screenshot to the instructor so your course access can be reviewed and activated manually.',
    type: 'textarea',
    isPublic: true,
    label: 'Payment instructions body',
    description: 'Introductory manual payment instructions.',
  },
  payment_success_note: {
    defaultValue: 'Course access is not activated automatically. The instructor/admin will review the payment screenshot and manually open the course for your account.',
    type: 'textarea',
    isPublic: true,
    label: 'Payment success note',
    description: 'Important notice shown on the payment page.',
  },
  payment_receipt_help_text: {
    defaultValue: 'JPG, PNG, or WebP up to 5MB.',
    type: 'text',
    isPublic: true,
    label: 'Receipt help text',
    description: 'Help text displayed beside the receipt upload input.',
  },
};

const allowedSettingKeys = Object.keys(settingDefinitions);

const rowsToObject = (rows) => rows.reduce((acc, row) => {
  acc[row.setting_key] = row.setting_value || '';
  return acc;
}, {});

const platformSettingsAvailable = async () => db.schema.hasTable('platform_settings');

const defaultPublicSettings = () => rowsToObject(
  allowedSettingKeys
    .filter((key) => settingDefinitions[key].isPublic)
    .map((key) => ({ setting_key: key, setting_value: settingDefinitions[key].defaultValue }))
);

const defaultAdminSettingsRows = () => allowedSettingKeys.map((key) => {
  const definition = settingDefinitions[key];
  return {
    setting_key: key,
    setting_value: definition.defaultValue,
    setting_type: definition.type,
    is_public: definition.isPublic,
    label: definition.label,
    description: `${definition.description} Apply migration 006_create_platform_settings.sql to save this setting.`,
    updated_at: null,
  };
});

const ensurePlatformSettings = async (trx = db) => {
  if (!(await platformSettingsAvailable())) {
    const error = new Error('Platform settings migration has not been applied yet.');
    error.statusCode = 503;
    throw error;
  }

  const rows = allowedSettingKeys.map((key) => {
    const definition = settingDefinitions[key];
    return {
      setting_key: key,
      setting_value: definition.defaultValue,
      setting_type: definition.type,
      is_public: definition.isPublic,
      label: definition.label,
      description: definition.description,
    };
  });

  await trx('platform_settings')
    .insert(rows)
    .onConflict('setting_key')
    .merge(['setting_type', 'is_public', 'label', 'description']);
};

const listPublicSettings = async () => {
  if (!(await platformSettingsAvailable())) return defaultPublicSettings();
  await ensurePlatformSettings();
  const rows = await db('platform_settings')
    .where({ is_public: true })
    .whereIn('setting_key', allowedSettingKeys)
    .select('setting_key', 'setting_value');
  return rowsToObject(rows);
};

const listAdminSettings = async () => {
  if (!(await platformSettingsAvailable())) return defaultAdminSettingsRows();
  await ensurePlatformSettings();
  return db('platform_settings')
    .whereIn('setting_key', allowedSettingKeys)
    .select('setting_key', 'setting_value', 'setting_type', 'is_public', 'label', 'description', 'updated_at')
    .orderByRaw(`FIELD(setting_key, ${allowedSettingKeys.map(() => '?').join(',')})`, allowedSettingKeys);
};

const getSettingValue = async (key) => {
  if (!allowedSettingKeys.includes(key)) return '';
  if (!(await platformSettingsAvailable())) return settingDefinitions[key].defaultValue;
  await ensurePlatformSettings();
  const row = await db('platform_settings').where({ setting_key: key }).first('setting_value');
  return row?.setting_value || '';
};

module.exports = {
  allowedSettingKeys,
  ensurePlatformSettings,
  getSettingValue,
  listAdminSettings,
  listPublicSettings,
  platformSettingsAvailable,
  settingDefinitions,
};
