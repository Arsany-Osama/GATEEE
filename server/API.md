# GATE API Reference

Base URL locally: `http://localhost:5000`

Admin endpoints require an authenticated admin session cookie. Student endpoints require a logged-in user unless marked public.

## Auth

- `POST /auth/register` - create a student account.
- `POST /auth/login` - log in and set the auth cookie.
- `POST /auth/logout` - clear the auth cookie.
- `GET /auth/me` - return the current user.

## Courses

- `GET /courses` - public published course list.
- `GET /admin/courses` - admin course list, including category and instructor references.
- `POST /admin/courses` - create a course.
- `PUT /admin/courses/:id` - update a course.
- `DELETE /admin/courses/:id` - soft-delete a course.
- `GET /admin/courses/deleted` - list soft-deleted courses.
- `POST /admin/courses/:id/restore` - restore a soft-deleted course.
- `POST /admin/courses/:id/permanent` - permanently delete a course and related content.
- `GET /admin/courses/:courseId/curriculum` - get playlists and lessons for the course builder.
- `POST /admin/courses/:courseId/playlists` - create a module/playlist.
- `PUT /admin/courses/playlists/:id` - update a module/playlist.
- `DELETE /admin/courses/playlists/:id` - soft-delete a module/playlist and its lessons.

Course payload fields: `title`, `arabic_title`, `description`, `thumbnail_url`, `thumbnail_public_id`, `price`, `category_id`, `instructor_id`, `instructor_name`, `instructor_subtitle`, `is_published`, `display_order`.

## Lessons

- `POST /admin/lessons` - create a lesson.
- `PUT /admin/lessons/:id` - update lesson metadata.
- `DELETE /admin/lessons/:id` - soft-delete a lesson.
- `POST /admin/lessons/reorder` - update lesson order.
- `POST /admin/lessons/:id/upload-video` - upload a lesson video to Cloudinary and attach it to the lesson.

## Categories

- `GET /admin/categories` - list categories with linked course counts.
- `POST /admin/categories` - create a category.
- `PUT /admin/categories/:id` - update a category.
- `DELETE /admin/categories/:id` - delete a category when no active courses are linked.

Category payload fields: `name`, `arabic_name`, `description`, `is_active`, `display_order`.

## Instructors

- `GET /admin/instructors` - list instructors with linked course counts.
- `POST /admin/instructors` - create an instructor.
- `PUT /admin/instructors/:id` - update an instructor.
- `DELETE /admin/instructors/:id` - delete an instructor when no active courses are linked.

Instructor payload fields: `name`, `arabic_name`, `subtitle`, `bio`, `avatar_url`, `email`, `is_active`.

## Coupons

- `GET /admin/coupons` - list coupons.
- `POST /admin/coupons` - create a coupon.
- `PUT /admin/coupons/:id` - update a coupon.
- `DELETE /admin/coupons/:id` - delete a coupon.

Coupon payload fields: `code`, `description`, `discount_type` (`percent` or `fixed`), `discount_value`, `max_uses`, `starts_at`, `expires_at`, `is_active`.

## Uploads

- `POST /admin/uploads/course-image` - upload a course thumbnail image to Cloudinary.

Upload field: `image`. Allowed types are JPG, PNG, WEBP, and GIF. Maximum size is 5 MB. The response includes `url` and `public_id`; save those into the course payload as `thumbnail_url` and `thumbnail_public_id`.

## Other Admin Areas

- `GET /admin/dashboard/data` - dashboard users, courses, and enrollments.
- `GET /admin/users` - user management data.
- `GET /admin/security` - security summary.
- `GET /admin/reports` - report data.
- `GET /admin/payment-requests` and related admin payment request routes - review payment submissions.
- `GET /admin/notifications`, `POST /admin/notifications` - notification management.
- `GET /admin/settings`, `PUT /admin/settings` - platform settings.

## Health

- `GET /health` - confirms API and database connectivity.
