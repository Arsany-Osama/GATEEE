import { Link, useLocation } from 'react-router-dom';
import Button from '../Button';
import NotificationBell from '../NotificationBell';
import { useAuth } from '../../context/AuthContext';
import { useAppLanguage } from '../../context/AppLanguageContext';

const PublicNavbar = ({
  activePage = '',
  className = '',
  user = null,
  onLogout,
}) => {
  const { pathname } = useLocation();
  const auth = useAuth();
  const { language, setLanguage, t } = useAppLanguage();
  const currentUser = user ?? auth?.user ?? null;
  const logout = onLogout ?? auth?.logout;
  const isAdmin = currentUser?.role === 'admin';
  const dashboardPath = isAdmin ? '/admin' : '/dashboard';
  const dashboardLabel = isAdmin ? t.nav.admin : t.nav.dashboard;
  const currentPage = pathname === '/learning' ? 'learning' : activePage;
  const isHomeActive = pathname === '/' && currentPage === 'home';
  const isCoursesActive = pathname === '/learning' || currentPage === 'learning';
  const isDashboardActive = currentUser && (
    pathname === dashboardPath ||
    (isAdmin ? pathname.startsWith('/admin') : pathname.startsWith('/dashboard'))
  );

  return (
    <header className={`home-nav public-navbar ${className}`.trim()}>
      <Link className="home-brand" to="/" aria-label="GATE home">
        <img className="brand-logo" src="/images/logo.png" alt="" aria-hidden="true" />
      </Link>
      <nav aria-label="Public navigation">
        <Link className={isHomeActive ? 'is-active' : ''} to="/">{t.nav.home}</Link>
        <Link className={`${isCoursesActive ? 'is-active ' : ''}has-dropdown`.trim()} to="/learning">{t.nav.courses}</Link>
        <Link to="/#features">{t.nav.features}</Link>
        <Link className="has-dropdown" to="/#why-gate">{t.nav.whyGate}</Link>
        {currentUser ? (
          <Link className={`nav-dashboard-link ${isDashboardActive ? 'is-active' : ''}`.trim()} to={dashboardPath}>
            {dashboardLabel}
          </Link>
        ) : null}
      </nav>
      <div className="home-nav-actions">
        <div className="public-language-switch" aria-label="Language switch">
          <button type="button" className={language === 'en' ? 'is-active' : ''} onClick={() => setLanguage('en')}>EN</button>
          <button type="button" className={language === 'ar' ? 'is-active' : ''} onClick={() => setLanguage('ar')}>AR</button>
        </div>
        {!currentUser ? (
          <>
            <Link className="home-login" to="/login">
              <span className="login-icon" aria-hidden="true" />
              {t.nav.login}
            </Link>
            <Link className="btn btn-primary home-nav-cta" to="/register">
              {t.nav.register}
              <span aria-hidden="true">-&gt;</span>
            </Link>
          </>
        ) : (
          <>
            <NotificationBell compact />
            <Link className="home-login" to="/profile">{t.nav.profile}</Link>
            {logout ? <Button variant="ghost" onClick={logout}>{t.nav.logout}</Button> : null}
          </>
        )}
      </div>
    </header>
  );
};

export default PublicNavbar;
