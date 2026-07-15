const enabled = () => String(process.env.EMAIL_NOTIFICATIONS_ENABLED || '').toLowerCase() === 'true';
const { getSettingValue } = require('./platformSettings');

const createTransport = () => {
  if (!enabled()) return null;

  const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    console.warn(`Email notifications enabled but missing env vars: ${missing.join(', ')}`);
    return null;
  }

  let nodemailer;
  try {
    nodemailer = require('nodemailer');
  } catch (error) {
    console.warn(`Email notifications enabled but nodemailer is unavailable: ${error.message}`);
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

const line = (label, value) => `${label}: ${value || 'Not provided'}`;

const getAdminRecipient = async () => {
  try {
    return await getSettingValue('admin_notification_email') || process.env.ADMIN_NOTIFICATION_EMAIL;
  } catch (error) {
    console.warn(`Could not read admin notification setting: ${error.message}`);
    return process.env.ADMIN_NOTIFICATION_EMAIL;
  }
};

const notifyAdminPaymentRequest = async ({ request, user }) => {
  const transport = createTransport();
  if (!transport) return;
  const adminRecipient = await getAdminRecipient();
  if (!adminRecipient) {
    console.warn('Email notifications enabled but no admin notification email is configured.');
    return;
  }

  const text = [
    '[GATE] New manual payment request',
    '',
    line('Request ID', request.id),
    line('User', user?.name ? `${user.name} (${user.email || 'no email'})` : user?.email),
    line('Payer name', request.payer_name),
    line('Payer phone', request.payer_phone),
    line('Course', request.course_title),
    line('Official amount', request.amount),
    line('Submitted amount', request.submitted_amount),
    line('Payment method', request.payment_method),
    line('Transfer reference', request.transfer_reference),
    line('Transfer date', request.transfer_date),
    line('Note', request.note),
    line('Receipt uploaded', request.receipt_url ? 'Yes' : 'No'),
    line('Created at', request.created_at),
    '',
    'Review this request in Admin Payment Requests.'
  ].join('\n');

  try {
    await transport.sendMail({
      to: adminRecipient,
      from: process.env.SMTP_FROM,
      subject: '[GATE] New Payment Request',
      text
    });
  } catch (error) {
    console.warn(`Payment request email notification failed: ${error.message}`);
  }
};

module.exports = { notifyAdminPaymentRequest };
