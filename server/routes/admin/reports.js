const express = require('express');
const router = express.Router();
const db = require('../../db/knex');
const { authenticate, isAdmin } = require('../../middleware/auth');
const { sendUnexpectedError } = require('../../utils/http');

const clampPercent = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
};

const numberFrom = (row, key = 'count') => Number(row?.[key] || 0);

const tableExists = (name) => db.schema.hasTable(name);
const columnExists = (table, column) => db.schema.hasColumn(table, column);

const countRows = async (table, apply = null) => {
  const query = db(table);
  if (apply) apply(query);
  const row = await query.count({ count: '*' }).first();
  return numberFrom(row);
};

const sumRows = async (table, field, apply = null) => {
  const query = db(table);
  if (apply) apply(query);
  const row = await query.sum({ total: field }).first();
  return Number(row?.total || 0);
};

const whereNotDeleted = (query, table, supported) => {
  if (supported) query.whereNull(`${table}.deleted_at`);
  return query;
};

const getLessonIdsByCourse = async ({
  courseIds,
  supportsPlaylistDeletedAt,
  supportsLessonDeletedAt,
  supportsLessonPublish,
  supportsLessonVisible,
}) => {
  if (!courseIds.length) return new Map();
  const query = db('lessons')
    .join('playlists', 'lessons.playlist_id', 'playlists.id')
    .whereIn('playlists.course_id', courseIds)
    .select('playlists.course_id', 'lessons.id');
  whereNotDeleted(query, 'playlists', supportsPlaylistDeletedAt);
  whereNotDeleted(query, 'lessons', supportsLessonDeletedAt);
  if (supportsLessonPublish) query.where('lessons.is_published', true);
  if (supportsLessonVisible) query.where('lessons.is_visible', true);

  const rows = await query;
  const byCourse = new Map(courseIds.map((id) => [Number(id), []]));
  rows.forEach((row) => {
    const courseId = Number(row.course_id);
    byCourse.set(courseId, [...(byCourse.get(courseId) || []), Number(row.id)]);
  });
  return byCourse;
};

const getCoursePerformance = async ({
  supportsCourseDeletedAt,
  supportsPlaylistDeletedAt,
  supportsLessonDeletedAt,
  supportsEnrollmentDeletedAt,
  supportsProgressDeletedAt,
  supportsCoursePublish,
  supportsLessonPublish,
  supportsLessonVisible,
}) => {
  const courseFields = ['id', 'title', 'thumbnail_url'];
  if (supportsCoursePublish) courseFields.push('is_published');

  const coursesQuery = db('courses')
    .select(courseFields)
    .orderBy('display_order', 'asc')
    .orderBy('created_at', 'desc');
  whereNotDeleted(coursesQuery, 'courses', supportsCourseDeletedAt);
  const courses = await coursesQuery;

  const courseIds = courses.map((course) => Number(course.id));
  const lessonIdsByCourse = await getLessonIdsByCourse({
    courseIds,
    supportsPlaylistDeletedAt,
    supportsLessonDeletedAt,
    supportsLessonPublish,
    supportsLessonVisible,
  });

  const paymentCounts = await db('payment_requests')
    .whereIn('course_id', courseIds.length ? courseIds : [0])
    .select('course_id', 'status')
    .count({ count: 'id' })
    .groupBy('course_id', 'status');

  const paymentMap = new Map();
  paymentCounts.forEach((row) => {
    const courseId = Number(row.course_id);
    const current = paymentMap.get(courseId) || {};
    current[row.status] = numberFrom(row);
    paymentMap.set(courseId, current);
  });

  const rows = [];
  for (const course of courses) {
    const courseId = Number(course.id);
    const lessonIds = lessonIdsByCourse.get(courseId) || [];
    const enrollmentsQuery = db('enrollments')
      .where({ course_id: courseId })
      .select('user_id');
    whereNotDeleted(enrollmentsQuery, 'enrollments', supportsEnrollmentDeletedAt);
    const enrollments = await enrollmentsQuery;

    const enrollmentCount = enrollments.length;
    let completedStudentsCount = 0;
    let progressTotal = 0;

    if (lessonIds.length && enrollmentCount) {
      for (const enrollment of enrollments) {
        const completedQuery = db('progress')
          .where({ user_id: enrollment.user_id })
          .whereIn('lesson_id', lessonIds)
          .countDistinct({ count: 'lesson_id' })
          .first();
        whereNotDeleted(completedQuery, 'progress', supportsProgressDeletedAt);
        const completed = await completedQuery;
        const completedLessons = Math.min(numberFrom(completed), lessonIds.length);
        const progress = clampPercent((completedLessons / lessonIds.length) * 100);
        progressTotal += progress;
        if (completedLessons >= lessonIds.length) completedStudentsCount += 1;
      }
    }

    const requests = paymentMap.get(courseId) || {};
    rows.push({
      course_id: courseId,
      title: course.title,
      thumbnail_url: course.thumbnail_url,
      is_published: supportsCoursePublish ? Boolean(course.is_published) : null,
      total_lessons: lessonIds.length,
      enrollment_count: enrollmentCount,
      completed_students_count: completedStudentsCount,
      completion_rate_percentage: enrollmentCount ? clampPercent((completedStudentsCount / enrollmentCount) * 100) : 0,
      average_progress_percentage: enrollmentCount ? clampPercent(progressTotal / enrollmentCount) : 0,
      pending_payment_requests_count: Number(requests.pending || 0),
      approved_payment_requests_count: Number(requests.approved || 0),
    });
  }

  return rows;
};

const getRecentActivity = async ({ supportsCourseDeletedAt, supportsEnrollmentDeletedAt, supportsNotifications }) => {
  const activities = [];

  const recentPaymentRequests = await db('payment_requests')
    .leftJoin('users', 'payment_requests.user_id', 'users.id')
    .leftJoin('courses', 'payment_requests.course_id', 'courses.id')
    .select(
      'payment_requests.id',
      'payment_requests.status',
      'payment_requests.amount',
      'payment_requests.created_at',
      'users.name as user_name',
      'courses.title as course_title'
    )
    .orderBy('payment_requests.created_at', 'desc')
    .limit(6);

  recentPaymentRequests.forEach((request) => {
    activities.push({
      type: 'payment_request',
      title: `Payment request ${request.status || 'submitted'}`,
      message: `${request.user_name || 'A student'} - ${request.course_title || 'Course'} (${Number(request.amount || 0)} EGP)`,
      created_at: request.created_at,
      entity_id: request.id,
    });
  });

  const recentEnrollmentsQuery = db('enrollments')
    .join('users', 'enrollments.user_id', 'users.id')
    .join('courses', 'enrollments.course_id', 'courses.id')
    .select(
      'enrollments.id',
      'enrollments.created_at',
      'users.name as user_name',
      'courses.title as course_title'
    )
    .orderBy('enrollments.created_at', 'desc')
    .limit(6);
  whereNotDeleted(recentEnrollmentsQuery, 'enrollments', supportsEnrollmentDeletedAt);
  whereNotDeleted(recentEnrollmentsQuery, 'courses', supportsCourseDeletedAt);
  const recentEnrollments = await recentEnrollmentsQuery;

  recentEnrollments.forEach((enrollment) => {
    activities.push({
      type: 'enrollment',
      title: 'Course enrollment',
      message: `${enrollment.user_name || 'A student'} enrolled in ${enrollment.course_title || 'a course'}.`,
      created_at: enrollment.created_at,
      entity_id: enrollment.id,
    });
  });

  if (supportsNotifications) {
    const recentCompletions = await db('notifications')
      .where({ type: 'course_completed' })
      .select('id', 'title', 'message', 'created_at', 'entity_id')
      .orderBy('created_at', 'desc')
      .limit(5);
    recentCompletions.forEach((notification) => {
      activities.push({
        type: 'course_completed',
        title: notification.title,
        message: notification.message,
        created_at: notification.created_at,
        entity_id: notification.entity_id || notification.id,
      });
    });
  }

  return activities
    .filter((activity) => activity.created_at)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 12);
};

const getQuizSummary = async () => {
  const [hasQuizzes, hasQuizResults] = await Promise.all([
    tableExists('quizzes'),
    tableExists('quiz_results'),
  ]);
  if (!hasQuizzes || !hasQuizResults) return null;

  const [supportsQuizDeletedAt, supportsQuizResultDeletedAt] = await Promise.all([
    columnExists('quizzes', 'deleted_at'),
    columnExists('quiz_results', 'deleted_at'),
  ]);

  const totalQuizzes = await countRows('quizzes', (query) => whereNotDeleted(query, 'quizzes', supportsQuizDeletedAt));
  const attempts = await countRows('quiz_results', (query) => whereNotDeleted(query, 'quiz_results', supportsQuizResultDeletedAt));
  const scoreQuery = db('quiz_results')
    .avg({ average_score: 'score' })
    .avg({ average_total: 'total_questions' })
    .first();
  whereNotDeleted(scoreQuery, 'quiz_results', supportsQuizResultDeletedAt);
  const scoreRow = await scoreQuery;

  const averageScore = Number(scoreRow?.average_score || 0);
  const averageTotal = Number(scoreRow?.average_total || 0);
  return {
    total_quizzes: totalQuizzes,
    quiz_attempts: attempts,
    average_score: attempts ? Number(averageScore.toFixed(2)) : 0,
    average_score_percentage: attempts && averageTotal ? clampPercent((averageScore / averageTotal) * 100) : 0,
  };
};

router.get('/overview', authenticate, isAdmin, async (req, res) => {
  try {
    const [
      supportsCourseDeletedAt,
      supportsPlaylistDeletedAt,
      supportsLessonDeletedAt,
      supportsEnrollmentDeletedAt,
      supportsProgressDeletedAt,
      supportsUserActive,
      supportsUserStatus,
      supportsCoursePublish,
      supportsLessonPublish,
      supportsLessonVisible,
      supportsNotifications,
    ] = await Promise.all([
      columnExists('courses', 'deleted_at'),
      columnExists('playlists', 'deleted_at'),
      columnExists('lessons', 'deleted_at'),
      columnExists('enrollments', 'deleted_at'),
      columnExists('progress', 'deleted_at'),
      columnExists('users', 'is_active'),
      columnExists('users', 'status'),
      columnExists('courses', 'is_published'),
      columnExists('lessons', 'is_published'),
      columnExists('lessons', 'is_visible'),
      tableExists('notifications'),
    ]);

    const totalUsers = await countRows('users');
    const totalStudents = await countRows('users', (query) => query.where({ role: 'student' }));
    const totalAdmins = await countRows('users', (query) => query.where({ role: 'admin' }));
    const totalCourses = await countRows('courses', (query) => whereNotDeleted(query, 'courses', supportsCourseDeletedAt));
    const activeEnrollments = await countRows('enrollments', (query) => whereNotDeleted(query, 'enrollments', supportsEnrollmentDeletedAt));
    const totalPaymentRequests = await countRows('payment_requests');
    const activeUsers = supportsUserActive
      ? await countRows('users', (query) => query.where({ is_active: true }))
      : supportsUserStatus
        ? await countRows('users', (query) => query.whereIn('status', ['active', 'enabled']))
        : null;
    const inactiveUsers = supportsUserActive
      ? await countRows('users', (query) => query.where({ is_active: false }))
      : supportsUserStatus
        ? await countRows('users', (query) => query.whereNotIn('status', ['active', 'enabled']))
        : null;

    const summary = {
      total_users: totalUsers,
      total_students: totalStudents,
      total_admins: totalAdmins,
      active_users: activeUsers,
      inactive_users: inactiveUsers,
      total_courses: totalCourses,
      published_courses: supportsCoursePublish ? await countRows('courses', (query) => whereNotDeleted(query, 'courses', supportsCourseDeletedAt).where({ is_published: true })) : null,
      unpublished_courses: supportsCoursePublish ? await countRows('courses', (query) => whereNotDeleted(query, 'courses', supportsCourseDeletedAt).where({ is_published: false })) : null,
      active_enrollments: activeEnrollments,
      total_payment_requests: totalPaymentRequests,
      pending_payment_requests: await countRows('payment_requests', (query) => query.where({ status: 'pending' })),
      approved_payment_requests: await countRows('payment_requests', (query) => query.where({ status: 'approved' })),
      rejected_payment_requests: await countRows('payment_requests', (query) => query.where({ status: 'rejected' })),
    };

    const payments = {
      approved_manual_payment_amount_total: await sumRows('payment_requests', 'amount', (query) => query.where({ status: 'approved' })),
      pending_manual_payment_amount_total: await sumRows('payment_requests', 'amount', (query) => query.where({ status: 'pending' })),
      rejected_manual_payment_amount_total: await sumRows('payment_requests', 'amount', (query) => query.where({ status: 'rejected' })),
      recent_payment_requests: await db('payment_requests')
        .leftJoin('users', 'payment_requests.user_id', 'users.id')
        .leftJoin('courses', 'payment_requests.course_id', 'courses.id')
        .select(
          'payment_requests.id',
          'payment_requests.status',
          'payment_requests.amount',
          'payment_requests.created_at',
          'users.name as user_name',
          'courses.title as course_title'
        )
        .orderBy('payment_requests.created_at', 'desc')
        .limit(8),
    };

    const [coursePerformance, recentActivity, quizSummary] = await Promise.all([
      getCoursePerformance({
        supportsCourseDeletedAt,
        supportsPlaylistDeletedAt,
        supportsLessonDeletedAt,
        supportsEnrollmentDeletedAt,
        supportsProgressDeletedAt,
        supportsCoursePublish,
        supportsLessonPublish,
        supportsLessonVisible,
      }),
      getRecentActivity({ supportsCourseDeletedAt, supportsEnrollmentDeletedAt, supportsNotifications }),
      getQuizSummary(),
    ]);

    res.json({
      summary,
      payments,
      course_performance: coursePerformance,
      recent_activity: recentActivity,
      quiz_summary: quizSummary,
      support: {
        user_status: supportsUserActive || supportsUserStatus,
        course_publish_status: supportsCoursePublish,
        lesson_publish_status: supportsLessonPublish,
        lesson_visibility_status: supportsLessonVisible,
        notifications: supportsNotifications,
      },
    });
  } catch (error) {
    return sendUnexpectedError(res, error, 'Admin reports failed');
  }
});

module.exports = router;
