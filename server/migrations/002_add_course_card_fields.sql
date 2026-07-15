DROP PROCEDURE IF EXISTS add_column_if_missing;
DROP PROCEDURE IF EXISTS add_index_if_missing;

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

CALL add_column_if_missing('courses', 'arabic_title', 'VARCHAR(255) NULL');
CALL add_column_if_missing('courses', 'price', 'DECIMAL(10,2) NOT NULL DEFAULT 2000.00');
CALL add_column_if_missing('courses', 'instructor_name', 'VARCHAR(255) NOT NULL DEFAULT ''Eng. Ahmed Gamal Elghawy''');
CALL add_column_if_missing('courses', 'instructor_subtitle', 'VARCHAR(255) NOT NULL DEFAULT ''10+ Years Experience''');
CALL add_column_if_missing('courses', 'is_published', 'BOOLEAN NOT NULL DEFAULT TRUE');
CALL add_column_if_missing('courses', 'display_order', 'INT NOT NULL DEFAULT 0');

CALL add_index_if_missing('courses', 'courses_is_published_index', 'KEY courses_is_published_index (is_published)');
CALL add_index_if_missing('courses', 'courses_display_order_index', 'KEY courses_display_order_index (display_order)');

DROP PROCEDURE IF EXISTS add_column_if_missing;
DROP PROCEDURE IF EXISTS add_index_if_missing;
