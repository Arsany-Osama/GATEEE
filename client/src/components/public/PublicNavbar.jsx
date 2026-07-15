import { Link, useLocation } from 'react-router-dom';
import Button from '../Button';
import NotificationBell from '../NotificationBell';
import { useAuth } from '../../context/AuthContext';

const PublicNavbar = ({
  activePage = '',
  className = '',
  user = null,
  onLogout,
}) => {
  const { pathname } = useLocation();
  const auth = useAuth();
  const currentUser = user ?? auth?.user ?? null;
  const logout = onLogout ?? auth?.logout;
  const isAdmin = currentUser?.role === 'admin';
  const dashboardPath = isAdmin ? '/admin' : '/dashboard';
  const dashboardLabel = isAdmin ? 'Admin Dashboard' : 'Dashboard';
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
        <span className="brand-mark" aria-hidden="true">G</span>
        <span className="brand-name">GATE</span>
      </Link>
      <nav aria-label="Public navigation">
        <Link className={isHomeActive ? 'is-active' : ''} to="/">Home</Link>
        <Link className={`${isCoursesActive ? 'is-active ' : ''}has-dropdown`.trim()} to="/learning">Courses</Link>
        <Link to="/#features">Features</Link>
        <Link className="has-dropdown" to="/#why-gate">Why GATE</Link>
        {currentUser ? (
          <Link className={`nav-dashboard-link ${isDashboardActive ? 'is-active' : ''}`.trim()} to={dashboardPath}>
            {dashboardLabel}
          </Link>
        ) : null}
      </nav>
      <div className="home-nav-actions">
        {!currentUser ? (
          <>
            <Link className="home-login" to="/login">
              <span className="login-icon" aria-hidden="true" />
              Login
            </Link>
            <Link className="btn btn-primary home-nav-cta" to="/register">
              Register
              <span aria-hidden="true">-&gt;</span>
            </Link>
          </>
        ) : (
          <>
            <NotificationBell compact />
            <Link className="home-login" to="/profile">Profile</Link>
            {logout ? <Button variant="ghost" onClick={logout}>Logout</Button> : null}
          </>
        )}
      </div>
    </header>
  );
};

export default PublicNavbar;
