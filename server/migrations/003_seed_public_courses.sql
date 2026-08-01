-- Idempotently moves the two approved public course cards into the backend.
-- IDs 1 and 2 preserve the existing /payment/course/1 and /payment/course/2 links.
-- Arabic titles are stored as UTF-8 hex literals to avoid Windows console encoding corruption.

INSERT INTO courses (
  id,
  title,
  arabic_title,
  description,
  thumbnail_url,
  price,
  instructor_name,
  instructor_subtitle,
  is_published,
  display_order
)
VALUES
  (
    1,
    'OSHA Standards for General Industry and Construction',
    CONVERT(0xd983d988d8b1d8b320d985d8b9d8a7d98ad98ad8b120d8a7d984d8a3d988d8b4d8a720d984d984d8b5d986d8a7d8b9d8a7d8aa20d8a7d984d8b9d8a7d985d8a920d988d8a7d984d8a5d986d8b4d8a7d8a1d8a7d8aa USING utf8mb4),
    'Comprehensive training on industrial safety principles, risk assessment, and control measures.',
    '/images/osha-course-cover.png',
    2000.00,
    'Ch. Ahmed Gamal Elghawy',
    '10+ Years Experience',
    TRUE,
    1
  ),
  (
    2,
    'IOSH Managing Safely course',
    CONVERT(0xd983d988d8b1d8b320d8a7d984d8a3d98ad988d8b420d8a7d984d8a5d8afd8a7d8b1d8a920d8a8d8a3d985d8a7d986 USING utf8mb4),
    'Essential safety practices for construction sites and project environments.',
    '/images/iosh-course-cover.png',
    2000.00,
    'Ch. Ahmed Gamal Elghawy',
    '10+ Years Experience',
    TRUE,
    2
  )
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  arabic_title = VALUES(arabic_title),
  description = VALUES(description),
  thumbnail_url = VALUES(thumbnail_url),
  price = VALUES(price),
  instructor_name = VALUES(instructor_name),
  instructor_subtitle = VALUES(instructor_subtitle),
  is_published = VALUES(is_published),
  display_order = VALUES(display_order),
  deleted_at = NULL,
  updated_at = CURRENT_TIMESTAMP;
