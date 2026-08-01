import { Link, NavLink, Outlet } from 'react-router-dom';
import Button from '../components/Button';
import NotificationBell from '../components/NotificationBell';
import { useAuth } from '../context/AuthContext';
import { useAppLanguage } from '../context/AppLanguageContext';

const StudentLayout = () => {
  const { user, logout } = useAuth();
  const { language, setLanguage, t, direction } = useAppLanguage();

  return (
    <div className="app-shell" dir={direction}>
      <header className="topbar">
        <Link className="brand" to="/" aria-label="GATE home">
          <img src="/images/logo.jpeg" alt="GATE" />
        </Link>
        <nav className="topnav">
          <NavLink to="/">{t.nav.home}</NavLink>
          <NavLink to="/learning">{t.nav.courses}</NavLink>
          <NavLink to="/dashboard">{t.nav.dashboard}</NavLink>
          <NavLink to="/profile">{t.nav.profile}</NavLink>
          {user?.role === 'admin' ? <NavLink to="/admin">{t.nav.admin}</NavLink> : null}
        </nav>
        <div className="topbar-user">
          <div className="public-language-switch" aria-label="Language switch">
            <button type="button" className={language === 'en' ? 'is-active' : ''} onClick={() => setLanguage('en')}>EN</button>
            <button type="button" className={language === 'ar' ? 'is-active' : ''} onClick={() => setLanguage('ar')}>AR</button>
          </div>
          <NotificationBell compact />
          <span>{user?.name || 'Student'}</span>
          <Button variant="ghost" onClick={logout}>{t.nav.logout}</Button>
        </div>
      </header>
      <Outlet />
    </div>
  );
};

export default StudentLayout;
