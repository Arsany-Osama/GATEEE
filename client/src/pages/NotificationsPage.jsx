import { useEffect, useMemo, useState } from 'react';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/notificationsApi';
import { getApiError } from '../api/client';
import Badge from '../components/Badge';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import Loader from '../components/Loader';
import PageBackLink from '../components/PageBackLink';
import { useAuth } from '../context/AuthContext';

const formatTime = (value) => {
  if (!value) return 'Not reported';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not reported' : date.toLocaleString();
};

const NotificationsPage = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const loadNotifications = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getNotifications();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(getApiError(err, 'Could not load notifications.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getNotifications();
        if (active) setNotifications(Array.isArray(data) ? data : []);
      } catch (err) {
        if (active) setError(getApiError(err, 'Could not load notifications.'));
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const unreadCount = useMemo(() => notifications.filter((item) => !item.read_at).length, [notifications]);

  const readOne = async (id) => {
    setBusy(`read-${id}`);
    setError('');
    try {
      await markNotificationRead(id);
      await loadNotifications();
    } catch (err) {
      setError(getApiError(err, 'Could not mark notification as read.'));
    } finally {
      setBusy('');
    }
  };

  const readAll = async () => {
    setBusy('read-all');
    setError('');
    try {
      await markAllNotificationsRead();
      await loadNotifications();
    } catch (err) {
      setError(getApiError(err, 'Could not mark notifications as read.'));
    } finally {
      setBusy('');
    }
  };

  const backTo = user?.role === 'admin' ? '/admin' : '/dashboard';
  const backLabel = user?.role === 'admin' ? 'Back to Admin Dashboard' : 'Back to Dashboard';

  return (
    <main className="dashboard-page notifications-page">
      <div className="page-toolbar"><PageBackLink to={backTo}>{backLabel}</PageBackLink></div>
      <section className="dashboard-hero notifications-hero">
        <div>
          <p className="eyebrow">Notification center</p>
          <h1>Notifications</h1>
          <p>Review platform updates, payment decisions, course activity, and admin messages.</p>
        </div>
        <div className="notifications-hero-status">
          <span>Unread</span>
          <strong>{unreadCount}</strong>
        </div>
      </section>

      <ErrorMessage message={error} />
      {loading ? <Loader label="Loading notifications..." /> : null}

      {!loading ? (
        <section className="panel notifications-panel">
          <div className="notifications-page-head">
            <div>
              <p className="eyebrow">Inbox</p>
              <h2>{notifications.length ? `${notifications.length} recent notifications` : 'No notifications'}</h2>
            </div>
            <Button variant="secondary" disabled={busy === 'read-all' || unreadCount === 0} onClick={readAll}>
              {busy === 'read-all' ? 'Saving...' : 'Mark all read'}
            </Button>
          </div>

          {notifications.length === 0 ? (
            <EmptyState title="No notifications yet" message="Updates will appear here when course, payment, and admin activity happens." />
          ) : (
            <div className="notifications-page-list">
              {notifications.map((notification) => (
                <article className={`notifications-page-item ${notification.read_at ? '' : 'is-unread'}`} key={notification.id}>
                  <div>
                    <Badge tone={notification.read_at ? 'navy' : 'blue'}>{notification.read_at ? 'read' : 'unread'}</Badge>
                    <h3>{notification.title}</h3>
                    <p>{notification.message}</p>
                    <span>{formatTime(notification.created_at)}</span>
                  </div>
                  {!notification.read_at ? (
                    <Button variant="ghost" disabled={busy === `read-${notification.id}`} onClick={() => readOne(notification.id)}>
                      {busy === `read-${notification.id}` ? 'Saving...' : 'Mark read'}
                    </Button>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </main>
  );
};

export default NotificationsPage;
