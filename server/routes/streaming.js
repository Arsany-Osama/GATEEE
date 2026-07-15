const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const db = require('../db/knex');
const { authenticate } = require('../middleware/auth');
const { clientIp, countryCode, sendUnexpectedError } = require('../utils/http');

router.get('/video/:lessonId', authenticate, async (req, res) => {
    try {
        const { lessonId } = req.params;
        const userId = req.user.id;

        // 1. Get the lesson and its course_id
        const lesson = await db('lessons')
            .join('playlists', 'lessons.playlist_id', 'playlists.id')
            .select('lessons.cloudinary_public_id', 'lessons.duration_seconds', 'playlists.course_id')
            .where('lessons.id', lessonId)
            .first();

        if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
        if (!lesson.cloudinary_public_id) return res.status(404).json({ error: 'Video is not available for this lesson.' });

        // 2. CHECK ENROLLMENT: Is the student allowed to see this?
        const isEnrolled = await db('enrollments')
            .where({ user_id: userId, course_id: lesson.course_id })
            .first();

        // Admin bypass: Admins can always see videos
        if (!isEnrolled && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'You must be enrolled to watch this video' });
        }

        await db('video_access_logs').insert({
            user_id: userId,
            course_id: lesson.course_id,
            lesson_id: lessonId,
            ip_address: clientIp(req),
            user_agent: req.headers['user-agent'] || '',
            country_code: countryCode(req),
        }).catch((error) => {
            console.error('Video access log failed:', error);
        });

        // 3. Generate the Signed URL (Expires in 1 hour)
        const signedUrl = cloudinary.url(lesson.cloudinary_public_id, {
            resource_type: 'video',
            sign_url: true,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            type: 'upload', // Must match the upload type in your middleware
            secure: true
        });

        res.json({ video_url: signedUrl, duration_seconds: lesson.duration_seconds || null });
    } catch (error) {
        return sendUnexpectedError(res, error, 'Streaming URL failed');
    }
});

module.exports = router;
