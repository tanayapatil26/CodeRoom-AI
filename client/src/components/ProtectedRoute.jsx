import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../store/auth';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="grid h-full place-items-center text-sm text-muted">Loading…</div>;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  return children;
}
