import { useEffect, useMemo, useState } from 'react';
import { getAdminProgress } from '../../api/adminApi';
import { getApiError } from '../../api/client';
import EmptyState from '../../components/EmptyState';
import ErrorMessage from '../../components/ErrorMessage';
import Loader from '../../components/Loader';
import PageBackLink from '../../components/PageBackLink';
import StatCard from '../../components/StatCard';

const valueFor = (row, keys, fallback = 'Not reported') => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return fallback;
};

const numberFor = (row, keys) => {
  const value = valueFor(row, keys, null);
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const percentFor = (row) => {
  const value = numberFor(row, ['progress_percentage', 'progress', 'percentage']);
  return value === null ? null : Math.max(0, Math.min(100, value));
};

const AdminProgressPage = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getAdminProgress();
        if (active) setRows(Array.isArray(data) ? data : []);
      } catch (err) {
        if (active) setError(getApiError(err, 'Could not load student progress.'));
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => {
    const students = new Set();
    const courses = new Set();
    let reportedProgress = 0;

    rows.forEach((row) => {
      const student = valueFor(row, ['student_name', 'name', 'student', 'email'], '');
      const course = valueFor(row, ['course_title', 'course', 'title'], '');
      if (student) students.add(student);
      if (course) courses.add(course);
      if (percentFor(row) !== null) reportedProgress += 1;
    });

    return {
      totalRows: rows.length,
      students: students.size,
      courses: courses.size,
      reportedProgress,
    };
  }, [rows]);

  return (
    <main className="admin-page admin-progress-page">
      <div className="admin-page-toolbar">
        <PageBackLink to="/admin">Back to Admin Dashboard</PageBackLink>
      </div>
      <section className="page-head">
        <div>
          <p className="eyebrow">Progress</p>
          <h1>Student Progress Monitoring</h1>
          <p>Review student course activity reported by the existing backend progress endpoint.</p>
        </div>
      </section>

      <ErrorMessage message={error} />
      {loading ? <Loader label="Loading student progress..." /> : null}

      {!loading && !error && rows.length === 0 ? (
        <EmptyState title="No progress records found" message="Student progress will appear here after enrollments and course activity are available." />
      ) : null}

      {!loading && rows.length > 0 ? (
        <>
          <section className="stats-grid admin-progress-summary">
            <StatCard label="Progress Records" value={summary.totalRows} helper="Rows returned by backend" />
            <StatCard label="Students" value={summary.students} helper="Unique reported students" tone="green" />
            <StatCard label="Courses" value={summary.courses} helper="Unique reported courses" tone="navy" />
            <StatCard label="Detailed Progress" value={summary.reportedProgress} helper="Rows with percentage data" tone="amber" />
          </section>

          <section className="table-card admin-progress-table">
            <h2>Progress Report</h2>
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Course</th>
                  <th>Progress</th>
                  <th>Completed</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const percent = percentFor(row);
                  const completed = valueFor(row, ['completed_lessons', 'completedLessons', 'completed'], 'Not reported');
                  const total = valueFor(row, ['total_lessons', 'totalLessons', 'total'], 'Not reported');
                  return (
                    <tr key={row?.id || `${valueFor(row, ['name', 'student_name', 'email'], 'row')}-${index}`}>
                      <td>{valueFor(row, ['student_name', 'name', 'student', 'email'])}</td>
                      <td>{valueFor(row, ['course_title', 'course', 'title'])}</td>
                      <td>
                        {percent === null ? (
                          'Not reported'
                        ) : (
                          <span className="admin-progress-meter">
                            <span><span style={{ width: `${percent}%` }} /></span>
                            <strong>{Math.round(percent)}%</strong>
                          </span>
                        )}
                      </td>
                      <td>{completed}</td>
                      <td>{total}</td>
                      <td>{valueFor(row, ['status', 'last_activity', 'lastActivity'], percent === null ? 'Summary only' : 'Reported')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </>
      ) : null}
    </main>
  );
};

export default AdminProgressPage;
