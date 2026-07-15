import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import Button from '../components/Button';
import NotificationBell from '../components/NotificationBell';
import { useAuth } from '../context/AuthContext';
import { AdminLanguageProvider, useAdminLanguage } from '../context/AdminLanguageContext';

const navItems = [
  { key: 'dashboard', icon: '▦', to: '/admin', end: true },
  { key: 'courses', icon: '◇', to: '/admin/courses' },
  { key: 'categories', icon: '△', to: '/admin/categories' },
  { key: 'students', icon: '♚', to: '/admin/students' },
  { key: 'instructors', icon: '✣', to: '/admin/instructors' },
  { key: 'lectures', icon: '▣', to: '/admin/lectures' },
  { key: 'exams', icon: '?', to: '/admin/quizzes' },
  { key: 'payments', icon: '▤', to: '/admin/payment-requests' },
  { key: 'coupons', icon: '⌑', to: '/admin/coupons' },
  { key: 'notifications', icon: '◔', to: '/admin/notifications' },
  { key: 'reports', icon: '▥', to: '/admin/reports' },
  { key: 'security', icon: '◈', to: '/admin/security' },
  { key: 'settings', icon: '⚙', to: '/admin/settings' },
];

const AdminLayoutInner = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { language, setLanguage, direction, t } = useAdminLanguage();
  const [search, setSearch] = useState('');

  const submitSearch = (event) => {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/admin/courses?search=${encodeURIComponent(query)}` : '/admin/courses');
  };

  const userInitial = (user?.name || user?.email || 'A').slice(0, 1).toUpperCase();

  return (
    <div className="admin-shell" dir={direction} data-admin-lang={language}>
      <aside className="admin-sidebar">
        <div className="admin-brand-block">
          <Link className="admin-brand" to="/" aria-label="GATE home">
            <span className="admin-brand-mark">G</span>
          </Link>
          <div>
            <strong>{t.brandTitle}</strong>
            <span>{t.brandSubtitle}</span>
          </div>
        </div>

        <nav className="admin-nav" aria-label={t.brandTitle}>
          {navItems.map((item) => (
            <NavLink key={item.key} end={item.end} to={item.to}>
              <span className="admin-nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{t.nav[item.key]}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-cta">
          <small>{language === 'ar' ? 'محتوى جديد؟' : 'New content?'}</small>
          <Link className="btn btn-primary" to="/admin/courses">{t.addCourse}</Link>
        </div>
      </aside>

      <section className="admin-main">
        <header className="admin-header">
          <form className="admin-search" aria-label={t.searchPlaceholder} onSubmit={submitSearch}>
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder={t.searchPlaceholder}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </form>

          <div className="admin-header-actions">
            <div className="admin-language-switch" aria-label="Admin language">
              <button type="button" className={language === 'en' ? 'is-active' : ''} onClick={() => setLanguage('en')}>EN</button>
              <button type="button" className={language === 'ar' ? 'is-active' : ''} onClick={() => setLanguage('ar')}>AR</button>
            </div>
            <NotificationBell compact />
            <NavLink className="admin-icon-button" to="/admin/settings" aria-label={t.settings}>⚙</NavLink>
            <div className="admin-user-chip">
              <span>{userInitial}</span>
              <div>
                <strong>{user?.name || 'Admin'}</strong>
                <small>{user?.email || t.role}</small>
              </div>
            </div>
            <NavLink className="btn btn-ghost" to="/">{t.site}</NavLink>
            <Button variant="secondary" onClick={logout}>{t.logout}</Button>
          </div>
        </header>
        <Outlet />
      </section>
    </div>
  );
};

const AdminLayout = () => (
  <AdminLanguageProvider>
    <AdminLayoutInner />
  </AdminLanguageProvider>
);

export default AdminLayout;
