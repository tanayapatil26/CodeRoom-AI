import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { colorFor } from '../lib/colors';
import { getToken } from '../lib/api';

const WS_URL =
  import.meta.env.VITE_WS_URL ||
  `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/yjs`;

// One Y.Doc + provider per file. Keeping all of them connected lets Run read every file's live
// content and lets the file tree show who is editing what. Fine for small rooms (100-file cap).
export function useRoomDocs(files, user) {
  const ref = useRef(new Map());
  const [, bump] = useState(0);

  useEffect(() => {
    const map = ref.current;
    const ids = new Set(files.filter((f) => f.type === 'file').map((f) => f.id));
    let changed = false;
    for (const id of ids) {
      if (map.has(id)) continue;
      const ydoc = new Y.Doc();
      const provider = new WebsocketProvider(WS_URL, id, ydoc, { params: { token: getToken() } });
      provider.awareness.setLocalStateField('user', { name: user.name, color: colorFor(user.id) });
      map.set(id, { ydoc, provider });
      changed = true;
    }
    for (const [id, d] of map) {
      if (!ids.has(id)) {
        d.provider.destroy();
        d.ydoc.destroy();
        map.delete(id);
        changed = true;
      }
    }
    if (changed) bump((n) => n + 1);
  }, [files, user]);

  useEffect(
    () => () => {
      for (const d of ref.current.values()) {
        d.provider.destroy();
        d.ydoc.destroy();
      }
      ref.current.clear();
    },
    []
  );

  return ref.current;
}
