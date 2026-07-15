import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { changePassword } from '../api/authApi';
import { getApiError } from '../api/client';
import Badge from '../components/Badge';
import Button from '../components/Button';
import ErrorMessage from '../components/ErrorMessage';
import PageBackLink from '../components/PageBackLink';
import { useAuth } from '../context/AuthContext';

const emptyPasswordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };

const initialsFor = (name = 'User') => name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();

const formatDate = (value) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleDateString();
};

const validatePasswordForm = ({ currentPassword, newPassword, confirmPassword }) => {
  if (!currentPassword) return 'Current password is required.';
  if (newPassword.length < 8) return 'New password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(newPassword)) return 'New password must include at least one letter.';
  if (!/[0-9]/.test(newPassword)) return 'New password must include at least one number.';
  if (newPassword !== confirmPassword) return 'Confirm password must match the new password.';
  return '';
};

const PasswordField = ({ label, name, value, visible, onToggle, onChange }) => (
  <label className="field password-field">
    <span>{label}</span>
    <span className="password-input-wrap">
      <input name={name} type={visible ? 'text' : 'password'} value={value} onChange={onChange} autoComplete="new-password" />
      <button type="button" onClick={onToggle}>{visible ? 'Hide' : 'Show'}</button>
    </span>
  </label>
);

const Profile = () => {
  const { user, logout } = useAuth();
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [showPasswords, setShowPasswords] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  const dashboardPath = user?.role === 'admin' ? '/admin' : '/dashboard';
  const validationMessage = useMemo(() => (
    passwordForm.newPassword || passwordForm.confirmPassword || passwordForm.currentPassword
      ? validatePasswordForm(passwordForm)
      : ''
  ), [passwordForm]);

  const updatePasswordField = (event) => {
    setPasswordForm({ ...passwordForm, [event.target.name]: event.target.value });
    setPasswordError('');
    setPasswordMessage('');
  };

  const submitPassword = async (event) => {
    event.preventDefault();
    const validation = validatePasswordForm(passwordForm);
    if (validation) return setPasswordError(validation);

    setSavingPassword(true);
    setPasswordError('');
    setPasswordMessage('');
    try {
      await changePassword(passwordForm);
      setPasswordForm(emptyPasswordForm);
      setPasswordMessage('Password updated successfully.');
    } catch (err) {
      setPasswordError(getApiError(err, 'Could not update password.'));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <main className="page profile-page account-settings-page">
      <div className="student-page-toolbar">
        <PageBackLink to={dashboardPath}>{user?.role === 'admin' ? 'Back to Admin Dashboard' : 'Back to Dashboard'}</PageBackLink>
      </div>

      <section className="profile-card panel account-profile-card">
        <div className="profile-avatar">{initialsFor(user?.name)}</div>
        <div>
          <Badge tone={user?.role === 'admin' ? 'navy' : 'blue'}>{user?.role || 'student'}</Badge>
          <h1>{user?.name || 'Your account'}</h1>
          <p>{user?.email || 'Email not available'}</p>
        </div>
        <dl className="profile-list">
          <div><dt>Name</dt><dd>{user?.name || 'Not available'}</dd></div>
          <div><dt>Email</dt><dd>{user?.email || 'Not available'}</dd></div>
          <div><dt>Role</dt><dd>{user?.role || 'student'}</dd></div>
          <div><dt>Created</dt><dd>{formatDate(user?.created_at)}</dd></div>
          <div><dt>Updated</dt><dd>{formatDate(user?.updated_at)}</dd></div>
        </dl>
        <div className="form-actions">
          <Link className="btn btn-primary" to={dashboardPath}>{user?.role === 'admin' ? 'Admin Dashboard' : 'Dashboard'}</Link>
          <Button variant="danger" onClick={logout}>Logout</Button>
        </div>
      </section>

      <section className="profile-card panel account-security-card">
        <div className="account-section-head">
          <p className="eyebrow">Account security</p>
          <h2>Change Password</h2>
          <p>Use a strong password with at least one letter and one number.</p>
        </div>

        <form className="auth-form profile-password-form" onSubmit={submitPassword}>
          <ErrorMessage message={passwordError} />
          {passwordMessage ? <div className="notice notice-success">{passwordMessage}</div> : null}
          <PasswordField label="Current password" name="currentPassword" value={passwordForm.currentPassword} visible={showPasswords} onToggle={() => setShowPasswords((value) => !value)} onChange={updatePasswordField} />
          <PasswordField label="New password" name="newPassword" value={passwordForm.newPassword} visible={showPasswords} onToggle={() => setShowPasswords((value) => !value)} onChange={updatePasswordField} />
          <PasswordField label="Confirm new password" name="confirmPassword" value={passwordForm.confirmPassword} visible={showPasswords} onToggle={() => setShowPasswords((value) => !value)} onChange={updatePasswordField} />
          {validationMessage ? <p className="auth-note">{validationMessage}</p> : null}
          <Button type="submit" disabled={savingPassword || Boolean(validationMessage)}>
            {savingPassword ? 'Updating...' : 'Update Password'}
          </Button>
        </form>
      </section>
    </main>
  );
};

export default Profile;
