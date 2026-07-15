import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardData } from '../../api/adminApi';
import { getApiError } from '../../api/client';
import ErrorMessage from '../../components/ErrorMessage';
import Loader from '../../components/Loader';
import StatCard from '../../components/StatCard';

const fallbackImage = '/images/cover of course.png';

const formatDate = (value) => {
  if (!value) return 'غير متاح';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'غير متاح' : date.toLocaleDateString('ar-EG');
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

const getCourseTitle = (course) => course?.title || course?.arabic_title || 'كورس بدون اسم';

const AdminDashboard = () => {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getDashboardData()
      .then((next) => {
        if (active) setData(next || {});
      })
      .catch((err) => {
        if (active) setError(getApiError(err, 'تعذر تحميل بيانات لوحة التحكم.'));
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
  const quickActions = [
    { label: 'إضافة كورس', to: '/admin/courses' },
    { label: 'إضافة مدرس', disabled: true, note: 'لا يوجد Route أو API للمدرسين حاليًا' },
    { label: 'إنشاء اختبار', to: '/admin/quizzes' },
    { label: 'إرسال إشعار', to: '/admin/notifications' },
    { label: 'مراجعة طلبات الدفع', to: '/admin/payment-requests' },
    { label: 'إضافة كوبون', disabled: true, note: 'لا يوجد Route أو API للكوبونات حاليًا' },
  ];

  return (
    <main className="admin-page admin-dashboard-page">
      <section className="page-head admin-dashboard-head">
        <div>
          <p className="eyebrow">نظرة عامة</p>
          <h1>لوحة تحكم الأدمن</h1>
          <p>متابعة مختصرة للكورسات، الطلاب، طلبات الدفع، والعمليات اليومية داخل منصة GATE.</p>
        </div>
        <Link className="btn btn-primary" to="/admin/reports">فتح التقارير</Link>
      </section>

      <ErrorMessage message={error} />
      {loading ? <Loader label="جاري تحميل بيانات لوحة التحكم..." /> : null}

      {!loading ? (
        <>
          <section className="stats-grid admin-stats-grid" aria-label="ملخص لوحة التحكم">
            <StatCard label="إجمالي الطلاب" value={summary.students} helper="حسابات المتعلمين" />
            <StatCard label="إجمالي الكورسات" value={summary.courses} helper="الكورسات الحالية" tone="navy" />
            <StatCard label="المدرسين" value={summary.teachers} helper="حسب الأدوار المتاحة" tone="green" />
            <StatCard label="طلبات الدفع المعلقة" value={summary.pendingPayments} helper="بانتظار المراجعة" tone="amber" />
            <StatCard label="الاختبارات" value={summary.quizzes} helper="حسب بيانات الـ API" tone="navy" />
          </section>

          <section className="admin-dashboard-grid">
            <article className="admin-card admin-list-card">
              <div className="admin-section-head">
                <div>
                  <p className="eyebrow">الطلاب</p>
                  <h2>آخر تسجيلات الطلاب</h2>
                </div>
                <Link className="btn btn-ghost btn-sm" to="/admin/students">عرض الطلاب</Link>
              </div>
              <div className="admin-activity-list">
                {recentEnrollments.map((enrollment, index) => (
                  <div className="admin-activity-item" key={enrollment.id || index}>
                    <span>تسجيل</span>
                    <div>
                      <h3>{enrollment.name || enrollment.email || enrollment.user_name || 'طالب'}</h3>
                      <p>{enrollment.course_title || enrollment.title || 'اشتراك في كورس'}</p>
                    </div>
                    <span>{formatDate(enrollment.created_at || enrollment.enrolled_at || enrollment.updated_at)}</span>
                  </div>
                ))}
                {recentEnrollments.length === 0 ? <p className="muted">لا توجد تسجيلات حديثة في بيانات لوحة التحكم.</p> : null}
              </div>
            </article>

            <article className="admin-card admin-list-card">
              <div className="admin-section-head">
                <div>
                  <p className="eyebrow">الدفع</p>
                  <h2>آخر طلبات الدفع</h2>
                </div>
                <Link className="btn btn-ghost btn-sm" to="/admin/payment-requests">مراجعة الطلبات</Link>
              </div>
              <div className="admin-activity-list">
                {recentPayments.map((request, index) => (
                  <div className="admin-activity-item" key={request.id || index}>
                    <span>{request.status || 'طلب'}</span>
                    <div>
                      <h3>{request.payer_name || request.name || request.user_name || request.email || 'طلب دفع'}</h3>
                      <p>{request.course_title || request.title || 'مراجعة دفع يدوي'}</p>
                    </div>
                    <span>{formatDate(request.created_at || request.updated_at)}</span>
                  </div>
                ))}
                {recentPayments.length === 0 ? <p className="muted">طلبات الدفع غير متاحة من بيانات لوحة التحكم الحالية.</p> : null}
              </div>
            </article>
          </section>

          <section className="admin-dashboard-grid">
            <article className="admin-card">
              <div className="admin-section-head">
                <div>
                  <p className="eyebrow">الكورسات</p>
                  <h2>أحدث الكورسات</h2>
                </div>
                <Link className="btn btn-ghost btn-sm" to="/admin/courses">إدارة الكورسات</Link>
              </div>
              <div className="admin-latest-course-grid">
                {latestCourses.map((course) => (
                  <Link className="admin-latest-course-card" to={`/admin/courses/${course.id}/edit`} key={course.id}>
                    <img src={course.thumbnail_url || fallbackImage} alt="" onError={(event) => { event.currentTarget.src = fallbackImage; }} />
                    <div>
                      <h3>{getCourseTitle(course)}</h3>
                      <p>{course.instructor_name || 'غير محدد'}</p>
                    </div>
                    <strong>{course.is_published === false || course.is_published === 0 ? 'غير منشور' : 'منشور'}</strong>
                  </Link>
                ))}
                {latestCourses.length === 0 ? <p className="muted">لا توجد كورسات متاحة في بيانات لوحة التحكم.</p> : null}
              </div>
            </article>

            <article className="admin-card admin-quick-panel">
              <div className="admin-section-head">
                <div>
                  <p className="eyebrow">إجراءات سريعة</p>
                  <h2>اختصارات الإدارة</h2>
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
