CREATE TABLE IF NOT EXISTS notifications (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  recipient_user_id INT UNSIGNED NULL,
  recipient_role VARCHAR(40) NULL,
  actor_user_id INT UNSIGNED NULL,
  type VARCHAR(80) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  entity_type VARCHAR(80) NULL,
  entity_id INT UNSIGNED NULL,
  metadata JSON NULL,
  read_at DATETIME NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY notifications_recipient_user_index (recipient_user_id),
  KEY notifications_recipient_role_index (recipient_role),
  KEY notifications_actor_user_index (actor_user_id),
  KEY notifications_type_index (type),
  KEY notifications_read_at_index (read_at),
  KEY notifications_created_at_index (created_at),
  CONSTRAINT notifications_recipient_user_foreign
    FOREIGN KEY (recipient_user_id) REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT notifications_actor_user_foreign
    FOREIGN KEY (actor_user_id) REFERENCES users (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
