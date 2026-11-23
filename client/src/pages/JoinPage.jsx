import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';

export default function JoinPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    api('/rooms/join', { method: 'POST', body: { code } })
      .then(({ room }) => navigate(`/room/${room.id}`, { replace: true }))
      .catch((e) => setError(e.message));
  }, [code, navigate]);

  return (
    <div className="grid h-full place-items-center px-4 text-center">
      {error ? (
        <div>
          <p className="mb-3 text-danger">{error}</p>
          <Link className="btn-ghost" to="/dashboard">Back to dashboard</Link>
        </div>
      ) : (
        <p className="text-sm text-muted">Joining room…</p>
      )}
    </div>
  );
}
