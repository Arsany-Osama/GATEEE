const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../db/knex');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');
const { hashPassword, validatePasswordStrength, verifyPassword } = require('../utils/passwords');
const { sanitizeUser } = require('../utils/users');
const { sendUnexpectedError } = require('../utils/http');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set');
}

const JWT_SECRET = process.env.JWT_SECRET;
const isProduction = process.env.NODE_ENV === 'production';
const cookieSameSite = (process.env.AUTH_COOKIE_SAME_SITE || (isProduction ? 'none' : 'lax')).toLowerCase();
const cookieSecure = process.env.AUTH_COOKIE_SECURE
  ? ['1', 'true', 'yes'].includes(String(process.env.AUTH_COOKIE_SECURE).toLowerCase())
  : isProduction;
const cookieOptions = {
  httpOnly: true,
  secure: cookieSecure,
  sameSite: cookieSameSite,
  path: '/',
  maxAge: 24 * 60 * 60 * 1000,
};

const userSupportsActiveStatus = async () => db.schema.hasColumn('users', 'is_active');

// 1. REGISTER
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const validation = validatePasswordStrength(password);
    if (validation) {
      return res.status(400).json({ error: validation });
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Insert user
    const [userId] = await db('users').insert({
      name,
      email,
      password: hashedPassword,
      role: 'student', // Default role
    });

    // Create JWT
    const token = jwt.sign({ id: userId, role: 'student' }, JWT_SECRET, { expiresIn: '24h' });

    // Set as httpOnly cookie
    res.cookie('token', token, cookieOptions);
    return res.status(201).json({ message: 'Registration successful.' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    return sendUnexpectedError(res, error, 'Register failed');
  }
});

// 2. LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await db('users').where({ email }).first();
    const verification = user ? await verifyPassword(password, user.password) : { valid: false };

    if (!user || !verification.valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if ((await userSupportsActiveStatus()) && Number(user.is_active) === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (verification.needsUpgrade) {
      await db('users').where({ id: user.id }).update({ password: await hashPassword(password) });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });

    res.cookie('token', token, cookieOptions);
    return res.json({ user: sanitizeUser(user) });
  } catch (error) {
    return sendUnexpectedError(res, error, 'Login failed');
  }
});

// 3. GET CURRENT USER
router.get('/me', optionalAuthenticate, async (req, res) => {
  try {
    if (!req.user) {
      return res.json({ user: null });
    }

    const user = await db('users')
      .where({ id: req.user.id })
      .first('id', 'name', 'email', 'role', 'created_at', 'updated_at');

    if (!user) {
      res.clearCookie('token', cookieOptions);
      return res.json({ user: null });
    }

    res.json({ user: sanitizeUser(user) });
  } catch (error) {
    return sendUnexpectedError(res, error, 'Get current user failed');
  }
});

// 4. CHANGE CURRENT USER PASSWORD (Protected)
router.put('/profile/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New password confirmation does not match.' });
    }

    const validation = validatePasswordStrength(newPassword);
    if (validation) {
      return res.status(400).json({ error: validation });
    }

    const user = await db('users').where({ id: req.user.id }).first('id', 'password');
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const currentVerification = await verifyPassword(currentPassword, user.password);
    if (!currentVerification.valid) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    const samePassword = await verifyPassword(newPassword, user.password);
    if (samePassword.valid) {
      return res.status(400).json({ error: 'New password must be different from the current password.' });
    }

    await db('users').where({ id: req.user.id }).update({ password: await hashPassword(newPassword) });

    res.json({ message: 'Password updated successfully.' });
  } catch (error) {
    return sendUnexpectedError(res, error, 'Password update failed');
  }
});

// 5. LOGOUT
router.post('/logout', (req, res) => {
  res.clearCookie('token', cookieOptions);
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
