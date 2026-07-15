import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { getApiError } from '../api/client';
import Button from '../components/Button';
import ErrorMessage from '../components/ErrorMessage';
import Input from '../components/Input';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../layouts/AuthLayout';

const Register = () => {
  const { user, register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  if (user) return <Navigate to="/" replace />;

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(form);
      navigate('/', { replace: true });
    } catch (err) {
      setError(getApiError(err, 'Registration failed. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Create your GATE account" subtitle="Join a modern courses workspace built for structured corporate training.">
      <form className="auth-form" onSubmit={submit}>
        <ErrorMessage message={error} />
        <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <Input label="Password" type="password" minLength="6" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <p className="auth-note">After registration, you can log in and access your account once enrolled by the admin if required.</p>
        <Button type="submit" disabled={submitting}>{submitting ? 'Creating...' : 'Register'}</Button>
        <p className="muted">Already have an account? <Link to="/login">Login</Link></p>
      </form>
    </AuthLayout>
  );
};

export default Register;
