-- Base schema for the current Express/Knex backend.
-- Matches the column names used by the existing route files.

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('student', 'admin') NOT NULL DEFAULT 'student',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY users_email_unique (email),
  KEY users_role_index (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS courses (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  arabic_title VARCHAR(255) NULL,
  description TEXT NULL,
  thumbnail_url VARCHAR(1024) NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 2000.00,
  instructor_name VARCHAR(255) NOT NULL DEFAULT 'Eng. Ahmed Gamal Elghawy',
  instructor_subtitle VARCHAR(255) NOT NULL DEFAULT '10+ Years Experience',
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INT NOT NULL DEFAULT 0,
  deleted_at DATETIME NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY courses_is_published_index (is_published),
  KEY courses_display_order_index (display_order),
  KEY courses_deleted_at_index (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS playlists (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  course_id INT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  deleted_at DATETIME NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY playlists_course_id_index (course_id),
  KEY playlists_order_index_index (order_index),
  KEY playlists_deleted_at_index (deleted_at),
  CONSTRAINT playlists_course_id_foreign
    FOREIGN KEY (course_id) REFERENCES courses (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lessons (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  playlist_id INT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  cloudinary_public_id VARCHAR(1024) NULL,
  order_index INT NOT NULL DEFAULT 0,
  deleted_at DATETIME NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY lessons_playlist_id_index (playlist_id),
  KEY lessons_order_index_index (order_index),
  KEY lessons_deleted_at_index (deleted_at),
  CONSTRAINT lessons_playlist_id_foreign
    FOREIGN KEY (playlist_id) REFERENCES playlists (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS enrollments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  course_id INT UNSIGNED NOT NULL,
  deleted_at DATETIME NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY enrollments_user_course_unique (user_id, course_id),
  KEY enrollments_course_id_index (course_id),
  KEY enrollments_deleted_at_index (deleted_at),
  CONSTRAINT enrollments_user_id_foreign
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT enrollments_course_id_foreign
    FOREIGN KEY (course_id) REFERENCES courses (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS progress (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  lesson_id INT UNSIGNED NOT NULL,
  course_id INT UNSIGNED NULL,
  deleted_at DATETIME NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY progress_user_lesson_unique (user_id, lesson_id),
  KEY progress_lesson_id_index (lesson_id),
  KEY progress_course_id_index (course_id),
  KEY progress_deleted_at_index (deleted_at),
  CONSTRAINT progress_user_id_foreign
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT progress_lesson_id_foreign
    FOREIGN KEY (lesson_id) REFERENCES lessons (id)
    ON DELETE CASCADE,
  CONSTRAINT progress_course_id_foreign
    FOREIGN KEY (course_id) REFERENCES courses (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quizzes (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  lesson_id INT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  deleted_at DATETIME NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY quizzes_lesson_id_index (lesson_id),
  KEY quizzes_deleted_at_index (deleted_at),
  CONSTRAINT quizzes_lesson_id_foreign
    FOREIGN KEY (lesson_id) REFERENCES lessons (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quiz_questions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  quiz_id INT UNSIGNED NOT NULL,
  question_text TEXT NOT NULL,
  deleted_at DATETIME NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY quiz_questions_quiz_id_index (quiz_id),
  KEY quiz_questions_deleted_at_index (deleted_at),
  CONSTRAINT quiz_questions_quiz_id_foreign
    FOREIGN KEY (quiz_id) REFERENCES quizzes (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quiz_options (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  question_id INT UNSIGNED NOT NULL,
  quiz_id INT UNSIGNED NULL,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at DATETIME NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY quiz_options_question_id_index (question_id),
  KEY quiz_options_quiz_id_index (quiz_id),
  KEY quiz_options_deleted_at_index (deleted_at),
  CONSTRAINT quiz_options_question_id_foreign
    FOREIGN KEY (question_id) REFERENCES quiz_questions (id)
    ON DELETE CASCADE,
  CONSTRAINT quiz_options_quiz_id_foreign
    FOREIGN KEY (quiz_id) REFERENCES quizzes (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quiz_results (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  quiz_id INT UNSIGNED NOT NULL,
  score INT NOT NULL DEFAULT 0,
  total_questions INT NOT NULL DEFAULT 0,
  deleted_at DATETIME NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY quiz_results_user_id_index (user_id),
  KEY quiz_results_quiz_id_index (quiz_id),
  KEY quiz_results_deleted_at_index (deleted_at),
  CONSTRAINT quiz_results_user_id_foreign
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT quiz_results_quiz_id_foreign
    FOREIGN KEY (quiz_id) REFERENCES quizzes (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
