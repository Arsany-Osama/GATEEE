-- Safe development seed data.
-- Admin: admin@example.com / admin123456
-- Student: student@example.com / student123456

INSERT INTO users (name, email, password, role)
VALUES
  ('Admin User', 'admin@example.com', '$2b$10$ex1mQmj/0BK8vgl5SOkzaeRUiI45wC8NPRGPIeiQ6I8ZlbmDc8qia', 'admin')
ON DUPLICATE KEY UPDATE
  id = LAST_INSERT_ID(id),
  name = VALUES(name),
  password = VALUES(password),
  role = VALUES(role);
SET @admin_id = LAST_INSERT_ID();

INSERT INTO users (name, email, password, role)
VALUES
  ('Student User', 'student@example.com', '$2b$10$J8FWFiDCUGNVepEFa9GdCuK0HsAV5/A/UU3SUuI8p/PCb8hNKzkp.', 'student')
ON DUPLICATE KEY UPDATE
  id = LAST_INSERT_ID(id),
  name = VALUES(name),
  password = VALUES(password),
  role = VALUES(role);
SET @student_id = LAST_INSERT_ID();

INSERT INTO courses (title, description, thumbnail_url)
SELECT 'Sample Course', 'A starter course for local development.', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM courses WHERE title = 'Sample Course'
);
SET @course_id = (
  SELECT id FROM courses WHERE title = 'Sample Course' ORDER BY id LIMIT 1
);

INSERT INTO playlists (course_id, title, order_index)
SELECT @course_id, 'Getting Started', 1
WHERE NOT EXISTS (
  SELECT 1 FROM playlists WHERE course_id = @course_id AND title = 'Getting Started'
);
SET @playlist_id = (
  SELECT id FROM playlists WHERE course_id = @course_id AND title = 'Getting Started' ORDER BY id LIMIT 1
);

INSERT INTO lessons (playlist_id, title, cloudinary_public_id, order_index)
SELECT @playlist_id, 'Welcome Lesson', 'sample_lesson_video_public_id', 1
WHERE NOT EXISTS (
  SELECT 1 FROM lessons WHERE playlist_id = @playlist_id AND title = 'Welcome Lesson'
);
SET @lesson_id = (
  SELECT id FROM lessons WHERE playlist_id = @playlist_id AND title = 'Welcome Lesson' ORDER BY id LIMIT 1
);

INSERT INTO enrollments (user_id, course_id)
VALUES (@student_id, @course_id)
ON DUPLICATE KEY UPDATE
  deleted_at = NULL,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO quizzes (lesson_id, title)
SELECT @lesson_id, 'Welcome Quiz'
WHERE NOT EXISTS (
  SELECT 1 FROM quizzes WHERE lesson_id = @lesson_id AND title = 'Welcome Quiz'
);
SET @quiz_id = (
  SELECT id FROM quizzes WHERE lesson_id = @lesson_id AND title = 'Welcome Quiz' ORDER BY id LIMIT 1
);

INSERT INTO quiz_questions (quiz_id, question_text)
SELECT @quiz_id, 'What is this sample lesson for?'
WHERE NOT EXISTS (
  SELECT 1 FROM quiz_questions WHERE quiz_id = @quiz_id AND question_text = 'What is this sample lesson for?'
);
SET @question_id = (
  SELECT id FROM quiz_questions WHERE quiz_id = @quiz_id AND question_text = 'What is this sample lesson for?' ORDER BY id LIMIT 1
);

INSERT INTO quiz_options (question_id, quiz_id, option_text, is_correct)
SELECT @question_id, @quiz_id, 'Local development testing', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM quiz_options WHERE question_id = @question_id AND option_text = 'Local development testing'
);

INSERT INTO quiz_options (question_id, quiz_id, option_text, is_correct)
SELECT @question_id, @quiz_id, 'Production billing setup', FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM quiz_options WHERE question_id = @question_id AND option_text = 'Production billing setup'
);
