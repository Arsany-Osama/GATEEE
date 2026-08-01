const db = require('../db/knex');
const { hashPassword } = require('../utils/passwords');

const upsertUser = async ({ name, email, password, role }) => {
  const existing = await db('users').where({ email }).first('id');
  if (existing) return existing.id;
  const [id] = await db('users').insert({
    name,
    email,
    password: await hashPassword(password),
    role,
  });
  return id;
};

const run = async () => {
  const adminId = await upsertUser({
    name: 'Demo Admin',
    email: 'admin@gate.test',
    password: 'AdminPass123!',
    role: 'admin',
  });
  const studentId = await upsertUser({
    name: 'Demo Student',
    email: 'student@gate.test',
    password: 'StudentPass123!',
    role: 'student',
  });

  let course = await db('courses').where({ title: 'Sample Course' }).first('id');
  if (!course) {
    const [courseId] = await db('courses').insert({
      title: 'Sample Course',
      arabic_title: 'دورة تجريبية',
      description: 'A starter course for local development and QA.',
      price: 2000,
      instructor_name: 'Ch. Ahmed Gamal Elghawy',
      instructor_subtitle: '10+ Years Experience',
      is_published: true,
      display_order: 1,
    });
    course = { id: courseId };
  }

  let playlist = await db('playlists').where({ course_id: course.id, title: 'Getting Started' }).first('id');
  if (!playlist) {
    const [playlistId] = await db('playlists').insert({ course_id: course.id, title: 'Getting Started', order_index: 1 });
    playlist = { id: playlistId };
  }

  let lesson = await db('lessons').where({ playlist_id: playlist.id, title: 'Welcome Lesson' }).first('id');
  if (!lesson) {
    const [lessonId] = await db('lessons').insert({
      playlist_id: playlist.id,
      title: 'Welcome Lesson',
      cloudinary_public_id: 'sample_lesson_video_public_id',
      order_index: 1,
    });
    lesson = { id: lessonId };
  }

  let quiz = await db('quizzes').where({ lesson_id: lesson.id, title: 'Welcome Quiz' }).first('id');
  if (!quiz) {
    const [quizId] = await db('quizzes').insert({ lesson_id: lesson.id, title: 'Welcome Quiz' });
    quiz = { id: quizId };
  }

  let question = await db('quiz_questions').where({ quiz_id: quiz.id, question_text: 'What is this sample lesson for?' }).first('id');
  if (!question) {
    const [questionId] = await db('quiz_questions').insert({
      quiz_id: quiz.id,
      question_text: 'What is this sample lesson for?',
    });
    question = { id: questionId };
  }

  const optionExists = await db('quiz_options').where({ question_id: question.id }).first('id');
  if (!optionExists) {
    await db('quiz_options').insert([
      { question_id: question.id, quiz_id: quiz.id, option_text: 'Local development testing', is_correct: true },
      { question_id: question.id, quiz_id: quiz.id, option_text: 'Production billing setup', is_correct: false },
    ]);
  }

  const enrolled = await db('enrollments').where({ user_id: studentId, course_id: course.id }).whereNull('deleted_at').first('id');
  if (!enrolled) {
    await db('enrollments').insert({ user_id: studentId, course_id: course.id });
  }

  console.log(`Seed complete. Admin ${adminId}, student ${studentId}, course ${course.id}.`);
};

run()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.destroy();
  });
