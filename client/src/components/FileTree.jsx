import { useState } from 'react';
import { api } from '../lib/api';
import { toast } from '../store/toast';
import { colorFor } from '../lib/colors';

function Node({ node, depth, ctx }) {
  const [open, setOpen] = useState(true);
  const isFolder = node.type === 'folder';
  const children = ctx.children(node.id);
  const editors = ctx.editors[node.id] || [];
  const active = ctx.activeId === node.id;

  return (
    <li>
      <div
        className={`group flex items-center gap-1.5 rounded px-2 py-1 text-sm ${active ? 'bg-cobalt-soft font-medium text-cobalt-dark' : 'hover:bg-mist'}`}
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        <button
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          onClick={() => (isFolder ? setOpen(!open) : ctx.onOpen(node.id))}
        >
          <span aria-hidden className="w-3 text-muted">{isFolder ? (open ? '▾' : '▸') : ''}</span>
          <span className="truncate">{node.name}</span>
        </button>
        {editors.map((u) => (
          <span key={u.id} title={`${u.name} is here`} className="h-2 w-2 rounded-full" style={{ background: colorFor(u.id) }} />
        ))}
        {ctx.canEdit && (
          <span className="hidden gap-1 group-hover:flex group-focus-within:flex">
            {isFolder && <button title="New file here" aria-label="New file here" onClick={() => ctx.onCreate(node.id, 'file')}>＋</button>}
            <button title="Rename" aria-label="Rename" onClick={() => ctx.onRename(node)}>✎</button>
            <button title="Delete" aria-label="Delete" className="text-danger" onClick={() => ctx.onDelete(node)}>✕</button>
          </span>
        )}
      </div>
      {isFolder && open && children.length > 0 && (
        <ul>{children.map((c) => <Node key={c.id} node={c} depth={depth + 1} ctx={ctx} />)}</ul>
      )}
    </li>
  );
}

export default function FileTree({ roomId, files, activeId, onOpen, canEdit, presence }) {
  const children = (parent) =>
    files
      .filter((f) => (f.parent || null) === parent)
      .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'folder' ? -1 : 1));

  const editors = {};
  for (const u of presence) if (u.activeFile) (editors[u.activeFile] ||= []).push(u);

  async function onCreate(parent, type) {
    const name = window.prompt(type === 'folder' ? 'Folder name' : 'File name (e.g. app.js)');
    if (!name) return;
    try {
      const { file } = await api(`/rooms/${roomId}/files`, { method: 'POST', body: { name, type, parent } });
      if (type === 'file') setTimeout(() => onOpen(file.id), 150);
    } catch (e) { toast.error(e.message); }
  }
  async function onRename(node) {
    const name = window.prompt('New name', node.name);
    if (!name || name === node.name) return;
    try { await api(`/rooms/${roomId}/files/${node.id}`, { method: 'PATCH', body: { name } }); } catch (e) { toast.error(e.message); }
  }
  async function onDelete(node) {
    if (!window.confirm(`Delete ${node.name}${node.type === 'folder' ? ' and everything in it' : ''}? This can't be undone.`)) return;
    try { await api(`/rooms/${roomId}/files/${node.id}`, { method: 'DELETE' }); } catch (e) { toast.error(e.message); }
  }

  const ctx = { children, editors, activeId, onOpen, canEdit, onCreate, onRename, onDelete };
  const roots = children(null);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between px-2">
        <h2 className="text-sm font-semibold">Files</h2>
        {canEdit && (
          <div className="flex gap-1">
            <button className="btn-ghost btn-sm" onClick={() => onCreate(null, 'file')}>New file</button>
            <button className="btn-ghost btn-sm" onClick={() => onCreate(null, 'folder')}>New folder</button>
          </div>
        )}
      </div>
      {roots.length === 0 ? (
        <p className="px-2 py-3 text-sm text-muted">No files yet. Create one to start coding.</p>
      ) : (
        <ul>{roots.map((n) => <Node key={n.id} node={n} depth={0} ctx={ctx} />)}</ul>
      )}
    </div>
  );
}
