import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/notificationsApi';
import { getApiError } from '../api/client';
import Button from './Button';
import { useAppLanguage } from '../context/AppLanguageContext';

const BellIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M12 3.5a4.5 4.5 0 0 0-4.5 4.5V10c0 1.2-.3 2.3-.8 3.3l-.7 1.2c-.4.7.1 1.5.9 1.5h10.2c.8 0 1.3-.8.9-1.5l-.7-1.2c-.5-1-.8-2.1-.8-3.3V8A4.5 4.5 0 0 0 12 3.5Z" />
    <path d="M9.5 17.5a2.5 2.5 0 0 0 5 0" />
  </svg>
);

const formatTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
};

const NotificationBell = ({ compact = false }) => {
  const wrapperRef = useRef(null);
  const { direction, t } = useAppLanguage();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const loadCount = async () => {
    try {
      const data = await getUnreadNotificationCount();
      setUnreadCount(Number(data?.count || 0));
    } catch {
      setUnreadCount(0);
    }
  };

  const loadNotifications = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getNotifications();
      setNotifications(Array.isArray(data) ? data : []);
      await loadCount();
    } catch (err) {
      setError(getApiError(err, 'Could not load notifications.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await getUnreadNotificationCount();
        if (active) setUnreadCount(Number(data?.count || 0));
      } catch {
        if (active) setUnreadCount(0);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const unreadNotifications = useMemo(() => notifications.filter((item) => !item.read_at), [notifications]);

  const toggleOpen = () => {
    setOpen((current) => {
      const next = !current;
      if (next) loadNotifications();
      return next;
    });
  };

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

  return (
    <div className={`notification-bell ${compact ? 'notification-bell-compact' : ''}`} dir={direction} ref={wrapperRef}>
      <button className="notification-trigger" type="button" onClick={toggleOpen} aria-label={t.notifications.title}>
        <span className="notification-trigger-icon" aria-hidden="true"><BellIcon /></span>
        {unreadCount > 0 ? <strong>{unreadCount > 9 ? '9+' : unreadCount}</strong> : null}
      </button>
      {open ? (
        <div className="notification-popover">
          <div className="notification-popover-head">
            <div>
              <p className="eyebrow">{t.notifications.title}</p>
              <h2>
                {unreadNotifications.length
                  ? `${unreadNotifications.length} ${t.notifications.unread}`
                  : t.notifications.allCaughtUp}
              </h2>
            </div>
            <Button variant="ghost" size="sm" disabled={busy === 'read-all' || unreadCount === 0} onClick={readAll}>
              {busy === 'read-all' ? t.notifications.saving : t.notifications.readAll}
            </Button>
          </div>

          {error ? <div className="notification-error">{error}</div> : null}
          {loading ? <div className="notification-empty">{t.notifications.loading}</div> : null}
          {!loading && notifications.length === 0 ? <div className="notification-empty">{t.notifications.empty}</div> : null}
          {!loading && notifications.length > 0 ? (
            <div className="notification-list">
              {notifications.map((notification) => (
                <article className={`notification-item ${notification.read_at ? '' : 'is-unread'}`} key={notification.id}>
                  <div>
                    <h3>{notification.title}</h3>
                    <p>{notification.message}</p>
                    <span>{formatTime(notification.created_at)}</span>
                  </div>
                  {!notification.read_at ? (
                    <button type="button" onClick={() => readOne(notification.id)} disabled={busy === `read-${notification.id}`}>
                      {busy === `read-${notification.id}` ? t.notifications.saving : t.notifications.read}
                    </button>
                  ) : null}
                </article>
              ))}
            </div>
          ) : null}
          <Link className="notification-page-link" to="/notifications" onClick={() => setOpen(false)}>
            {t.notifications.viewAll}
          </Link>
        </div>
      ) : null}
    </div>
  );
};

export default NotificationBell;
