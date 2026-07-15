import { useEffect, useMemo, useState } from 'react';
import { getAdminCourses } from '../../api/adminApi';
import {
  activateUser,
  deactivateUser,
  enrollUserInCourse,
  getAdminUsers,
  getUserEnrollments,
  resetUserCourseProgress,
  unenrollUserFromCourse,
} from '../../api/adminUsersApi';
import { getApiError } from '../../api/client';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import ErrorMessage from '../../components/ErrorMessage';
import Input from '../../components/Input';
import Loader from '../../components/Loader';
import PageBackLink from '../../components/PageBackLink';
import StatCard from '../../components/StatCard';

const fallbackImage = '/images/cover of course.png';

const formatDate = (value) => {
  if (!value) return 'Not reported';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not reported' : date.toLocaleDateString();
};

const statusTone = (user) => {
  if (!user?.account_status_supported) return 'navy';
  return user.is_active ? 'green' : 'amber';
};

const statusLabel = (user) => {
  if (!user?.account_status_supported) return 'Not tracked';
  return user.is_active ? 'Active' : 'Disabled';
};

const StudentsPage = () => {
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [enrollCourseId, setEnrollCourseId] = useState('');
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [busyAction, setBusyAction] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadUsersAndCourses = async () => {
    setLoading(true);
    setError('');
    try {
      const [nextUsers, nextCourses] = await Promise.all([getAdminUsers(), getAdminCourses()]);
      setUsers(Array.isArray(nextUsers) ? nextUsers : []);
      setCourses(Array.isArray(nextCourses) ? nextCourses : []);
      setSelectedUserId((current) => current || String(nextUsers?.find((user) => user?.role !== 'admin')?.id || nextUsers?.[0]?.id || ''));
    } catch (err) {
      setError(getApiError(err, 'Could not load users.'));
    } finally {
      setLoading(false);
    }
  };

  const loadSelectedEnrollments = async (userId = selectedUserId) => {
    if (!userId) {
      setSelectedUser(null);
      setEnrollments([]);
      return;
    }

    setLoadingDetails(true);
    setError('');
    try {
      const data = await getUserEnrollments(userId);
      setSelectedUser(data?.user || null);
      setEnrollments(Array.isArray(data?.enrollments) ? data.enrollments : []);
    } catch (err) {
      setSelectedUser(null);
      setEnrollments([]);
      setError(getApiError(err, 'Could not load user enrollments.'));
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    let active = true;
    const loadInitial = async () => {
      setLoading(true);
      setError('');
      try {
        const [nextUsers, nextCourses] = await Promise.all([getAdminUsers(), getAdminCourses()]);
        if (!active) return;
        setUsers(Array.isArray(nextUsers) ? nextUsers : []);
        setCourses(Array.isArray(nextCourses) ? nextCourses : []);
        setSelectedUserId(String(nextUsers?.find((user) => user?.role !== 'admin')?.id || nextUsers?.[0]?.id || ''));
      } catch (err) {
        if (active) setError(getApiError(err, 'Could not load users.'));
      } finally {
        if (active) setLoading(false);
      }
    };
    loadInitial();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadDetails = async () => {
      if (!selectedUserId) {
        setSelectedUser(null);
        setEnrollments([]);
        return;
      }

      setLoadingDetails(true);
      setError('');
      try {
        const data = await getUserEnrollments(selectedUserId);
        if (!active) return;
        setSelectedUser(data?.user || null);
        setEnrollments(Array.isArray(data?.enrollments) ? data.enrollments : []);
      } catch (err) {
        if (!active) return;
        setSelectedUser(null);
        setEnrollments([]);
        setError(getApiError(err, 'Could not load user enrollments.'));
      } finally {
        if (active) setLoadingDetails(false);
      }
    };
    loadDetails();
    return () => {
      active = false;
    };
  }, [selectedUserId]);

  const selectedListUser = useMemo(() => {
    return users.find((user) => Number(user.id) === Number(selectedUserId)) || null;
  }, [selectedUserId, users]);

  const accountStatusSupported = users.some((user) => user.account_status_supported);

  const filteredUsers = useMemo(() => {
    const search = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch = !search || [user.id, user.name, user.email, user.role]
        .some((value) => String(value || '').toLowerCase().includes(search));
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'all'
        || !accountStatusSupported
        || (statusFilter === 'active' ? user.is_active : !user.is_active);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [accountStatusSupported, query, roleFilter, statusFilter, users]);

  const summary = useMemo(() => {
    const students = users.filter((user) => user.role !== 'admin').length;
    const active = accountStatusSupported ? users.filter((user) => user.is_active).length : users.length;
    const totalEnrollments = users.reduce((sum, user) => sum + Number(user.enrolled_courses_count || 0), 0);
    return { total: users.length, students, active, totalEnrollments };
  }, [accountStatusSupported, users]);

  const availableCourses = useMemo(() => {
    const enrolledCourseIds = new Set(enrollments.map((enrollment) => Number(enrollment.course_id)));
    return courses.filter((course) => !enrolledCourseIds.has(Number(course.id)));
  }, [courses, enrollments]);

  const selectUser = (userId) => {
    setSelectedUserId(String(userId));
    setEnrollCourseId('');
    setMessage('');
  };

  const enroll = async (event) => {
    event.preventDefault();
    if (!selectedUserId || !enrollCourseId) return;
    setBusyAction('enroll');
    setMessage('');
    setError('');
    try {
      const result = await enrollUserInCourse(selectedUserId, enrollCourseId);
      setMessage(result?.message || 'User enrolled successfully.');
      setEnrollCourseId('');
      await Promise.all([loadUsersAndCourses(), loadSelectedEnrollments(selectedUserId)]);
    } catch (err) {
      setError(getApiError(err, 'Could not enroll user.'));
    } finally {
      setBusyAction('');
    }
  };

  const unenroll = async (enrollment) => {
    if (!window.confirm(`Remove access to ${enrollment.course_title || 'this course'} for this user?`)) return;
    setBusyAction(`unenroll-${enrollment.id}`);
    setMessage('');
    setError('');
    try {
      const result = await unenrollUserFromCourse(enrollment.id);
      setMessage(result?.message || 'User unenrolled from course.');
      await Promise.all([loadUsersAndCourses(), loadSelectedEnrollments(selectedUserId)]);
    } catch (err) {
      setError(getApiError(err, 'Could not unenroll user.'));
    } finally {
      setBusyAction('');
    }
  };

  const resetProgress = async (enrollment) => {
    if (!window.confirm(`Reset progress for ${enrollment.course_title || 'this course'}?`)) return;
    setBusyAction(`reset-${enrollment.id}`);
    setMessage('');
    setError('');
    try {
      const result = await resetUserCourseProgress(selectedUserId, enrollment.course_id);
      setMessage(result?.message || 'User course progress reset.');
      await loadSelectedEnrollments(selectedUserId);
    } catch (err) {
      setError(getApiError(err, 'Could not reset progress.'));
    } finally {
      setBusyAction('');
    }
  };

  const toggleAccount = async (user) => {
    if (!user?.account_status_supported) return;
    const action = user.is_active ? 'deactivate' : 'activate';
    if (action === 'deactivate' && !window.confirm(`Deactivate ${user.name || user.email || 'this user'}?`)) return;
    setBusyAction(`${action}-${user.id}`);
    setMessage('');
    setError('');
    try {
      const result = user.is_active ? await deactivateUser(user.id) : await activateUser(user.id);
      setMessage(result?.message || `User ${action}d.`);
      await Promise.all([loadUsersAndCourses(), loadSelectedEnrollments(selectedUserId)]);
    } catch (err) {
      setError(getApiError(err, `Could not ${action} user.`));
    } finally {
      setBusyAction('');
    }
  };

  return (
    <main className="admin-page admin-users-page">
      <div className="admin-page-toolbar"><PageBackLink to="/admin">Back to Admin Dashboard</PageBackLink></div>
      <section className="page-head admin-users-head">
        <div>
          <p className="eyebrow">People</p>
          <h1>Students & Users</h1>
          <p>Manage real database users, course access, enrollments, progress resets, and account status.</p>
        </div>
      </section>

      <ErrorMessage message={error} />
      {message ? <div className="notice notice-success">{message}</div> : null}
      {loading ? <Loader label="Loading users..." /> : null}

      {!loading ? (
        <>
          <section className="stats-grid admin-users-summary">
            <StatCard label="Total Users" value={summary.total} helper="All database accounts" />
            <StatCard label="Students" value={summary.students} helper="Non-admin accounts" tone="green" />
            <StatCard label={accountStatusSupported ? 'Active Users' : 'Status Fallback'} value={summary.active} helper={accountStatusSupported ? 'Able to log in' : 'Migration not applied'} tone="navy" />
            <StatCard label="Enrollments" value={summary.totalEnrollments} helper="Current open courses" tone="amber" />
          </section>

          <section className="panel admin-users-filter-panel">
            <Input label="Search users" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, email, role, or ID" />
            <label className="field">
              <span>Role</span>
              <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
                <option value="all">All roles</option>
                <option value="student">Students</option>
                <option value="admin">Admins</option>
              </select>
            </label>
            <label className="field">
              <span>Status</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} disabled={!accountStatusSupported}>
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>
            </label>
          </section>

          <section className="admin-users-layout">
            <article className="panel admin-users-list-card">
              <div className="admin-section-head">
                <div>
                  <p className="eyebrow">User directory</p>
                  <h2>Users</h2>
                </div>
                <Button variant="secondary" onClick={loadUsersAndCourses}>Refresh</Button>
              </div>

              {filteredUsers.length === 0 ? <EmptyState title="No users found" message="Try a different search or filter." /> : (
                <div className="admin-users-table-wrap">
                  <table className="admin-users-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Courses</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr className={Number(user.id) === Number(selectedUserId) ? 'is-selected' : ''} key={user.id}>
                          <td>#{user.id}</td>
                          <td>{user.name || 'Unnamed user'}</td>
                          <td>{user.email || 'No email'}</td>
                          <td><Badge tone={user.role === 'admin' ? 'amber' : 'blue'}>{user.role || 'student'}</Badge></td>
                          <td><Badge tone={statusTone(user)}>{statusLabel(user)}</Badge></td>
                          <td>{user.enrolled_courses_count || 0}</td>
                          <td>{formatDate(user.created_at)}</td>
                          <td>
                            <div className="table-actions">
                              <Button variant="ghost" onClick={() => selectUser(user.id)}>View</Button>
                              {user.account_status_supported ? (
                                <Button
                                  variant={user.is_active ? 'danger' : 'secondary'}
                                  disabled={Boolean(busyAction)}
                                  onClick={() => toggleAccount(user)}
                                >
                                  {busyAction.endsWith(`-${user.id}`) ? 'Saving...' : user.is_active ? 'Deactivate' : 'Activate'}
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>

            <aside className="panel admin-user-detail-card">
              <div className="admin-section-head">
                <div>
                  <p className="eyebrow">Selected user</p>
                  <h2>{selectedUser?.name || selectedListUser?.name || 'Select a user'}</h2>
                  <p>{selectedUser?.email || selectedListUser?.email || 'Choose a user to view enrollments.'}</p>
                </div>
                {selectedListUser ? <Badge tone={statusTone(selectedListUser)}>{statusLabel(selectedListUser)}</Badge> : null}
              </div>

              {loadingDetails ? <Loader label="Loading user enrollments..." /> : null}

              {selectedUserId && !loadingDetails ? (
                <>
                  <form className="admin-user-enroll-form" onSubmit={enroll}>
                    <label className="field">
                      <span>Open course for user</span>
                      <select value={enrollCourseId} onChange={(event) => setEnrollCourseId(event.target.value)}>
                        <option value="">Select available course</option>
                        {availableCourses.map((course) => (
                          <option key={course.id} value={course.id}>{course.title || `Course ${course.id}`}</option>
                        ))}
                      </select>
                    </label>
                    <Button type="submit" disabled={busyAction === 'enroll' || !enrollCourseId}>
                      {busyAction === 'enroll' ? 'Opening...' : 'Enroll / Open Course'}
                    </Button>
                  </form>

                  <div className="admin-user-enrollments">
                    {enrollments.length === 0 ? (
                      <EmptyState title="No open courses" message="This user does not currently have active course access." />
                    ) : enrollments.map((enrollment) => (
                      <article className="admin-user-enrollment-card" key={enrollment.id}>
                        <img
                          src={enrollment.course_thumbnail_url || fallbackImage}
                          alt=""
                          onError={(event) => { event.currentTarget.src = fallbackImage; }}
                        />
                        <div>
                          <Badge tone="green">{enrollment.status || 'active'}</Badge>
                          <h3>{enrollment.course_title || `Course ${enrollment.course_id}`}</h3>
                          <p>Enrolled {formatDate(enrollment.enrolled_at)}</p>
                          <div className="admin-user-progress">
                            <span><span style={{ width: `${Math.max(0, Math.min(100, Number(enrollment.progress_percentage || 0)))}%` }} /></span>
                            <strong>{Number(enrollment.progress_percentage || 0)}%</strong>
                          </div>
                          <p>{enrollment.completed_lessons || 0} of {enrollment.total_lessons || 0} lessons complete</p>
                          <div className="table-actions">
                            <Button variant="ghost" disabled={Boolean(busyAction)} onClick={() => resetProgress(enrollment)}>
                              {busyAction === `reset-${enrollment.id}` ? 'Resetting...' : 'Reset Progress'}
                            </Button>
                            <Button variant="danger" disabled={Boolean(busyAction)} onClick={() => unenroll(enrollment)}>
                              {busyAction === `unenroll-${enrollment.id}` ? 'Removing...' : 'Unenroll'}
                            </Button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              ) : null}
            </aside>
          </section>
        </>
      ) : null}
    </main>
  );
};

export default StudentsPage;
