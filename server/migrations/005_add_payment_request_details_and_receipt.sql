DROP PROCEDURE IF EXISTS add_payment_request_column;

DELIMITER //
CREATE PROCEDURE add_payment_request_column(IN p_column_name VARCHAR(64), IN p_column_definition TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'payment_requests'
      AND COLUMN_NAME = p_column_name
  ) THEN
    SET @sql = CONCAT('ALTER TABLE payment_requests ADD COLUMN ', p_column_name, ' ', p_column_definition);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END//
DELIMITER ;

CALL add_payment_request_column('receipt_url', 'VARCHAR(255) NULL AFTER admin_note');
CALL add_payment_request_column('receipt_original_name', 'VARCHAR(255) NULL AFTER receipt_url');
CALL add_payment_request_column('receipt_mime_type', 'VARCHAR(80) NULL AFTER receipt_original_name');
CALL add_payment_request_column('receipt_size', 'INT UNSIGNED NULL AFTER receipt_mime_type');
CALL add_payment_request_column('payer_name', 'VARCHAR(255) NULL AFTER receipt_size');
CALL add_payment_request_column('payer_phone', 'VARCHAR(80) NULL AFTER payer_name');
CALL add_payment_request_column('payment_method', 'VARCHAR(80) NULL AFTER payer_phone');
CALL add_payment_request_column('transfer_reference', 'VARCHAR(255) NULL AFTER payment_method');
CALL add_payment_request_column('transfer_date', 'DATE NULL AFTER transfer_reference');
CALL add_payment_request_column('submitted_amount', 'DECIMAL(10,2) NULL AFTER transfer_date');

DROP PROCEDURE IF EXISTS add_payment_request_column;
