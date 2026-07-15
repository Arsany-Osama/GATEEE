import { useEffect, useMemo, useState } from 'react';
import {
  adminSendNotification,
  getAdminNotificationTargetOptions,
} from '../../api/notificationsApi';
import { getApiError } from '../../api/client';
import Button from '../../components/Button';
import ErrorMessage from '../../components/ErrorMessage';
import Loader from '../../components/Loader';
import PageBackLink from '../../components/PageBackLink';

const initialForm = {
  target_type: 'user',
  user_id: '',
  course_id: '',
  title: '',
  message: '',
};

const AdminNotificationsPage = () => {
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getAdminNotificationTargetOptions();
        if (!active) return;
        const nextUsers = Array.isArray(data?.users) ? data.users : [];
        const nextCourses = Array.isArray(data?.courses) ? data.courses : [];
        setUsers(nextUsers);
        setCourses(nextCourses);
        setForm((current) => ({
          ...current,
          user_id: current.user_id || String(nextUsers.find((user) => user.role !== 'admin')?.id || nextUsers[0]?.id || ''),
          course_id: current.course_id || String(nextCourses[0]?.id || ''),
        }));
      } catch (err) {
        if (active) setError(getApiError(err, 'Could not load notification targets.'));
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const targetHelp = useMemo(() => {
    if (form.target_type === 'all_students') return 'Sends one in-app notification to every student account.';
    if (form.target_type === 'course_students') return 'Sends to active, enrolled students in the selected course.';
    return 'Sends one direct notification to the selected user.';
  }, [form.target_type]);

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage('');
  };

  const send = async (event) => {
    event.preventDefault();
    setSending(true);
    setMessage('');
    setError('');
    try {
      const result = await adminSendNotification(form);
      setMessage(result?.message || 'Notification sent.');
      setForm((current) => ({ ...initialForm, user_id: current.user_id, course_id: current.course_id }));
    } catch (err) {
      setError(getApiError(err, 'Could not send notification.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="admin-page admin-notifications-page">
      <div className="admin-page-toolbar"><PageBackLink to="/admin">Back to Admin Dashboard</PageBackLink></div>
      <section className="page-head admin-notifications-head">
        <div>
          <p className="eyebrow">In-app notifications</p>
          <h1>Notifications</h1>
          <p>Send real platform notifications to a user, all students, or enrolled course students.</p>
        </div>
      </section>

      <ErrorMessage message={error} />
      {message ? <div className="notice notice-success">{message}</div> : null}
      {loading ? <Loader label="Loading notification targets..." /> : null}

      {!loading ? (
        <section className="panel admin-notification-sender">
          <div className="admin-section-head">
            <div>
              <p className="eyebrow">Manual send</p>
              <h2>Compose Notification</h2>
              <p>{targetHelp}</p>
            </div>
          </div>

          <form className="admin-notification-form" onSubmit={send}>
            <label className="field">
              <span>Target</span>
              <select value={form.target_type} onChange={(event) => update('target_type', event.target.value)}>
                <option value="user">Specific user</option>
                <option value="all_students">All students</option>
                <option value="course_students">Students enrolled in course</option>
              </select>
            </label>

            {form.target_type === 'user' ? (
              <label className="field">
                <span>User</span>
                <select value={form.user_id} onChange={(event) => update('user_id', event.target.value)}>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>{user.name || user.email || `User ${user.id}`} ({user.role})</option>
                  ))}
                </select>
              </label>
            ) : null}

            {form.target_type === 'course_students' ? (
              <label className="field">
                <span>Course</span>
                <select value={form.course_id} onChange={(event) => update('course_id', event.target.value)}>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>{course.title || `Course ${course.id}`}</option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="field">
              <span>Title</span>
              <input value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="Notification title" required />
            </label>

            <label className="field admin-notification-message">
              <span>Message</span>
              <textarea value={form.message} onChange={(event) => update('message', event.target.value)} placeholder="Write a clear in-app message" required />
            </label>

            <Button type="submit" disabled={sending}>
              {sending ? 'Sending...' : 'Send Notification'}
            </Button>
          </form>
        </section>
      ) : null}
    </main>
  );
};

export default AdminNotificationsPage;
