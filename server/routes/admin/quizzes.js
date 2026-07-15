const express = require('express');
const router = express.Router();
const db = require('../../db/knex');
const { authenticate, isAdmin } = require('../../middleware/auth');
const { sendUnexpectedError } = require('../../utils/http');

// POST /admin/quizzes -> Create a complete quiz for a lesson
router.post('/', authenticate, isAdmin, async (req, res) => {
    const { lesson_id, title, questions } = req.body;

    try {
        await db.transaction(async (trx) => {
            // 1. Insert the main Quiz record
            const [quizId] = await trx('quizzes').insert({ lesson_id, title });

            for (const q of questions) {
                // 2. Insert the Question text
                const [questionId] = await trx('quiz_questions').insert({
                    quiz_id: quizId,
                    question_text: q.question_text
                });

                // 3. Map options and assign the question foreign key
                const optionsToInsert = q.options.map(opt => ({
                    question_id: questionId,
                    option_text: opt.option_text,
                    is_correct: opt.is_correct
                }));
                
                await trx('quiz_options').insert(optionsToInsert);
            }
        });

        res.status(201).json({ message: 'Quiz created successfully!' });
    } catch (error) {
        return sendUnexpectedError(res, error, 'Create admin quiz failed');
    }
});

module.exports = router;
