const crypto = require('crypto');
const db = require('../db/knex');

const certificateSecret = () => {
  if (!process.env.CERTIFICATE_HMAC_SECRET) {
    throw new Error('CERTIFICATE_HMAC_SECRET must be set');
  }
  return process.env.CERTIFICATE_HMAC_SECRET;
};

const normalizeIssuedAt = (issuedAt) => new Date(issuedAt).toISOString();

const certificatePayload = ({ uuid, user_id, course_id, issued_at }) => [
  uuid,
  Number(user_id),
  Number(course_id),
  normalizeIssuedAt(issued_at),
].join(':');

const signCertificate = (certificate) => crypto
  .createHmac('sha256', certificateSecret())
  .update(certificatePayload(certificate))
  .digest('hex');

const isSignatureValid = (certificate) => {
  if (!certificate?.hmac_signature) return false;
  const expected = signCertificate(certificate);
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(certificate.hmac_signature);
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
};

const getCourseLessonIds = async (courseId) => {
  const query = db('lessons')
    .join('playlists', 'lessons.playlist_id', 'playlists.id')
    .where('playlists.course_id', courseId)
    .whereNull('playlists.deleted_at')
    .whereNull('lessons.deleted_at')
    .select('lessons.id');
  if (await db.schema.hasColumn('lessons', 'is_published')) {
    query.where('lessons.is_published', true);
  }
  const lessons = await query;
  return lessons.map((lesson) => Number(lesson.id));
};

const getQuizIds = async (lessonIds) => {
  if (!lessonIds.length) return [];
  const quizzes = await db('quizzes')
    .whereIn('lesson_id', lessonIds)
    .whereNull('deleted_at')
    .select('id');
  return quizzes.map((quiz) => Number(quiz.id));
};

const checkCertificateEligibility = async (userId, courseId) => {
  const enrollment = await db('enrollments')
    .where({ user_id: userId, course_id: courseId })
    .whereNull('deleted_at')
    .first('id');
  if (!enrollment) {
    return { eligible: false, reason: 'Student is not enrolled in this course.' };
  }

  const lessonIds = await getCourseLessonIds(courseId);
  if (!lessonIds.length) {
    return { eligible: false, reason: 'Course has no published lessons.' };
  }

  const completed = await db('progress')
    .where({ user_id: userId })
    .whereIn('lesson_id', lessonIds)
    .whereNull('deleted_at')
    .countDistinct({ count: 'lesson_id' })
    .first();
  const completedLessons = Number(completed?.count || 0);
  if (completedLessons < lessonIds.length) {
    return {
      eligible: false,
      reason: 'All lessons must be completed first.',
      completed_lessons: completedLessons,
      total_lessons: lessonIds.length,
    };
  }

  const quizIds = await getQuizIds(lessonIds);
  if (quizIds.length) {
    const passedRows = await db('quiz_results')
      .where({ user_id: userId })
      .whereIn('quiz_id', quizIds)
      .whereRaw('score >= total_questions')
      .where('total_questions', '>', 0)
      .whereNull('deleted_at')
      .select('quiz_id')
      .groupBy('quiz_id');
    if (passedRows.length < quizIds.length) {
      return {
        eligible: false,
        reason: 'All quizzes must be completed with a passing score.',
        passed_quizzes: passedRows.length,
        total_quizzes: quizIds.length,
      };
    }
  }

  return {
    eligible: true,
    completed_lessons: lessonIds.length,
    total_lessons: lessonIds.length,
    total_quizzes: quizIds.length,
  };
};

const ensureCertificateForCourse = async (userId, courseId) => {
  const existing = await db('certificates')
    .where({ user_id: userId, course_id: courseId })
    .first();
  if (existing) return existing;

  const eligibility = await checkCertificateEligibility(userId, courseId);
  if (!eligibility.eligible) return null;

  const uuid = crypto.randomUUID();
  const issuedAt = new Date();
  issuedAt.setMilliseconds(0);
  const certificate = {
    uuid,
    user_id: userId,
    course_id: courseId,
    issued_at: issuedAt,
  };
  const [id] = await db('certificates').insert({
    ...certificate,
    hmac_signature: signCertificate(certificate),
  });

  return db('certificates').where({ id }).first();
};

const getCertificateDetails = (uuid) => db('certificates')
  .join('users', 'certificates.user_id', 'users.id')
  .join('courses', 'certificates.course_id', 'courses.id')
  .where('certificates.uuid', uuid)
  .select(
    'certificates.id',
    'certificates.uuid',
    'certificates.user_id',
    'certificates.course_id',
    'certificates.issued_at',
    'certificates.revoked_at',
    'certificates.revoked_by',
    'certificates.hmac_signature',
    'users.name as student_name',
    'users.email as student_email',
    'courses.title as course_name'
  )
  .first();

module.exports = {
  checkCertificateEligibility,
  ensureCertificateForCourse,
  getCertificateDetails,
  isSignatureValid,
  signCertificate,
};
