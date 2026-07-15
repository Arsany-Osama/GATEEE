const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
require('./config/loadEnv');

const db = require('./db/knex');
const authRoutes = require('./routes/auth');
const certificatesRoutes = require('./routes/certificates');
const lessonRoutes = require('./routes/lessons');
const courseRoutes = require('./routes/courses');
const studentRoutes = require('./routes/student');
const quizRoutes = require('./routes/quizzes');
const enrollmentRoutes = require('./routes/enrollments');
const streamingRoutes = require('./routes/streaming');
const adminQuizRoutes = require('./routes/admin/quizzes');
const adminDashboardRoutes = require('./routes/admin/dashboard');
const paymentRequestRoutes = require('./routes/paymentRequests');
const adminPaymentRequestRoutes = require('./routes/admin/paymentRequests');
const adminSecurityRoutes = require('./routes/admin/security');
const adminUserRoutes = require('./routes/admin/users');
const adminReportsRoutes = require('./routes/admin/reports');
const adminNotificationRoutes = require('./routes/admin/notifications');
const adminCategoryRoutes = require('./routes/admin/categories');
const adminInstructorRoutes = require('./routes/admin/instructors');
const adminCouponRoutes = require('./routes/admin/coupons');
const adminUploadRoutes = require('./routes/admin/uploads');
const notificationRoutes = require('./routes/notifications');
const progressRoutes = require('./routes/progress');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = String(process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
};

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skip: (req) => req.method !== 'POST',
  standardHeaders: true,
  legacyHeaders: false,
});
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  skip: (req) => req.method !== 'POST',
  standardHeaders: true,
  legacyHeaders: false,
});
const paymentRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  skip: (req) => req.method !== 'POST' || req.path !== '/',
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(helmet());
app.set('trust proxy', 1);
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Rate limiters
app.use('/auth/login', loginLimiter);
app.use('/auth/register', registerLimiter);
app.use('/payment-requests', paymentRequestLimiter);

// Routes
app.use('/lessons', lessonRoutes);
app.use('/admin/lessons', lessonRoutes);
app.use('/admin/courses', courseRoutes);
app.use('/auth', authRoutes);
app.use('/certificates', certificatesRoutes);
app.use('/courses', courseRoutes);
app.use('/student', studentRoutes);
app.use('/payment-requests', paymentRequestRoutes);
app.use('/quizzes', quizRoutes);
app.use('/admin', enrollmentRoutes);
app.use('/streaming', streamingRoutes);
app.use('/admin/quizzes', adminQuizRoutes);
app.use('/admin/dashboard', adminDashboardRoutes);
app.use('/admin/payment-requests', adminPaymentRequestRoutes);
app.use('/admin/security', adminSecurityRoutes);
app.use('/admin/users', adminUserRoutes);
app.use('/admin/reports', adminReportsRoutes);
app.use('/admin/notifications', adminNotificationRoutes);
app.use('/admin/categories', adminCategoryRoutes);
app.use('/admin/instructors', adminInstructorRoutes);
app.use('/admin/coupons', adminCouponRoutes);
app.use('/admin/uploads', adminUploadRoutes);
app.use('/notifications', notificationRoutes);
app.use('/progress', progressRoutes);
app.use('/settings', settingsRoutes);
app.use('/admin/settings', settingsRoutes);

// Health Check
app.get('/health', async (req, res) => {
  try {
    await db.raw('SELECT 1');
    res.json({ status: 'ok', db: 'connected', timestamp: new Date() });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ status: 'error', db: 'disconnected', message: 'An unexpected error occurred.' });
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'An unexpected error occurred.' });
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
