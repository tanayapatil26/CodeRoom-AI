import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { toast } from '../store/toast';
import Avatar from './Avatar';

const time = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function ChatPanel({ roomId, socket, me, getSnippet }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState({});
  const [sending, setSending] = useState(false);
  const bottom = useRef(null);
  const typingTimer = useRef(null);

  useEffect(() => {
    api(`/rooms/${roomId}/messages`).then((d) => setMessages(d.messages)).catch((e) => toast.error(e.message));
  }, [roomId]);

  useEffect(() => {
    const onMsg = (m) => setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
    const onTyping = ({ user, isTyping }) =>
      setTyping((t) => { const n = { ...t }; if (isTyping) n[user.id] = user.name; else delete n[user.id]; return n; });
    socket.on('chat:message', onMsg);
    socket.on('typing', onTyping);
    return () => { socket.off('chat:message', onMsg); socket.off('typing', onTyping); };
  }, [socket]);

  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }); }, [messages]);

  function onChange(e) {
    setText(e.target.value);
    socket.emit('typing', { isTyping: true });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socket.emit('typing', { isTyping: false }), 1500);
  }

  function send(snippet) {
    if (sending || (!text.trim() && !snippet)) return;
    setSending(true);
    socket.emit('chat:send', { roomId, text, snippet }, (res) => {
      setSending(false);
      if (res?.error) return toast.error(res.error);
      setText('');
      socket.emit('typing', { isTyping: false });
    });
  }

  const typers = Object.values(typing);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {messages.length === 0 && <p className="text-sm text-muted">No messages yet. Say hi, or share a snippet from the editor.</p>}
        {messages.map((m) => {
          const mine = String(m.user.id) === String(me.id);
          return (
            <div key={m.id} className="flex gap-2">
              <Avatar user={m.user} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2 text-xs text-muted">
                  <span className="font-medium text-ink">{mine ? 'You' : m.user.name}</span>
                  <span>{time(m.createdAt)}</span>
                  {mine && <span title="Delivered to the room">Delivered</span>}
                </div>
                {m.text && <p className="whitespace-pre-wrap break-words text-sm">{m.text}</p>}
                {m.snippet?.code && (
                  <pre className="mt-1 overflow-x-auto rounded-md border border-line bg-mist p-2 font-mono text-xs">{m.snippet.code}</pre>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      <div className="h-5 px-3 text-xs text-muted" aria-live="polite">
        {typers.length > 0 && `${typers.join(', ')} ${typers.length > 1 ? 'are' : 'is'} typing…`}
      </div>
      <form className="flex gap-2 border-t border-line p-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input className="input" value={text} onChange={onChange} maxLength={2000} placeholder="Message the room" aria-label="Message" />
        <button type="button" className="btn-ghost btn-sm shrink-0" title="Send the code selected in the editor" onClick={() => { const s = getSnippet(); if (s) send(s); else toast.info('Open a file first'); }}>
          Share code
        </button>
        <button className="btn-primary btn-sm shrink-0" disabled={sending || !text.trim()}>Send</button>
      </form>
    </div>
  );
}
