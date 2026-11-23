const BASE = import.meta.env.VITE_API_URL || '';

export const getToken = () => localStorage.getItem('token');

export async function api(path, { method = 'GET', body } = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event('auth:expired'));
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

// Streams an AI response (SSE over fetch). onChunk(text) is called as text arrives.
export async function streamAI(roomId, payload, onChunk, signal) {
  const res = await fetch(`${BASE}/api/rooms/${roomId}/ai`, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'AI request failed');
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 2);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') return;
      const msg = JSON.parse(data);
      if (msg.error) throw new Error(msg.error);
      if (msg.t) onChunk(msg.t);
    }
  }
}
