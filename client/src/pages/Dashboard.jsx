import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../store/auth';
import { toast } from '../store/toast';
import Avatar from '../components/Avatar';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api('/rooms').then((d) => setRooms(d.rooms)).catch((e) => toast.error(e.message));
  useEffect(() => { load(); }, []);

  async function create(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const { room } = await api('/rooms', { method: 'POST', body: { name } });
      navigate(`/room/${room.id}`);
    } catch (err) { toast.error(err.message); setBusy(false); }
  }
  async function join(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const { room } = await api('/rooms/join', { method: 'POST', body: { code } });
      navigate(`/room/${room.id}`);
    } catch (err) { toast.error(err.message); setBusy(false); }
  }
  async function del(r) {
    if (!window.confirm(`Delete "${r.name}" and all its files, chat and AI history? This can't be undone.`)) return;
    try { await api(`/rooms/${r.id}`, { method: 'DELETE' }); load(); } catch (err) { toast.error(err.message); }
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-6">
      <header className="mb-8 flex items-center justify-between">
        <Link to="/" className="text-lg font-bold">CodeRoom AI</Link>
        <div className="flex items-center gap-3 text-sm">
          <Avatar user={user} size={28} /> <span>{user.name}</span>
          <button className="btn-ghost btn-sm" onClick={logout}>Sign out</button>
        </div>
      </header>

      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <form onSubmit={create} className="rounded-lg border border-line bg-white p-4">
          <h2 className="mb-2 font-semibold">Create a room</h2>
          <div className="flex gap-2">
            <input className="input" placeholder="Room name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Room name" />
            <button className="btn-primary shrink-0" disabled={busy || name.trim().length < 2}>Create</button>
          </div>
        </form>
        <form onSubmit={join} className="rounded-lg border border-line bg-white p-4">
          <h2 className="mb-2 font-semibold">Join a room</h2>
          <div className="flex gap-2">
            <input className="input font-mono uppercase" placeholder="Room code" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Room code" maxLength={20} />
            <button className="btn-primary shrink-0" disabled={busy || code.trim().length < 4}>Join</button>
          </div>
        </form>
      </div>

      <h2 className="mb-2 font-semibold">Your rooms</h2>
      {rooms === null ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : rooms.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-6 text-sm text-muted">You are not in any rooms yet. Create one above, or join with a code a teammate sent you.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {rooms.map((r) => (
            <li key={r.id} className="flex items-center justify-between rounded-lg border border-line bg-white p-4">
              <div className="min-w-0">
                <Link to={`/room/${r.id}`} className="block truncate font-semibold hover:underline">{r.name}</Link>
                <p className="mt-1 text-xs text-muted">
                  <span className="rounded bg-cobalt-soft px-1.5 py-0.5 font-mono text-cobalt-dark">{r.code}</span>
                  {' '}{r.participantCount} people · {r.myRole}{r.locked ? ' · locked' : ''}
                </p>
              </div>
              {r.myRole === 'host' && <button className="btn-danger btn-sm" onClick={() => del(r)}>Delete</button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
