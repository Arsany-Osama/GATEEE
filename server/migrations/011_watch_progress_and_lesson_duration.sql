DELIMITER //

CREATE PROCEDURE add_column_if_missing(
  IN p_table_name VARCHAR(64),
  IN p_column_name VARCHAR(64),
  IN p_column_definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table_name
      AND COLUMN_NAME = p_column_name
  ) THEN
    SET @sql = CONCAT(
      'ALTER TABLE ',
      p_table_name,
      ' ADD COLUMN ',
      p_column_name,
      ' ',
      p_column_definition
    );

    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END//

CREATE PROCEDURE add_index_if_missing(
  IN p_table_name VARCHAR(64),
  IN p_index_name VARCHAR(64),
  IN p_index_definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table_name
      AND INDEX_NAME = p_index_name
  ) THEN
    SET @sql = CONCAT(
      'ALTER TABLE ',
      p_table_name,
      ' ADD ',
      p_index_definition
    );

    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END//

DELIMITER ;

CALL add_column_if_missing(
  'lessons',
  'duration_seconds',
  'INT UNSIGNED NULL AFTER cloudinary_public_id'
);

CALL add_column_if_missing(
  'progress',
  'watched_seconds',
  'INT UNSIGNED NOT NULL DEFAULT 0 AFTER course_id'
);

CALL add_column_if_missing(
  'progress',
  'completion_percentage',
  'DECIMAL(5,2) NOT NULL DEFAULT 0.00 AFTER watched_seconds'
);

CALL add_column_if_missing(
  'progress',
  'completed_at',
  'DATETIME NULL DEFAULT NULL AFTER completion_percentage'
);

CALL add_column_if_missing(
  'progress',
  'last_watched_at',
  'DATETIME NULL DEFAULT NULL AFTER completed_at'
);

CALL add_index_if_missing(
  'lessons',
  'lessons_duration_seconds_index',
  'KEY lessons_duration_seconds_index (duration_seconds)'
);

CALL add_index_if_missing(
  'progress',
  'progress_completed_at_index',
  'KEY progress_completed_at_index (completed_at)'
);

CALL add_index_if_missing(
  'progress',
  'progress_last_watched_at_index',
  'KEY progress_last_watched_at_index (last_watched_at)'
);

UPDATE progress
SET
  completion_percentage = CASE
    WHEN completion_percentage IS NULL OR completion_percentage = 0
      THEN 100.00
    ELSE completion_percentage
  END,
  completed_at = COALESCE(completed_at, updated_at),
  last_watched_at = COALESCE(last_watched_at, updated_at)
WHERE deleted_at IS NULL;

DROP PROCEDURE IF EXISTS add_column_if_missing;
DROP PROCEDURE IF EXISTS add_index_if_missing;
