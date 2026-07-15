const express = require('express');
const db = require('../../db/knex');
const { authenticate, isAdmin } = require('../../middleware/auth');
const { sendUnexpectedError } = require('../../utils/http');

const router = express.Router();

const numberFrom = (row, key = 'count') => Number(row?.[key] || 0);

router.get('/', authenticate, isAdmin, async (req, res) => {
  try {
    const since = db.raw('DATE_SUB(NOW(), INTERVAL 24 HOUR)');

    const [sessionRows, ipRows, countryRows, recentLogs] = await Promise.all([
      db('user_sessions')
        .join('users', 'user_sessions.user_id', 'users.id')
        .where('user_sessions.last_seen', '>=', since)
        .select('users.id', 'users.name', 'users.email')
        .countDistinct({ active_devices: 'user_sessions.device_hash' })
        .max({ last_seen: 'user_sessions.last_seen' })
        .groupBy('users.id', 'users.name', 'users.email'),
      db('video_access_logs')
        .where('timestamp', '>=', since)
        .select('user_id')
        .countDistinct({ ip_count: 'ip_address' })
        .groupBy('user_id'),
      db('video_access_logs')
        .where('timestamp', '>=', since)
        .whereNotNull('country_code')
        .select('user_id')
        .countDistinct({ country_count: 'country_code' })
        .groupBy('user_id'),
      db('video_access_logs')
        .join('users', 'video_access_logs.user_id', 'users.id')
        .join('courses', 'video_access_logs.course_id', 'courses.id')
        .join('lessons', 'video_access_logs.lesson_id', 'lessons.id')
        .select(
          'video_access_logs.id',
          'video_access_logs.ip_address',
          'video_access_logs.country_code',
          'video_access_logs.user_agent',
          'video_access_logs.timestamp',
          'users.name as user_name',
          'users.email as user_email',
          'courses.title as course_title',
          'lessons.title as lesson_title'
        )
        .orderBy('video_access_logs.timestamp', 'desc')
        .limit(100),
    ]);

    const ipMap = new Map(ipRows.map((row) => [Number(row.user_id), numberFrom(row, 'ip_count')]));
    const countryMap = new Map(countryRows.map((row) => [Number(row.user_id), numberFrom(row, 'country_count')]));

    const suspiciousUsers = sessionRows
      .map((row) => {
        const userId = Number(row.id);
        const activeDevices = numberFrom(row, 'active_devices');
        const ipChanges = ipMap.get(userId) || 0;
        const countries = countryMap.get(userId) || 0;
        const flags = [];
        if (ipChanges > 5) flags.push('Excessive IP changes');
        if (countries > 1) flags.push('Multiple countries');
        if (activeDevices > 2) flags.push('Too many devices');

        return {
          user_id: userId,
          name: row.name,
          email: row.email,
          active_devices: activeDevices,
          ip_count_24h: ipChanges,
          country_count_24h: countries,
          last_seen: row.last_seen,
          flags,
        };
      })
      .filter((row) => row.flags.length)
      .sort((a, b) => b.flags.length - a.flags.length || b.active_devices - a.active_devices);

    const summary = {
      active_sessions_24h: sessionRows.reduce((sum, row) => sum + numberFrom(row, 'active_devices'), 0),
      suspicious_users: suspiciousUsers.length,
      video_logs_returned: recentLogs.length,
    };

    res.json({ summary, suspicious_users: suspiciousUsers, recent_logs: recentLogs });
  } catch (error) {
    return sendUnexpectedError(res, error, 'Admin security failed');
  }
});

module.exports = router;
