import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';

export default function AuthPage({ mode }) {
  const isSignup = mode === 'signup';
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isSignup) await signup(form.name, form.email, form.password);
      else await login(form.email, form.password);
      navigate(loc.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-full place-items-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-lg border border-line bg-white p-6" noValidate>
        <h1 className="mb-4 text-2xl font-bold">{isSignup ? 'Create your account' : 'Sign in'}</h1>
        {isSignup && (
          <div className="mb-3">
            <label className="label" htmlFor="name">Name</label>
            <input id="name" className="input" value={form.name} onChange={set('name')} autoComplete="name" required />
          </div>
        )}
        <div className="mb-3">
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" className="input" value={form.email} onChange={set('email')} autoComplete="email" required />
        </div>
        <div className="mb-4">
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" className="input" value={form.password} onChange={set('password')} autoComplete={isSignup ? 'new-password' : 'current-password'} required />
          {isSignup && <p className="mt-1 text-xs text-muted">At least 8 characters.</p>}
        </div>
        {error && <p role="alert" className="mb-3 text-sm text-danger">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}</button>
        <p className="mt-4 text-center text-sm text-muted">
          {isSignup ? 'Already have an account? ' : 'New here? '}
          <Link className="text-cobalt underline" to={isSignup ? '/login' : '/signup'}>{isSignup ? 'Sign in' : 'Create an account'}</Link>
        </p>
      </form>
    </div>
  );
}
