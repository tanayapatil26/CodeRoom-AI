import { useEffect } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useAuth } from './store/auth';
import ProtectedRoute from './components/ProtectedRoute';
import Toaster from './components/Toaster';
import { toast } from './store/toast';
import Landing from './pages/Landing';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import JoinPage from './pages/JoinPage';
import Room from './pages/Room';

export default function App() {
  const init = useAuth((s) => s.init);
  const clear = useAuth((s) => s.clear);
  const navigate = useNavigate();

  useEffect(() => { init(); }, [init]);
  useEffect(() => {
    const onExpired = () => { clear(); toast.error('Session expired. Sign in again.'); navigate('/login'); };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, [clear, navigate]);

  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/signup" element={<AuthPage mode="signup" />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/join/:code" element={<ProtectedRoute><JoinPage /></ProtectedRoute>} />
        <Route path="/room/:roomId" element={<ProtectedRoute><Room /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </>
  );
}
