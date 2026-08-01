import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardData } from '../../api/adminApi';
import { getApiError } from '../../api/client';
import ErrorMessage from '../../components/ErrorMessage';
import Loader from '../../components/Loader';
import StatCard from '../../components/StatCard';
import { useAdminLanguage } from '../../context/AdminLanguageContext';

const fallbackImage = '/images/cover of course.png';

const formatDate = (value, locale = 'ar-EG') => {
  if (!value) return 'غير متاح';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'غير متاح' : date.toLocaleDateString(locale);
};

const getPaymentRequestsFromDashboard = (data) => {
  const candidates = [
    data?.paymentRequests,
    data?.payment_requests,
    data?.pendingPayments,
    data?.pending_payments,
  ];
  return candidates.find((candidate) => Array.isArray(candidate)) || [];
};

const getCourseTitle = (course, language = 'ar') => course?.title || course?.arabic_title || (language === 'ar' ? 'كورس بدون اسم' : 'Untitled course');

const copy = {
  ar: {
    overview: 'نظرة عامة',
    title: 'لوحة تحكم الأدمن',
    description: 'متابعة مختصرة للكورسات، الطلاب، طلبات الدفع، والعمليات اليومية داخل منصة GATE.',
    reports: 'فتح التقارير',
    loading: 'جاري تحميل بيانات لوحة التحكم...',
    stats: {
      students: 'إجمالي الطلاب',
      courses: 'إجمالي الكورسات',
      teachers: 'المدرسين',
      pendingPayments: 'طلبات الدفع المعلقة',
      quizzes: 'الاختبارات',
      helperStudents: 'حسابات المتعلمين',
      helperCourses: 'الكورسات الحالية',
      helperTeachers: 'حسب الأدوار المتاحة',
      helperPayments: 'بانتظار المراجعة',
      helperQuizzes: 'حسب بيانات الـ API',
    },
    sections: {
      students: 'الطلاب',
      studentsTitle: 'آخر تسجيلات الطلاب',
      studentsLink: 'عرض الطلاب',
      payments: 'الدفع',
      paymentsTitle: 'آخر طلبات الدفع',
      paymentsLink: 'مراجعة الطلبات',
      courses: 'الكورسات',
      coursesTitle: 'أحدث الكورسات',
      coursesLink: 'إدارة الكورسات',
      actions: 'إجراءات سريعة',
      quick: 'اختصارات الإدارة',
    },
    activity: {
      enroll: 'تسجيل',
      student: 'طالب',
      courseEnroll: 'اشتراك في كورس',
      payment: 'طلب دفع',
      manualPayment: 'مراجعة دفع يدوي',
      noEnrollments: 'لا توجد تسجيلات حديثة في بيانات لوحة التحكم.',
      noPayments: 'طلبات الدفع غير متاحة من بيانات لوحة التحكم الحالية.',
      noCourses: 'لا توجد كورسات متاحة في بيانات لوحة التحكم.',
      published: 'منشور',
      draft: 'غير منشور',
    },
    quickActions: {
      addCourse: 'إضافة كورس',
      addTeacher: 'إضافة مدرس',
      addTeacherNote: 'لا يوجد Route أو API للمدرسين حاليًا',
      createQuiz: 'إنشاء اختبار',
      sendNotification: 'إرسال إشعار',
      reviewPayments: 'مراجعة طلبات الدفع',
      addCoupon: 'إضافة كوبون',
      addCouponNote: 'لا يوجد Route أو API للكوبونات حاليًا',
    },
  },
  en: {
    overview: 'Overview',
    title: 'Admin dashboard',
    description: 'Quick monitoring for courses, students, payment requests, and daily operations inside GATE.',
    reports: 'Open reports',
    loading: 'Loading dashboard data...',
    stats: {
      students: 'Total students',
      courses: 'Total courses',
      teachers: 'Teachers',
      pendingPayments: 'Pending payments',
      quizzes: 'Quizzes',
      helperStudents: 'Learner accounts',
      helperCourses: 'Active courses',
      helperTeachers: 'By available roles',
      helperPayments: 'Waiting for review',
      helperQuizzes: 'Based on API data',
    },
    sections: {
      students: 'Students',
      studentsTitle: 'Latest student enrollments',
      studentsLink: 'View students',
      payments: 'Payments',
      paymentsTitle: 'Latest payment requests',
      paymentsLink: 'Review requests',
      courses: 'Courses',
      coursesTitle: 'Latest courses',
      coursesLink: 'Manage courses',
      actions: 'Quick actions',
      quick: 'Admin shortcuts',
    },
    activity: {
      enroll: 'Enrollment',
      student: 'Student',
      courseEnroll: 'Course enrollment',
      payment: 'Payment request',
      manualPayment: 'Manual payment review',
      noEnrollments: 'No recent enrollments are available in the dashboard data.',
      noPayments: 'Payment requests are not available in the current dashboard data.',
      noCourses: 'No courses are available in the dashboard data.',
      published: 'Published',
      draft: 'Draft',
    },
    quickActions: {
      addCourse: 'Add course',
      addTeacher: 'Add teacher',
      addTeacherNote: 'No teacher route or API is available right now',
      createQuiz: 'Create quiz',
      sendNotification: 'Send notification',
      reviewPayments: 'Review payment requests',
      addCoupon: 'Add coupon',
      addCouponNote: 'No coupon route or API is available right now',
    },
  },
};

const AdminDashboard = () => {
  const { language } = useAdminLanguage();
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const text = copy[language] || copy.ar;

  useEffect(() => {
    let active = true;
    getDashboardData()
      .then((next) => {
        if (active) setData(next || {});
      })
      .catch((err) => {
        if (active) setError(getApiError(err, language === 'ar' ? 'تعذر تحميل بيانات لوحة التحكم.' : 'Could not load dashboard data.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const users = Array.isArray(data?.users) ? data.users : [];
  const courses = Array.isArray(data?.courses) ? data.courses : [];
  const enrollments = Array.isArray(data?.enrollments) ? data.enrollments : [];
  const paymentRequests = getPaymentRequestsFromDashboard(data);

  const students = users.filter((user) => user?.role !== 'admin');
  const teachers = users.filter((user) => ['teacher', 'instructor'].includes(String(user?.role || '').toLowerCase()));
  const pendingPayments = paymentRequests.filter((request) => request?.status === 'pending');
  const quizzes = data?.quizzes || data?.quiz_count || data?.total_quizzes;
  const summary = {
    students: students.length,
    courses: courses.length,
    teachers: teachers.length,
    pendingPayments: pendingPayments.length,
    quizzes: Array.isArray(quizzes) ? quizzes.length : Number(quizzes || 0),
  };

  const recentEnrollments = enrollments.slice(0, 5);
  const recentPayments = paymentRequests.slice(0, 5);
  const latestCourses = courses.slice(0, 4);
  const dateLocale = language === 'ar' ? 'ar-EG' : 'en-US';
  const quickActions = [
    { label: text.quickActions.addCourse, to: '/admin/courses' },
    { label: text.quickActions.addTeacher, disabled: true, note: text.quickActions.addTeacherNote },
    { label: text.quickActions.createQuiz, to: '/admin/quizzes' },
    { label: text.quickActions.sendNotification, to: '/admin/notifications' },
    { label: text.quickActions.reviewPayments, to: '/admin/payment-requests' },
    { label: text.quickActions.addCoupon, disabled: true, note: text.quickActions.addCouponNote },
  ];

  return (
    <main className="admin-page admin-dashboard-page">
      <section className="page-head admin-dashboard-head">
        <div>
          <p className="eyebrow">{text.overview}</p>
          <h1>{text.title}</h1>
          <p>{text.description}</p>
        </div>
        <Link className="btn btn-primary" to="/admin/reports">{text.reports}</Link>
      </section>

      <ErrorMessage message={error} />
      {loading ? <Loader label={text.loading} /> : null}

      {!loading ? (
        <>
          <section className="stats-grid admin-stats-grid" aria-label="ملخص لوحة التحكم">
            <StatCard label={text.stats.students} value={summary.students} helper={text.stats.helperStudents} />
            <StatCard label={text.stats.courses} value={summary.courses} helper={text.stats.helperCourses} tone="navy" />
            <StatCard label={text.stats.teachers} value={summary.teachers} helper={text.stats.helperTeachers} tone="green" />
            <StatCard label={text.stats.pendingPayments} value={summary.pendingPayments} helper={text.stats.helperPayments} tone="amber" />
            <StatCard label={text.stats.quizzes} value={summary.quizzes} helper={text.stats.helperQuizzes} tone="navy" />
          </section>

          <section className="admin-dashboard-grid">
            <article className="admin-card admin-list-card">
              <div className="admin-section-head">
                <div>
                  <p className="eyebrow">{text.sections.students}</p>
                  <h2>{text.sections.studentsTitle}</h2>
                </div>
                <Link className="btn btn-ghost btn-sm" to="/admin/students">{text.sections.studentsLink}</Link>
              </div>
              <div className="admin-activity-list">
                {recentEnrollments.map((enrollment, index) => (
                  <div className="admin-activity-item" key={enrollment.id || index}>
                    <span>{text.activity.enroll}</span>
                    <div>
                      <h3>{enrollment.name || enrollment.email || enrollment.user_name || text.activity.student}</h3>
                      <p>{enrollment.course_title || enrollment.title || text.activity.courseEnroll}</p>
                    </div>
                    <span>{formatDate(enrollment.created_at || enrollment.enrolled_at || enrollment.updated_at, dateLocale)}</span>
                  </div>
                ))}
                {recentEnrollments.length === 0 ? <p className="muted">{text.activity.noEnrollments}</p> : null}
              </div>
            </article>

            <article className="admin-card admin-list-card">
              <div className="admin-section-head">
                <div>
                  <p className="eyebrow">{text.sections.payments}</p>
                  <h2>{text.sections.paymentsTitle}</h2>
                </div>
                <Link className="btn btn-ghost btn-sm" to="/admin/payment-requests">{text.sections.paymentsLink}</Link>
              </div>
              <div className="admin-activity-list">
                {recentPayments.map((request, index) => (
                  <div className="admin-activity-item" key={request.id || index}>
                    <span>{request.status || text.activity.payment}</span>
                    <div>
                      <h3>{request.payer_name || request.name || request.user_name || request.email || text.activity.payment}</h3>
                      <p>{request.course_title || request.title || text.activity.manualPayment}</p>
                    </div>
                    <span>{formatDate(request.created_at || request.updated_at, dateLocale)}</span>
                  </div>
                ))}
                {recentPayments.length === 0 ? <p className="muted">{text.activity.noPayments}</p> : null}
              </div>
            </article>
          </section>

          <section className="admin-dashboard-grid">
            <article className="admin-card">
              <div className="admin-section-head">
                <div>
                  <p className="eyebrow">{text.sections.courses}</p>
                  <h2>{text.sections.coursesTitle}</h2>
                </div>
                <Link className="btn btn-ghost btn-sm" to="/admin/courses">{text.sections.coursesLink}</Link>
              </div>
              <div className="admin-latest-course-grid">
                {latestCourses.map((course) => (
                  <Link className="admin-latest-course-card" to={`/admin/courses/${course.id}/edit`} key={course.id}>
                    <img src={course.thumbnail_url || fallbackImage} alt="" onError={(event) => { event.currentTarget.src = fallbackImage; }} />
                    <div>
                      <h3>{getCourseTitle(course, language)}</h3>
                      <p>{course.instructor_name || (language === 'ar' ? 'غير محدد' : 'Unspecified')}</p>
                    </div>
                    <strong>{course.is_published === false || course.is_published === 0 ? text.activity.draft : text.activity.published}</strong>
                  </Link>
                ))}
                {latestCourses.length === 0 ? <p className="muted">{text.activity.noCourses}</p> : null}
              </div>
            </article>

            <article className="admin-card admin-quick-panel">
              <div className="admin-section-head">
                <div>
                  <p className="eyebrow">{text.sections.actions}</p>
                  <h2>{text.sections.quick}</h2>
                </div>
              </div>
              <div className="admin-quick-grid">
                {quickActions.map((action) => (
                  action.disabled ? (
                    <span className="admin-quick-disabled" key={action.label} title={action.note}>
                      {action.label}
                      <small>{action.note}</small>
                    </span>
                  ) : (
                    <Link className="admin-quick-link" key={action.label} to={action.to}>
                      {action.label}
                    </Link>
                  )
                ))}
              </div>
            </article>
          </section>
        </>
      ) : null}
    </main>
  );
};

export default AdminDashboard;
