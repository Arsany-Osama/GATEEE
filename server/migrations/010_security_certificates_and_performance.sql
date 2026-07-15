CREATE TABLE IF NOT EXISTS schema_migrations (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  filename VARCHAR(255) NOT NULL,
  executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY schema_migrations_filename_unique (filename)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_sessions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  ip_address VARCHAR(64) NOT NULL,
  user_agent TEXT NULL,
  device_hash CHAR(64) NOT NULL,
  country_code VARCHAR(8) NULL,
  last_seen TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY user_sessions_user_device_unique (user_id, device_hash),
  KEY user_sessions_user_id_index (user_id),
  KEY user_sessions_last_seen_index (last_seen),
  KEY user_sessions_device_hash_index (device_hash),
  CONSTRAINT user_sessions_user_id_foreign
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS video_access_logs (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  course_id INT UNSIGNED NOT NULL,
  lesson_id INT UNSIGNED NOT NULL,
  ip_address VARCHAR(64) NOT NULL,
  user_agent TEXT NULL,
  country_code VARCHAR(8) NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY video_access_logs_user_id_index (user_id),
  KEY video_access_logs_course_id_index (course_id),
  KEY video_access_logs_lesson_id_index (lesson_id),
  KEY video_access_logs_timestamp_index (timestamp),
  CONSTRAINT video_access_logs_user_id_foreign
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT video_access_logs_course_id_foreign
    FOREIGN KEY (course_id) REFERENCES courses (id)
    ON DELETE CASCADE,
  CONSTRAINT video_access_logs_lesson_id_foreign
    FOREIGN KEY (lesson_id) REFERENCES lessons (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS certificates (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid CHAR(36) NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  course_id INT UNSIGNED NOT NULL,
  issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME NULL,
  revoked_by INT UNSIGNED NULL,
  hmac_signature VARCHAR(128) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY certificates_uuid_unique (uuid),
  UNIQUE KEY certificates_user_course_unique (user_id, course_id),
  KEY certificates_user_id_index (user_id),
  KEY certificates_course_id_index (course_id),
  KEY certificates_revoked_at_index (revoked_at),
  CONSTRAINT certificates_user_id_foreign
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT certificates_course_id_foreign
    FOREIGN KEY (course_id) REFERENCES courses (id)
    ON DELETE CASCADE,
  CONSTRAINT certificates_revoked_by_foreign
    FOREIGN KEY (revoked_by) REFERENCES users (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP PROCEDURE IF EXISTS add_column_if_missing;

DELIMITER //
CREATE PROCEDURE add_column_if_missing(IN p_table_name VARCHAR(64), IN p_column_name VARCHAR(64), IN p_column_definition TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table_name
      AND COLUMN_NAME = p_column_name
  ) THEN
    SET @sql = CONCAT('ALTER TABLE ', p_table_name, ' ADD COLUMN ', p_column_name, ' ', p_column_definition);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END//
DELIMITER ;

CALL add_column_if_missing('users', 'deleted_at', 'DATETIME NULL DEFAULT NULL AFTER updated_at');
CALL add_column_if_missing('payment_requests', 'deleted_at', 'DATETIME NULL DEFAULT NULL AFTER updated_at');
CALL add_column_if_missing('payment_requests', 'receipt_hash', 'CHAR(64) NULL AFTER receipt_size');
CALL add_column_if_missing('user_sessions', 'country_code', 'VARCHAR(8) NULL AFTER device_hash');
CALL add_column_if_missing('video_access_logs', 'country_code', 'VARCHAR(8) NULL AFTER user_agent');

DROP PROCEDURE IF EXISTS add_column_if_missing;

DROP PROCEDURE IF EXISTS add_index_if_missing;

DELIMITER //
CREATE PROCEDURE add_index_if_missing(IN p_table_name VARCHAR(64), IN p_index_name VARCHAR(64), IN p_index_definition TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table_name
      AND INDEX_NAME = p_index_name
  ) THEN
    SET @sql = CONCAT('ALTER TABLE ', p_table_name, ' ADD ', p_index_definition);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END//
DELIMITER ;

CALL add_index_if_missing('users', 'users_deleted_at_index', 'KEY users_deleted_at_index (deleted_at)');
CALL add_index_if_missing('payment_requests', 'payment_requests_deleted_at_index', 'KEY payment_requests_deleted_at_index (deleted_at)');
CALL add_index_if_missing('payment_requests', 'payment_requests_receipt_hash_unique', 'UNIQUE KEY payment_requests_receipt_hash_unique (receipt_hash)');
CALL add_index_if_missing('quiz_results', 'quiz_results_user_quiz_index', 'KEY quiz_results_user_quiz_index (user_id, quiz_id)');
CALL add_index_if_missing('progress', 'progress_user_course_index', 'KEY progress_user_course_index (user_id, course_id)');

DROP PROCEDURE IF EXISTS add_index_if_missing;
