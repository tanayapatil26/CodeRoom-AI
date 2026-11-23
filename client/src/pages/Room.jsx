import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { connectSocket } from '../lib/socket';
import { useAuth } from '../store/auth';
import { toast } from '../store/toast';
import { useRoomDocs } from '../hooks/useRoomDocs';
import CodeEditor from '../components/CodeEditor';
import FileTree from '../components/FileTree';
import Participants from '../components/Participants';
import ChatPanel from '../components/ChatPanel';
import AIPanel from '../components/AIPanel';
import Preview from '../components/Preview';
import Avatar from '../components/Avatar';

export default function Room() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [files, setFiles] = useState([]);
  const [presence, setPresence] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [socket, setSocket] = useState(null);
  const [pane, setPane] = useState('editor'); // files | editor | chat | ai (mobile); chat | ai also pick the right tab on desktop
  const [showRun, setShowRun] = useState(false);
  const editorRef = useRef(null);

  const docs = useRoomDocs(files, user);

  const loadRoom = useCallback(
    () => api(`/rooms/${roomId}`).then((d) => setRoom(d.room)).catch((e) => { toast.error(e.message); navigate('/dashboard'); }),
    [roomId, navigate]
  );
  const loadFiles = useCallback(
    () => api(`/rooms/${roomId}/files`).then((d) => setFiles(d.files)).catch((e) => toast.error(e.message)),
    [roomId]
  );

  useEffect(() => { loadRoom(); loadFiles(); }, [loadRoom, loadFiles]);

  // Socket lifecycle
  useEffect(() => {
    const s = connectSocket(localStorage.getItem('token'));
    const join = () => s.emit('room:join', { roomId }, (res) => res?.error && toast.error(res.error));
    s.on('connect', join);
    s.on('presence:update', setPresence);
    s.on('room:updated', loadRoom);
    s.on('files:changed', loadFiles);
    s.on('notify', (n) => toast.info(n.text));
    s.on('room:removed', () => { toast.error('You were removed from this room'); navigate('/dashboard'); });
    s.on('room:ended', () => { toast.info('The host ended this session'); navigate('/dashboard'); });
    s.on('connect_error', (e) => e.message === 'unauthorized' && window.dispatchEvent(new Event('auth:expired')));
    setSocket(s);
    return () => { s.disconnect(); setSocket(null); };
  }, [roomId, loadRoom, loadFiles, navigate]);

  // Pick a file to show
  useEffect(() => {
    if (!files.some((f) => f.id === activeId)) {
      setActiveId(files.find((f) => f.type === 'file')?.id ?? null);
    }
  }, [files, activeId]);

  useEffect(() => { socket?.emit('file:active', { fileId: activeId }); }, [socket, activeId]);

  const activeFile = files.find((f) => f.id === activeId);
  const doc = activeId ? docs.get(activeId) : null;
  const canEdit = room && room.myRole !== 'viewer';

  const getContext = () => {
    const ed = editorRef.current;
    if (!ed || !activeFile) return null;
    const sel = ed.getSelection();
    const selected = sel && !sel.isEmpty() ? ed.getModel().getValueInRange(sel) : '';
    return { fileName: activeFile.name, language: activeFile.language, selectedCode: selected || undefined, fileContent: ed.getValue() };
  };
  const getSnippet = () => {
    const c = getContext();
    return c ? { language: c.language, code: (c.selectedCode || c.fileContent).slice(0, 8000) } : null;
  };
  const insertCode = (text) => {
    const ed = editorRef.current;
    if (!ed) return toast.info('Open a file first');
    const s = ed.getSelection();
    ed.executeEdits('ai', [{ range: { startLineNumber: s.startLineNumber, startColumn: s.startColumn, endLineNumber: s.startLineNumber, endColumn: s.startColumn }, text, forceMoveMarkers: true }]);
  };
  const replaceSelection = (text) => {
    const ed = editorRef.current;
    const s = ed?.getSelection();
    if (!s || s.isEmpty()) return toast.info('Select the code to replace first');
    ed.executeEdits('ai', [{ range: s, text, forceMoveMarkers: true }]);
  };

  const patchSettings = (body) =>
    api(`/rooms/${roomId}/settings`, { method: 'PATCH', body }).then((d) => setRoom(d.room)).catch((e) => toast.error(e.message));
  const copy = (text, label) => navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`));
  async function leave() {
    try { await api(`/rooms/${roomId}/leave`, { method: 'POST' }); navigate('/dashboard'); } catch (e) { toast.error(e.message); }
  }
  async function endSession() {
    if (!window.confirm('End this session for everyone? Files are kept, but nobody can open the room again.')) return;
    try { await api(`/rooms/${roomId}/end`, { method: 'POST' }); } catch (e) { toast.error(e.message); }
  }

  if (!room) return <div className="grid h-full place-items-center text-sm text-muted">Loading room…</div>;

  const rightTab = pane === 'ai' ? 'ai' : 'chat';
  const show = (name) => (pane === name ? 'flex' : 'hidden');

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center gap-2 border-b border-line bg-white px-3 py-2">
        <Link to="/dashboard" className="text-sm font-bold">CodeRoom</Link>
        <span className="truncate font-semibold">{room.name}</span>
        <button className="rounded bg-cobalt-soft px-2 py-0.5 font-mono text-xs text-cobalt-dark" onClick={() => copy(room.code, 'Room code')} title="Copy room code">{room.code}</button>
        <button className="btn-ghost btn-sm" onClick={() => copy(`${location.origin}/join/${room.code}`, 'Invite link')}>Copy invite link</button>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden -space-x-1 sm:flex">{presence.slice(0, 5).map((p) => <Avatar key={p.id} user={p} />)}</div>
          <button className="btn-ghost btn-sm" onClick={() => setShowRun((v) => !v)}>{showRun ? 'Hide preview' : 'Preview'}</button>
          {room.myRole === 'host' ? (
            <>
              <button className="btn-ghost btn-sm" onClick={() => patchSettings({ locked: !room.settings.locked })}>{room.settings.locked ? 'Unlock room' : 'Lock room'}</button>
              <button className="btn-danger btn-sm" onClick={endSession}>End session</button>
            </>
          ) : (
            <button className="btn-ghost btn-sm" onClick={leave}>Leave</button>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className={`${show('files')} w-full shrink-0 flex-col gap-4 overflow-y-auto border-r border-line bg-white p-2 md:flex md:w-64`}>
          <FileTree roomId={roomId} files={files} activeId={activeId} canEdit={canEdit} presence={presence}
            onOpen={(id) => { setActiveId(id); setPane('editor'); }} />
          <Participants room={room} presence={presence} myId={user.id} onChanged={loadRoom} />
        </aside>

        <main className={`${show('editor')} min-w-0 flex-1 flex-col md:flex`}>
          <div className="flex items-center gap-2 border-b border-line bg-white px-3 py-1.5 text-sm">
            <span className="font-medium">{activeFile?.name ?? 'No file open'}</span>
            {room.myRole === 'viewer' && <span className="rounded bg-mist px-1.5 py-0.5 text-xs text-muted">View only</span>}
            {room.settings.locked && <span className="rounded bg-mist px-1.5 py-0.5 text-xs text-muted">Room locked</span>}
          </div>
          <div className={`min-h-0 ${showRun ? 'h-1/2' : 'flex-1'}`}>
            {activeFile && doc ? (
              <CodeEditor key={activeFile.id} file={activeFile} doc={doc} readOnly={!canEdit} onEditor={(ed) => (editorRef.current = ed)} />
            ) : (
              <p className="p-4 text-sm text-muted">{files.length ? 'Connecting…' : 'Create a file from the sidebar to start coding.'}</p>
            )}
          </div>
          {showRun && <div className="h-1/2 border-t border-line bg-white"><Preview files={files} docs={docs} /></div>}
        </main>

        <aside className={`${pane === 'chat' || pane === 'ai' ? 'flex' : 'hidden'} w-full shrink-0 flex-col border-l border-line bg-white md:flex md:w-96`}>
          <div className="flex border-b border-line text-sm" role="tablist">
            {['chat', 'ai'].map((t) => (
              <button key={t} role="tab" aria-selected={rightTab === t} onClick={() => setPane(t)}
                className={`flex-1 px-3 py-2 font-medium ${rightTab === t ? 'border-b-2 border-cobalt text-cobalt-dark' : 'text-muted'}`}>
                {t === 'chat' ? 'Chat' : 'AI copilot'}
              </button>
            ))}
          </div>
          <div className={`min-h-0 flex-1 ${rightTab === 'chat' ? 'block' : 'hidden'}`}>
            {socket && <ChatPanel roomId={roomId} socket={socket} me={user} getSnippet={getSnippet} />}
          </div>
          <div className={`min-h-0 flex-1 ${rightTab === 'ai' ? 'block' : 'hidden'}`}>
            {socket && <AIPanel roomId={roomId} socket={socket} fileName={activeFile?.name} canEdit={canEdit} getContext={getContext} onInsert={insertCode} onReplace={replaceSelection} />}
          </div>
        </aside>
      </div>

      <nav className="flex border-t border-line bg-white text-sm md:hidden" aria-label="Panels">
        {[['files', 'Files'], ['editor', 'Editor'], ['chat', 'Chat'], ['ai', 'AI']].map(([id, label]) => (
          <button key={id} onClick={() => setPane(id)} className={`flex-1 py-2.5 ${pane === id ? 'font-semibold text-cobalt-dark' : 'text-muted'}`}>{label}</button>
        ))}
      </nav>
    </div>
  );
}
