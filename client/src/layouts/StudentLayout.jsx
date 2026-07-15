import { Link, NavLink, Outlet } from 'react-router-dom';
import Button from '../components/Button';
import NotificationBell from '../components/NotificationBell';
import { useAuth } from '../context/AuthContext';

const StudentLayout = () => {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/" aria-label="GATE home">
          <img src="/images/logo.jpeg" alt="GATE" />
        </Link>
        <nav className="topnav">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/learning">Courses</NavLink>
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/profile">Profile</NavLink>
          {user?.role === 'admin' ? <NavLink to="/admin">Admin</NavLink> : null}
        </nav>
        <div className="topbar-user">
          <NotificationBell compact />
          <span>{user?.name || 'Student'}</span>
          <Button variant="ghost" onClick={logout}>Logout</Button>
        </div>
      </header>
      <Outlet />
    </div>
  );
};

export default StudentLayout;
