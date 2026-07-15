import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { getApiError } from '../api/client';
import Button from '../components/Button';
import ErrorMessage from '../components/ErrorMessage';
import Input from '../components/Input';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../layouts/AuthLayout';

const Login = () => {
  const { user, login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  if (user) return <Navigate to="/" replace />;

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(form);
      navigate('/', { replace: true });
    } catch (err) {
      setError(getApiError(err, 'Login failed. Please check your email and password.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Welcome back to GATE" subtitle="Sign in to continue professional training, video lessons, quizzes, and progress tracking.">
      <form className="auth-form" onSubmit={submit}>
        <ErrorMessage message={error} />
        <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <Input label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <Button type="submit" disabled={submitting}>{submitting ? 'Signing in...' : 'Login'}</Button>
        <p className="muted">No account yet? <Link to="/register">Create one</Link></p>
      </form>
    </AuthLayout>
  );
};

export default Login;
