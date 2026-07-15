const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

const isPasswordHash = (value = '') => /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(value);

const hashPassword = (password) => bcrypt.hash(password, SALT_ROUNDS);

const verifyPassword = async (password, storedPassword) => {
  if (!storedPassword) return { valid: false, needsUpgrade: false };

  if (isPasswordHash(storedPassword)) {
    return { valid: await bcrypt.compare(password, storedPassword), needsUpgrade: false };
  }

  return { valid: password === storedPassword, needsUpgrade: password === storedPassword };
};

const validatePasswordStrength = (password) => {
  if (!password || password.length < 8) return 'New password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(password)) return 'New password must include at least one letter.';
  if (!/[0-9]/.test(password)) return 'New password must include at least one number.';
  return '';
};

module.exports = {
  hashPassword,
  isPasswordHash,
  validatePasswordStrength,
  verifyPassword,
};
