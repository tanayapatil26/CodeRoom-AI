// Yjs sync over WebSocket: /yjs/<fileId>?token=<jwt>
// Uses y-websocket's server utilities, adds JWT + role checks and MongoDB persistence.
const { WebSocketServer } = require('ws');
const Y = require('yjs');
const { setupWSConnection, setPersistence } = require('y-websocket/bin/utils');
const File = require('../models/File');
const YDoc = require('../models/YDoc');
const { verifyToken } = require('../middleware/auth');
const { getMembership, canEdit } = require('../services/roomAccess');
const { register } = require('./registry');

async function saveDoc(fileId, ydoc) {
  const state = Buffer.from(Y.encodeStateAsUpdate(ydoc));
  await YDoc.findOneAndUpdate({ fileId }, { state }, { upsert: true });
  // Keep a plain-text snapshot for AI context / fallbacks.
  await File.updateOne({ _id: fileId }, { content: ydoc.getText('content').toString() });
}

setPersistence({
  bindState: async (fileId, ydoc) => {
    const rec = await YDoc.findOne({ fileId });
    if (rec) {
      Y.applyUpdate(ydoc, new Uint8Array(rec.state));
    } else {
      const f = await File.findById(fileId).select('content');
      if (f?.content) ydoc.getText('content').insert(0, f.content);
    }
    let timer;
    ydoc.on('update', () => {
      clearTimeout(timer);
      timer = setTimeout(() => saveDoc(fileId, ydoc).catch(console.error), 1500);
    });
  },
  writeState: async (fileId, ydoc) => saveDoc(fileId, ydoc),
});

// Drop document-changing sync messages from read-only connections (viewers).
// y-protocols: message type 0 = sync; sync sub-types 0 = step1 (request), 1 = step2, 2 = update.
function makeReadOnly(conn) {
  const origOn = conn.on.bind(conn);
  conn.on = (evt, fn) => {
    if (evt !== 'message') return origOn(evt, fn);
    return origOn(evt, (data) => {
      const d = new Uint8Array(data);
      if (d[0] === 0 && (d[1] === 1 || d[1] === 2)) return;
      fn(data);
    });
  };
}

function attachYjs(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', async (req, socket, head) => {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/yjs/')) return; // Socket.IO handles its own path

    const reject = (code, msg) => {
      socket.write(`HTTP/1.1 ${code} ${msg}\r\nConnection: close\r\n\r\n`);
      socket.destroy();
    };

    try {
      const fileId = url.pathname.slice('/yjs/'.length);
      const payload = verifyToken(url.searchParams.get('token') || '');
      const file = await File.findById(fileId).select('room type');
      if (!file || file.type !== 'file') return reject(404, 'Not Found');
      const m = await getMembership(file.room, payload.sub);
      if (!m || m.room.status === 'ended') return reject(403, 'Forbidden');

      wss.handleUpgrade(req, socket, head, (ws) => {
        register(String(file.room), String(payload.sub), ws);
        if (!canEdit(m.role)) makeReadOnly(ws);
        setupWSConnection(ws, req, { docName: fileId });
      });
    } catch {
      reject(401, 'Unauthorized');
    }
  });
}

module.exports = { attachYjs };
