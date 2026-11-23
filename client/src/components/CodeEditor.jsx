import { useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { MonacoBinding } from 'y-monaco';

const esc = (s) => String(s).replace(/[^\w .-]/g, '');

// Render one CSS rule set per remote client so their cursor/selection show a name label.
function cursorCss(awareness) {
  let css = '';
  awareness.getStates().forEach((state, clientId) => {
    if (clientId === awareness.clientID || !state.user) return;
    const { name, color } = state.user;
    const c = /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#2A55F5';
    css += `
.yRemoteSelection-${clientId}{background:${c}33}
.yRemoteSelectionHead-${clientId}{border-left:2px solid ${c}}
.yRemoteSelectionHead-${clientId}::after{content:"${esc(name)}";position:absolute;top:-1.5em;left:-2px;background:${c};color:#fff;font:500 11px 'Schibsted Grotesk',sans-serif;padding:1px 5px;border-radius:3px 3px 3px 0;white-space:nowrap;z-index:5}`;
  });
  return css;
}

// Mount with key={file.id} so each file gets its own model + binding.
export default function CodeEditor({ file, doc, readOnly, onEditor, onTyping }) {
  const binding = useRef(null);
  const styleEl = useRef(null);
  const awarenessRef = useRef(null);
  const handler = useRef(null);

  useEffect(() => {
    styleEl.current = document.createElement('style');
    document.head.appendChild(styleEl.current);
    return () => {
      binding.current?.destroy();
      if (awarenessRef.current && handler.current) awarenessRef.current.off('change', handler.current);
      styleEl.current?.remove();
    };
  }, []);

  function handleMount(editor) {
    onEditor?.(editor);
    const { ydoc, provider } = doc;
    binding.current = new MonacoBinding(
      ydoc.getText('content'),
      editor.getModel(),
      new Set([editor]),
      provider.awareness
    );
    awarenessRef.current = provider.awareness;
    handler.current = () => { if (styleEl.current) styleEl.current.textContent = cursorCss(provider.awareness); };
    provider.awareness.on('change', handler.current);
    handler.current();
    editor.onDidChangeModelContent(() => onTyping?.());
  }

  return (
    <Editor
      language={file.language}
      theme="vs"
      onMount={handleMount}
      options={{
        readOnly,
        minimap: { enabled: false },
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 14,
        automaticLayout: true,
        scrollBeyondLastLine: false,
        padding: { top: 12 },
      }}
    />
  );
}
