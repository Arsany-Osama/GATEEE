import { useEffect, useState } from 'react';
import { getAdminReportsOverview } from '../../api/adminReportsApi';
import { getApiError } from '../../api/client';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import ErrorMessage from '../../components/ErrorMessage';
import Loader from '../../components/Loader';
import PageBackLink from '../../components/PageBackLink';
import StatCard from '../../components/StatCard';

const fallbackImage = '/images/cover of course.png';

const money = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '0 EGP';
  return `${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} EGP`;
};

const percent = (value) => `${Math.max(0, Math.min(100, Math.round(Number(value) || 0)))}%`;

const formatDate = (value) => {
  if (!value) return 'Not reported';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not reported' : date.toLocaleString();
};

const AdminReportsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const reports = await getAdminReportsOverview();
        if (active) setData(reports || {});
      } catch (err) {
        if (active) setError(getApiError(err, 'Could not load reports.'));
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const summary = data?.summary || {};
  const payments = data?.payments || {};
  const courses = Array.isArray(data?.course_performance) ? data.course_performance : [];
  const activity = Array.isArray(data?.recent_activity) ? data.recent_activity : [];
  const quizSummary = data?.quiz_summary || null;

  const topCourse = courses.reduce((best, course) => {
    if (!best) return course;
    return Number(course.enrollment_count || 0) > Number(best.enrollment_count || 0) ? course : best;
  }, null);

  return (
    <main className="admin-page admin-reports-page">
      <div className="admin-page-toolbar"><PageBackLink to="/admin">Back to Admin Dashboard</PageBackLink></div>
      <section className="page-head admin-reports-head">
        <div>
          <p className="eyebrow">Real analytics</p>
          <h1>Reports & Analytics</h1>
          <p>Database-backed platform insights for users, courses, enrollments, manual payments, progress, and quizzes.</p>
        </div>
        <div className="admin-reports-highlight">
          <span>Top course</span>
          <strong>{topCourse?.title || 'No course data'}</strong>
          <p>{topCourse ? `${topCourse.enrollment_count || 0} active enrollments` : 'Enrollments will appear here once students have access.'}</p>
        </div>
      </section>

      <ErrorMessage message={error} />
      {loading ? <Loader label="Loading reports..." /> : null}

      {!loading && !error ? (
        <>
          <section className="stats-grid admin-reports-summary">
            <StatCard label="Users" value={summary.total_users ?? 0} helper={`${summary.total_students ?? 0} students, ${summary.total_admins ?? 0} admins`} />
            <StatCard label="Courses" value={summary.total_courses ?? 0} helper={summary.published_courses === null ? 'Publish status unavailable' : `${summary.published_courses ?? 0} published`} tone="green" />
            <StatCard label="Enrollments" value={summary.active_enrollments ?? 0} helper="Active course access" tone="navy" />
            <StatCard label="Pending Requests" value={summary.pending_payment_requests ?? 0} helper="Manual payment review queue" tone="amber" />
          </section>

          <section className="admin-report-grid">
            <article className="panel admin-report-card admin-payment-report">
              <div className="admin-section-head">
                <div>
                  <p className="eyebrow">Manual payment overview</p>
                  <h2>Payment Requests</h2>
                </div>
                <Badge tone="green">{money(payments.approved_manual_payment_amount_total)} approved</Badge>
              </div>
              <div className="admin-report-metrics">
                <div><span>Pending amount</span><strong>{money(payments.pending_manual_payment_amount_total)}</strong></div>
                <div><span>Rejected amount</span><strong>{money(payments.rejected_manual_payment_amount_total)}</strong></div>
                <div><span>Approved requests</span><strong>{summary.approved_payment_requests ?? 0}</strong></div>
                <div><span>Rejected requests</span><strong>{summary.rejected_payment_requests ?? 0}</strong></div>
              </div>
              <div className="admin-report-table-wrap">
                <table>
                  <thead><tr><th>Student</th><th>Course</th><th>Status</th><th>Amount</th><th>Created</th></tr></thead>
                  <tbody>
                    {(payments.recent_payment_requests || []).map((request) => (
                      <tr key={request.id}>
                        <td>{request.user_name || 'Student'}</td>
                        <td>{request.course_title || 'Course'}</td>
                        <td><Badge tone={request.status === 'approved' ? 'green' : request.status === 'rejected' ? 'amber' : 'blue'}>{request.status || 'pending'}</Badge></td>
                        <td>{money(request.amount)}</td>
                        <td>{formatDate(request.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="panel admin-report-card">
              <div className="admin-section-head">
                <div>
                  <p className="eyebrow">Quiz attempts</p>
                  <h2>Quiz Summary</h2>
                </div>
              </div>
              {quizSummary ? (
                <div className="admin-report-metrics compact">
                  <div><span>Total quizzes</span><strong>{quizSummary.total_quizzes}</strong></div>
                  <div><span>Attempts</span><strong>{quizSummary.quiz_attempts}</strong></div>
                  <div><span>Average score</span><strong>{quizSummary.average_score}</strong></div>
                  <div><span>Average percent</span><strong>{percent(quizSummary.average_score_percentage)}</strong></div>
                </div>
              ) : (
                <EmptyState title="Quiz analytics not available yet" message="Quiz results will appear once real quiz attempts exist." />
              )}
            </article>
          </section>

          <section className="panel admin-report-card">
            <div className="admin-section-head">
              <div>
                <p className="eyebrow">Course performance</p>
                <h2>Course Popularity & Completion</h2>
              </div>
            </div>
            {courses.length === 0 ? <EmptyState title="No course performance yet" message="Course analytics will appear when courses and enrollments exist." /> : (
              <div className="admin-course-performance-grid">
                {courses.map((course) => (
                  <article className="admin-course-performance-card" key={course.course_id}>
                    <img src={course.thumbnail_url || fallbackImage} alt="" onError={(event) => { event.currentTarget.src = fallbackImage; }} />
                    <div>
                      <div className="admin-course-performance-head">
                        <h3>{course.title || `Course ${course.course_id}`}</h3>
                        {course.is_published !== null ? <Badge tone={course.is_published ? 'green' : 'amber'}>{course.is_published ? 'Published' : 'Hidden'}</Badge> : null}
                      </div>
                      <dl className="admin-course-performance-meta">
                        <div><dt>Enrollments</dt><dd>{course.enrollment_count}</dd></div>
                        <div><dt>Completed</dt><dd>{course.completed_students_count}</dd></div>
                        <div><dt>Lessons</dt><dd>{course.total_lessons}</dd></div>
                        <div><dt>Approved requests</dt><dd>{course.approved_payment_requests_count}</dd></div>
                      </dl>
                      <div className="admin-report-bar">
                        <span><span style={{ width: percent(course.average_progress_percentage) }} /></span>
                        <strong>{percent(course.average_progress_percentage)} avg progress</strong>
                      </div>
                      <div className="admin-report-bar">
                        <span><span style={{ width: percent(course.completion_rate_percentage) }} /></span>
                        <strong>{percent(course.completion_rate_percentage)} completion rate</strong>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="panel admin-report-card">
            <div className="admin-section-head">
              <div>
                <p className="eyebrow">Recent activity</p>
                <h2>Latest Platform Signals</h2>
              </div>
            </div>
            {activity.length === 0 ? <EmptyState title="No recent activity" message="Payment, enrollment, and completion activity will appear here when available." /> : (
              <div className="admin-activity-list">
                {activity.map((item, index) => (
                  <article className="admin-activity-item" key={`${item.type}-${item.entity_id}-${index}`}>
                    <Badge tone={item.type === 'course_completed' ? 'green' : item.type === 'payment_request' ? 'blue' : 'navy'}>{item.type.replaceAll('_', ' ')}</Badge>
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.message}</p>
                    </div>
                    <span>{formatDate(item.created_at)}</span>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </main>
  );
};

export default AdminReportsPage;
