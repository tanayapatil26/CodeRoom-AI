import { useEffect, useRef, useState } from 'react';
import { buildSrcDoc } from '../lib/runner';
import { toast } from '../store/toast';

const levelStyle = { log: '', info: 'text-cobalt-dark', warn: 'text-amber-700', error: 'text-danger' };

export default function Preview({ files, docs }) {
  const [srcDoc, setSrcDoc] = useState(null);
  const [runKey, setRunKey] = useState(0);
  const [logs, setLogs] = useState([]);
  const iframe = useRef(null);

  useEffect(() => {
    const onMsg = (e) => {
      if (e.source !== iframe.current?.contentWindow || !e.data?.__coderoom) return;
      setLogs((l) => [...l.slice(-199), { level: e.data.level, text: e.data.text }]);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  function run() {
    const getContent = (id) => docs.get(id)?.ydoc.getText('content').toString() ?? '';
    const doc = buildSrcDoc(files, getContent);
    if (!doc) return toast.error('Add an index.html file to run a preview');
    setLogs([]);
    setSrcDoc(doc);
    setRunKey((k) => k + 1);
  }
  const stop = () => setSrcDoc(null);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-line px-3 py-1.5">
        <button className="btn-primary btn-sm" onClick={run}>{srcDoc ? 'Restart' : 'Run'}</button>
        <button className="btn-ghost btn-sm" onClick={stop} disabled={!srcDoc}>Stop</button>
        <span className="text-xs text-muted">Runs HTML, CSS and JavaScript in a sandboxed frame</span>
      </div>
      <div className="grid min-h-0 flex-1 grid-rows-2 md:grid-cols-2 md:grid-rows-1">
        <div className="min-h-0 border-b border-line bg-white md:border-b-0 md:border-r">
          {srcDoc ? (
            // allow-scripts WITHOUT allow-same-origin keeps user code isolated from this app's cookies/storage.
            <iframe key={runKey} ref={iframe} title="Preview" sandbox="allow-scripts" srcDoc={srcDoc} className="h-full w-full" />
          ) : (
            <p className="p-3 text-sm text-muted">Press Run to see your page here.</p>
          )}
        </div>
        <div className="min-h-0 overflow-y-auto bg-mist p-2 font-mono text-xs">
          <div className="mb-1 flex items-center justify-between font-sans text-xs text-muted">
            <span>Console</span>
            <button onClick={() => setLogs([])} className="underline">Clear</button>
          </div>
          {logs.length === 0 && <p className="font-sans text-muted">Output from console.log and runtime errors shows here.</p>}
          {logs.map((l, i) => (
            <div key={i} className={`whitespace-pre-wrap border-b border-line/60 py-0.5 ${levelStyle[l.level]}`}>{l.text}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
