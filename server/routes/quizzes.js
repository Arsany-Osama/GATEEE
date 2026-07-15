const express = require('express');
const router = express.Router();
const db = require('../db/knex');
const { authenticate } = require('../middleware/auth');
const { sendUnexpectedError } = require('../utils/http');

const getLessonAccess = (lessonId, userId) => db('lessons')
    .join('playlists', 'lessons.playlist_id', 'playlists.id')
    .join('courses', 'playlists.course_id', 'courses.id')
    .leftJoin('enrollments', function joinEnrollments() {
        this.on('enrollments.course_id', '=', 'courses.id').andOn('enrollments.user_id', '=', db.raw('?', [userId]));
    })
    .where('lessons.id', lessonId)
    .whereNull('lessons.deleted_at')
    .whereNull('playlists.deleted_at')
    .whereNull('courses.deleted_at')
    .select('lessons.id as lesson_id', 'courses.id as course_id', 'enrollments.id as enrollment_id', 'enrollments.deleted_at as enrollment_deleted_at')
    .first();

const getQuizAccess = (quizId, userId) => db('quizzes')
    .join('lessons', 'quizzes.lesson_id', 'lessons.id')
    .join('playlists', 'lessons.playlist_id', 'playlists.id')
    .join('courses', 'playlists.course_id', 'courses.id')
    .leftJoin('enrollments', function joinEnrollments() {
        this.on('enrollments.course_id', '=', 'courses.id').andOn('enrollments.user_id', '=', db.raw('?', [userId]));
    })
    .where('quizzes.id', quizId)
    .whereNull('quizzes.deleted_at')
    .whereNull('lessons.deleted_at')
    .whereNull('playlists.deleted_at')
    .whereNull('courses.deleted_at')
    .select('quizzes.id as quiz_id', 'quizzes.lesson_id', 'courses.id as course_id', 'enrollments.id as enrollment_id', 'enrollments.deleted_at as enrollment_deleted_at')
    .first();

const canAccess = (access, role) => Boolean(access && (role === 'admin' || (access.enrollment_id && !access.enrollment_deleted_at)));

// GET /lesson/:lessonId -> Returns questions + options, never is_correct
router.get('/lesson/:lessonId', authenticate, async (req, res) => {
    try {
        const { lessonId } = req.params;
        const access = await getLessonAccess(lessonId, req.user.id);
        if (!canAccess(access, req.user.role)) {
            return res.status(403).json({ error: 'You must be enrolled in this course to access this quiz.' });
        }

        // Verify the quiz exists for this lesson
        const quiz = await db('quizzes').where({ lesson_id: lessonId }).first();
        if (!quiz) return res.status(404).json({ error: 'No quiz found for this lesson' });

        // Grab questions
        const questions = await db('quiz_questions').where({ quiz_id: quiz.id });
        const questionIds = questions.map((question) => question.id);
        const options = questionIds.length
            ? await db('quiz_options').whereIn('question_id', questionIds).select('id', 'question_id', 'option_text')
            : [];
        const optionsByQuestion = new Map();
        options.forEach((option) => {
            optionsByQuestion.set(option.question_id, [...(optionsByQuestion.get(option.question_id) || []), option]);
        });

        // Append options to each question but omit the 'is_correct' column
        questions.forEach((question) => {
            question.options = optionsByQuestion.get(question.id) || [];
        });

        res.json({ quiz_id: quiz.id, title: quiz.title, questions });
    } catch (error) {
        return sendUnexpectedError(res, error, 'Get quiz failed');
    }
});

// POST /:quizId/submit -> Grades answers, stores in quiz_results, returns score
router.post('/:quizId/submit', authenticate, async (req, res) => {
    const { quizId } = req.params;
    const { answers } = req.body; // Array of { question_id, option_id }
    let score = 0;

    try {
        const access = await getQuizAccess(quizId, req.user.id);
        if (!canAccess(access, req.user.role)) {
            return res.status(403).json({ error: 'You must be enrolled in this course to submit this quiz.' });
        }

        const attempts = await db('quiz_results')
            .where({ user_id: req.user.id, quiz_id: quizId })
            .whereNull('deleted_at')
            .count({ count: 'id' })
            .first();
        if (Number(attempts?.count || 0) >= 3) {
            return res.status(429).json({ error: 'Maximum attempts reached.' });
        }

        const questions = await db('quiz_questions').where({ quiz_id: quizId });
        const questionIds = questions.map((question) => question.id);
        const correctOptions = questionIds.length
            ? await db('quiz_options').whereIn('question_id', questionIds).where({ is_correct: true }).select('id', 'question_id')
            : [];
        const correctByQuestion = new Map(correctOptions.map((option) => [Number(option.question_id), Number(option.id)]));
        const answersByQuestion = new Map((Array.isArray(answers) ? answers : []).map((answer) => [Number(answer.question_id), Number(answer.option_id)]));

        for (let q of questions) {
            if (answersByQuestion.get(Number(q.id)) === correctByQuestion.get(Number(q.id))) {
                score++;
            }
        }

        // Persist attempt statistics
        await db('quiz_results').insert({
            user_id: req.user.id,
            quiz_id: quizId,
            score: score,
            total_questions: questions.length
        });

        res.json({ score, total: questions.length, message: 'Quiz submitted successfully!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
