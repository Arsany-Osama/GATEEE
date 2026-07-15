# Codex Prompt — GATE Admin Redesign from STITCH References

You are working on my existing GATE educational platform.

I added the approved STITCH admin design references inside:

- `/design-reference/admin-stitch` for screenshots
- `/design-reference/stitch-code` for exported STITCH HTML code
- `/design-reference/STITCH_DESIGN_TOKENS.md` for colors/typography/style tokens

Before writing any code:
1. List all files inside `/design-reference/admin-stitch`.
2. Open and study all screenshots.
3. Open `/design-reference/STITCH_DESIGN_TOKENS.md`.
4. Treat these screenshots and design tokens as the approved visual reference.
5. If exported STITCH code exists, use it only as a visual/style reference, not as a direct replacement for the existing React app.
6. Do not invent a different visual direction.
7. Do not start implementation until you confirm you can see the design references.

Goal:
Redesign the existing Admin Panel UI based on the provided STITCH screenshots and design tokens.

Very important:
- Work on the frontend/admin UI only.
- Do NOT modify the backend.
- Do NOT modify the database.
- Do NOT create new API endpoints.
- Do NOT break authentication, admin permissions, uploads, courses, payments, quizzes, notifications, or existing routes.
- Do NOT remove any existing admin functionality.
- Do NOT create fake buttons that are not connected to real functionality.
- Reuse the existing APIs and frontend logic wherever possible.
- If a required feature has no existing API support, report it clearly instead of inventing a new endpoint.

Visual direction:
Follow the screenshots inside `/design-reference/admin-stitch`.

The admin panel must match the current GATE platform identity:
- Dark navy / black premium theme
- Cyan, blue, and purple accents
- Glass-style panels
- Soft glow accents
- Gradient primary buttons
- Rounded cards
- Clean tables
- Professional educational SaaS feel
- Same visual language across all admin pages
- No generic white dashboard styling
- No random decorative illustrations
- Charts only inside the Reports page

Language support:
Add bilingual support for:
- Arabic
- English

Requirements:
- Arabic layout must be RTL.
- English layout must be LTR.
- Add a clear language switcher in the topbar.
- Do not hardcode Arabic-only labels.
- Use a clean translation structure for labels, headings, buttons, statuses, tables, forms, empty states, loading states, and errors.
- The layout must flip correctly between Arabic RTL and English LTR.

Admin pages to redesign with the same theme:
1. Dashboard
2. Courses
3. Categories
4. Students
5. Instructors
6. Lectures
7. Exams
8. Subscriptions / Payment Requests
9. Coupons
10. Messages / Notifications
11. Reports
12. Settings

Global admin layout:
Use one consistent admin layout across all admin pages:
- Sidebar
- Topbar
- Search
- Notifications
- Admin profile
- Language switcher
- Logout / account dropdown

Sidebar items:

Arabic:
- الرئيسية
- الكورسات
- الأقسام
- الطلاب
- المدرسين
- المحاضرات
- الاختبارات
- الاشتراكات / طلبات الدفع
- الكوبونات
- الرسائل / الإشعارات
- التقارير
- الإعدادات

English:
- Dashboard
- Courses
- Categories
- Students
- Instructors
- Lectures
- Exams
- Subscriptions / Payment Requests
- Coupons
- Messages / Notifications
- Reports
- Settings

Dashboard page:
Include:
- Overview cards
- Total students
- Total courses
- Instructors
- Pending payment requests
- Exams
- Quick actions
- Latest student registrations
- Latest payment requests
- Recent courses or recent activity if already supported by existing data

Important:
Do not add charts to the dashboard unless charts already exist there. Keep charts for the Reports page.

Courses page:
This is one of the most important sections.

Courses page must include:
- Courses table
- Search
- Category filter
- Status filter
- Add course button
- View action
- Edit action
- Activate / deactivate action if currently supported

Course table columns:
- Course image
- Course name
- Category
- Instructor
- Price
- Status
- Created date
- Actions

Edit course:
When clicking Edit, open a drawer, side panel, or edit page that matches the STITCH design.

The edit form must load the existing course data and allow editing:
- Course image
- Course name
- Description
- Price
- Discount price if available
- Category
- Instructor
- Level if available
- Duration if available
- Status: published / unpublished
- Any other existing course field already supported by the current data model/API

Image editing rules:
- Show the current course image.
- Allow uploading a new image only if the current system/API already supports image uploads.
- If a new image is selected, replace the old one.
- If no new image is selected, keep the existing image unchanged.
- Do not create a new course when editing.
- Update the same course ID.

After saving:
- Show loading state while saving.
- Show success message.
- Refresh/update the courses table.
- Show error message if the update fails.
- Do not lose existing course data when only one field is changed.

Other pages:
Apply the same visual system and functionality to:
- Categories
- Students
- Instructors
- Lectures
- Exams
- Payment Requests
- Coupons
- Messages / Notifications
- Reports
- Settings

For each page:
- Keep existing functionality.
- Use real existing data.
- Add loading state.
- Add empty state.
- Add error state.
- Use consistent dark GATE styling.
- Use consistent table, card, button, badge, modal, and drawer styling.

Reports page:
Charts are allowed only here.
Use existing report data only.
Do not invent fake reports if there is no data source.

Design quality:
- Improve readability if the STITCH text appears too small.
- Keep spacing clean.
- Avoid visual clutter.
- Keep the UI premium but practical.
- Do not overuse glow effects.
- Make tables clear and usable.

Before implementation:
1. Inspect the existing admin routes.
2. Inspect the existing admin pages.
3. Inspect existing API services.
4. Identify all current admin functionality.
5. Identify the current frontend structure.
6. Study all images in `/design-reference/admin-stitch`.
7. Create a short implementation plan.
8. Then implement.

Validation after implementation:
- Run the project.
- Open the admin dashboard.
- Test all admin navigation links.
- Test the courses page.
- Test editing an existing course.
- Test changing course name only.
- Test changing course price only.
- Test changing course image if supported.
- Confirm the update happens on the same course ID.
- Confirm the old image remains if no new image is uploaded.
- Confirm there are no fake buttons.
- Confirm all previous admin features are still reachable.
- Confirm Arabic RTL works.
- Confirm English LTR works.
- Confirm language switcher works.
- Confirm no backend files were changed.
- Confirm no database files were changed.
- Confirm no new API endpoints were created.
- Check browser console for errors.
- Run npm run build if available.

Final report:
After finishing, provide a short report with:
- Files changed
- Whether backend was changed
- Whether database was changed
- Whether APIs were changed or created
- Whether course editing works
- Whether image editing works or is not supported by the current API
- Whether Arabic/English switching works
- Whether all admin pages use the same GATE dark theme
- Whether build passed
- Any known issues
