CREATE TABLE IF NOT EXISTS payment_requests (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  course_id INT UNSIGNED NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  contact_number VARCHAR(80) NULL,
  note TEXT NULL,
  admin_note TEXT NULL,
  reviewed_by INT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY payment_requests_user_id_index (user_id),
  KEY payment_requests_course_id_index (course_id),
  KEY payment_requests_status_index (status),
  KEY payment_requests_created_at_index (created_at),
  KEY payment_requests_reviewed_by_index (reviewed_by),
  CONSTRAINT payment_requests_user_id_foreign
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT payment_requests_course_id_foreign
    FOREIGN KEY (course_id) REFERENCES courses (id)
    ON DELETE CASCADE,
  CONSTRAINT payment_requests_reviewed_by_foreign
    FOREIGN KEY (reviewed_by) REFERENCES users (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
