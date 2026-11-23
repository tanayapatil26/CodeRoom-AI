import { Children, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';
import { api, streamAI } from '../lib/api';
import { toast } from '../store/toast';

const ACTIONS = [
  { id: 'explain', label: 'Explain' },
  { id: 'fix', label: 'Fix bug' },
  { id: 'refactor', label: 'Refactor' },
  { id: 'optimize', label: 'Optimize' },
  { id: 'review', label: 'Review' },
  { id: 'generate', label: 'Generate' },
];

const textOf = (n) =>
  typeof n === 'string' ? n : Array.isArray(n) ? n.map(textOf).join('') : n?.props ? textOf(n.props.children) : '';

function CodeBlock({ children, canEdit, onInsert, onReplace }) {
  const code = textOf(Children.toArray(children)).replace(/\n$/, '');
  return (
    <div className="my-2 overflow-hidden rounded-md border border-line bg-white">
      <div className="flex flex-wrap gap-1 border-b border-line bg-mist px-2 py-1">
        <button className="btn-ghost btn-sm" onClick={() => navigator.clipboard.writeText(code).then(() => toast.success('Copied'))}>Copy</button>
        {canEdit && <button className="btn-ghost btn-sm" onClick={() => onInsert(code)}>Insert at cursor</button>}
        {canEdit && <button className="btn-ghost btn-sm" onClick={() => onReplace(code)}>Replace selection</button>}
      </div>
      <pre className="p-2">{children}</pre>
    </div>
  );
}

export default function AIPanel({ roomId, getContext, canEdit, onInsert, onReplace, socket, fileName }) {
  const [prompt, setPrompt] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [output, setOutput] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState([]);
  const abort = useRef(null);

  useEffect(() => {
    api(`/rooms/${roomId}/ai-history`).then((d) => setHistory(d.history)).catch(() => {});
  }, [roomId]);

  async function run(action) {
    const ctx = getContext();
    if (!ctx && action !== 'generate') return toast.info('Open a file first');
    setBusy(true);
    setOutput('');
    abort.current = new AbortController();
    let acc = '';
    try {
      await streamAI(
        roomId,
        { action, prompt, errorMessage: errorMessage || undefined, ...(ctx || {}) },
        (t) => { acc += t; setOutput(acc); },
        abort.current.signal
      );
      setHistory((h) => [...h, { id: Date.now(), action, prompt: prompt || action, response: acc, fileName: ctx?.fileName }]);
    } catch (e) {
      if (e.name !== 'AbortError') toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  const md = (
    <ReactMarkdown
      rehypePlugins={[rehypeHighlight]}
      components={{ pre: ({ children }) => <CodeBlock canEdit={canEdit} onInsert={onInsert} onReplace={onReplace}>{children}</CodeBlock> }}
    >
      {output}
    </ReactMarkdown>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-3 text-sm">
        {output ? (
          <div className="prose-chat">{md}</div>
        ) : (
          <div className="text-muted">
            <p>Select code in the editor, then pick an action. With nothing selected, the whole file is used.</p>
            {history.length > 0 && (
              <>
                <h3 className="mb-1 mt-4 text-xs font-semibold text-ink">Room history</h3>
                <ul className="space-y-1">
                  {[...history].reverse().slice(0, 10).map((h) => (
                    <li key={h.id}>
                      <button className="w-full truncate rounded px-2 py-1 text-left hover:bg-mist" onClick={() => setOutput(h.response)}>
                        <span className="font-medium text-ink capitalize">{h.action}</span> · {h.fileName || 'no file'} · {h.prompt}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>
      <div className="space-y-2 border-t border-line p-2">
        <div className="flex flex-wrap gap-1">
          {ACTIONS.map((a) => (
            <button key={a.id} className="btn-ghost btn-sm" disabled={busy} onClick={() => run(a.id)}>{a.label}</button>
          ))}
          <button className="btn-ghost btn-sm" onClick={() => socket.emit('help:request', { fileName })} title="Ping the room">Ask room for help</button>
        </div>
        <textarea className="input" rows={2} maxLength={2000} placeholder="Describe what you want (needed for Generate)" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        <input className="input" placeholder="Paste an error message (optional, used by Fix bug)" value={errorMessage} onChange={(e) => setErrorMessage(e.target.value)} maxLength={3000} />
        <div className="flex gap-2">
          <button className="btn-primary btn-sm" disabled={busy || !prompt.trim()} onClick={() => run(prompt.trim() ? 'chat' : 'explain')}>Ask</button>
          {busy && <button className="btn-danger btn-sm" onClick={() => abort.current?.abort()}>Stop</button>}
          {output && !busy && <button className="btn-ghost btn-sm" onClick={() => setOutput('')}>Clear</button>}
        </div>
      </div>
    </div>
  );
}
