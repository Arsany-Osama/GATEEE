const updates = [
  {
    setting_key: 'whatsapp_display',
    setting_value: '+20 10 65200731',
    setting_type: 'text',
    is_public: true,
    label: 'WhatsApp display text',
    description: 'Human-readable WhatsApp or phone number.',
  },
  {
    setting_key: 'vodafone_cash_number',
    setting_value: '01065200731',
    setting_type: 'phone',
    is_public: true,
    label: 'Vodafone Cash number',
    description: 'Manual payment Vodafone Cash transfer number.',
  },
  {
    setting_key: 'instapay_number',
    setting_value: '01224378275',
    setting_type: 'phone',
    is_public: true,
    label: 'InstaPay number',
    description: 'Manual payment InstaPay transfer number.',
  },
  {
    setting_key: 'instapay_name',
    setting_value: 'Instapay',
    setting_type: 'text',
    is_public: true,
    label: 'InstaPay account name',
    description: 'Manual payment InstaPay account or recipient name.',
  },
  {
    setting_key: 'payment_instructions_title',
    setting_value: 'Complete Manual Course Payment',
    setting_type: 'text',
    is_public: true,
    label: 'Payment instructions title',
    description: 'Heading shown on the payment instructions page.',
  },
  {
    setting_key: 'payment_instructions_body',
    setting_value: 'Transfer the course amount using Vodafone Cash or InstaPay, then send the payment screenshot to the instructor so your course access can be reviewed and activated manually.',
    setting_type: 'textarea',
    is_public: true,
    label: 'Payment instructions body',
    description: 'Introductory manual payment instructions.',
  },
  {
    setting_key: 'payment_success_note',
    setting_value: 'Course access is not activated automatically. The instructor/admin will review the payment screenshot and manually open the course for your account.',
    setting_type: 'textarea',
    is_public: true,
    label: 'Payment success note',
    description: 'Important notice shown on the payment page.',
  },
];

exports.up = async function up(db) {
  if (!await db.schema.hasTable('platform_settings')) return;

  for (const setting of updates) {
    await db('platform_settings')
      .insert(setting)
      .onConflict('setting_key')
      .merge({
        setting_value: setting.setting_value,
        setting_type: setting.setting_type,
        is_public: setting.is_public,
        label: setting.label,
        description: setting.description,
      });
  }
};

exports.down = async function down(db) {
  if (!await db.schema.hasTable('platform_settings')) return;
  return Promise.resolve();
};
