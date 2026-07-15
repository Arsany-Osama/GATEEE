CREATE TABLE IF NOT EXISTS platform_settings (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  setting_key VARCHAR(120) NOT NULL,
  setting_value TEXT NULL,
  setting_type VARCHAR(40) NOT NULL DEFAULT 'text',
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  label VARCHAR(255) NOT NULL,
  description TEXT NULL,
  updated_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY platform_settings_setting_key_unique (setting_key),
  KEY platform_settings_is_public_index (is_public),
  KEY platform_settings_updated_by_index (updated_by),
  CONSTRAINT platform_settings_updated_by_foreign
    FOREIGN KEY (updated_by) REFERENCES users (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO platform_settings
  (setting_key, setting_value, setting_type, is_public, label, description)
VALUES
  ('platform_name', 'GATE', 'text', TRUE, 'Platform name', 'Public platform or brand name.'),
  ('contact_email', 'support@gatelearning.com', 'email', TRUE, 'Contact email', 'Public support contact email.'),
  ('whatsapp_number', '201065200731', 'phone', TRUE, 'WhatsApp number', 'International WhatsApp number without a plus sign.'),
  ('whatsapp_display', '+20 10 65200731', 'text', TRUE, 'WhatsApp display text', 'Human-readable WhatsApp or phone number.'),
  ('instapay_number', '+20 10 65200731', 'phone', TRUE, 'InstaPay number', 'Manual payment InstaPay transfer number.'),
  ('instapay_name', 'GATE', 'text', TRUE, 'InstaPay account name', 'Manual payment InstaPay account or recipient name.'),
  ('facebook_url', 'https://www.facebook.com/share/1Ph9fSQUkJ/', 'url', TRUE, 'Facebook URL', 'Public Facebook profile or page link.'),
  ('instagram_url', 'https://www.instagram.com/ahmed_gamal_elghawy?igsh=MWdhb2hod3R5MGc1dw==', 'url', TRUE, 'Instagram URL', 'Public Instagram profile link.'),
  ('footer_location', 'Alexandria, Egypt', 'text', TRUE, 'Footer location', 'Location displayed in public footer.'),
  ('admin_notification_email', '', 'email', FALSE, 'Admin notification email', 'Recipient for admin payment request notifications. SMTP credentials remain env-only.'),
  ('payment_instructions_title', 'Complete Manual Course Payment', 'text', TRUE, 'Payment instructions title', 'Heading shown on the payment instructions page.'),
  ('payment_instructions_body', 'Transfer the course amount using InstaPay, then send the payment screenshot to the instructor so your course access can be reviewed and activated manually.', 'textarea', TRUE, 'Payment instructions body', 'Introductory manual payment instructions.'),
  ('payment_success_note', 'Course access is not activated automatically. The instructor/admin will review the payment screenshot and manually open the course for your account.', 'textarea', TRUE, 'Payment success note', 'Important notice shown on the payment page.'),
  ('payment_receipt_help_text', 'JPG, PNG, or WebP up to 5MB.', 'text', TRUE, 'Receipt help text', 'Help text displayed beside the receipt upload input.')
ON DUPLICATE KEY UPDATE
  setting_type = VALUES(setting_type),
  is_public = VALUES(is_public),
  label = VALUES(label),
  description = VALUES(description);
