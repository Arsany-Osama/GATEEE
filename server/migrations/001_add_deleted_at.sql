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

CALL add_column_if_missing('courses', 'deleted_at', 'DATETIME NULL DEFAULT NULL');
CALL add_column_if_missing('playlists', 'deleted_at', 'DATETIME NULL DEFAULT NULL');
CALL add_column_if_missing('lessons', 'deleted_at', 'DATETIME NULL DEFAULT NULL');
CALL add_column_if_missing('quizzes', 'deleted_at', 'DATETIME NULL DEFAULT NULL');
CALL add_column_if_missing('quiz_questions', 'deleted_at', 'DATETIME NULL DEFAULT NULL');
CALL add_column_if_missing('quiz_options', 'deleted_at', 'DATETIME NULL DEFAULT NULL');
CALL add_column_if_missing('enrollments', 'deleted_at', 'DATETIME NULL DEFAULT NULL');
CALL add_column_if_missing('progress', 'deleted_at', 'DATETIME NULL DEFAULT NULL');

DROP PROCEDURE IF EXISTS add_column_if_missing;
