// Tracks open Yjs WebSocket connections so role changes, removals and ended sessions
// take effect immediately instead of waiting for the client to reconnect.
const conns = new Map(); // `${roomId}:${userId}` -> Set<WebSocket>

const key = (roomId, userId) => `${roomId}:${userId}`;

function register(roomId, userId, ws) {
  const k = key(roomId, userId);
  if (!conns.has(k)) conns.set(k, new Set());
  conns.get(k).add(ws);
  ws.on('close', () => {
    const set = conns.get(k);
    if (!set) return;
    set.delete(ws);
    if (set.size === 0) conns.delete(k);
  });
}

// Closing forces the client to reconnect; the upgrade handler then re-checks membership and role
// (removed users are rejected, viewers get a read-only connection).
function closeUser(roomId, userId, reason = 'Access changed') {
  const set = conns.get(key(roomId, userId));
  if (set) for (const ws of [...set]) ws.close(4001, reason);
}

function closeRoom(roomId, reason = 'Session ended') {
  const prefix = `${roomId}:`;
  for (const [k, set] of conns) {
    if (k.startsWith(prefix)) for (const ws of [...set]) ws.close(4001, reason);
  }
}

module.exports = { register, closeUser, closeRoom };
