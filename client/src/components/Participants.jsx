import { api } from '../lib/api';
import { toast } from '../store/toast';
import Avatar from './Avatar';

export default function Participants({ room, presence, myId, onChanged }) {
  const online = new Set(presence.map((p) => String(p.id)));
  const isHost = room.myRole === 'host';

  async function setRole(userId, role) {
    try { await api(`/rooms/${room.id}/participants/${userId}`, { method: 'PATCH', body: { role } }); onChanged(); }
    catch (e) { toast.error(e.message); }
  }
  async function remove(p) {
    if (!window.confirm(`Remove ${p.name} from this room?`)) return;
    try { await api(`/rooms/${room.id}/participants/${p.id}`, { method: 'DELETE' }); onChanged(); }
    catch (e) { toast.error(e.message); }
  }

  return (
    <div>
      <h2 className="mb-1 px-2 text-sm font-semibold">People ({room.participants.length})</h2>
      <ul>
        {room.participants.map((p) => {
          const isOn = online.has(String(p.id));
          return (
            <li key={p.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm">
              <span className="relative">
                <Avatar user={p} />
                <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${isOn ? 'bg-emerald-500' : 'bg-line'}`} title={isOn ? 'Online' : 'Offline'} />
              </span>
              <span className="min-w-0 flex-1 truncate">{p.name}{String(p.id) === String(myId) && ' (you)'}</span>
              {isHost && p.role !== 'host' ? (
                <>
                  <select aria-label={`Role for ${p.name}`} className="rounded border border-line bg-white px-1 py-0.5 text-xs" value={p.role} onChange={(e) => setRole(p.id, e.target.value)}>
                    <option value="collaborator">Collaborator</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button className="text-xs text-danger" onClick={() => remove(p)} aria-label={`Remove ${p.name}`}>Remove</button>
                </>
              ) : (
                <span className="text-xs capitalize text-muted">{p.role}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
