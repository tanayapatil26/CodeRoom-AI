const { Server } = require('socket.io');
const { z } = require('zod');
const { verifyToken } = require('../middleware/auth');
const User = require('../models/User');
const Message = require('../models/Message');
const { getMembership } = require('../services/roomAccess');

const chatSchema = z.object({
  roomId: z.string(),
  text: z.string().max(2000).default(''),
  snippet: z.object({ language: z.string().max(30).optional(), code: z.string().max(8000) }).optional(),
}).refine((d) => d.text.trim() || d.snippet?.code, { message: 'Empty message' });

// presence: roomId -> Map(userId -> { user, sockets:Set, activeFile })
const presence = new Map();

function snapshot(roomId) {
  const room = presence.get(roomId);
  if (!room) return [];
  return [...room.values()].map((p) => ({ ...p.user, activeFile: p.activeFile }));
}

function setupSocket(server) {
  const io = new Server(server, {
    cors: { origin: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((origin) => origin.trim()).filter(Boolean), credentials: true },
    maxHttpBufferSize: 1e5,
  });

  io.use(async (socket, next) => {
    try {
      const payload = verifyToken(socket.handshake.auth?.token || '');
      const user = await User.findById(payload.sub);
      if (!user) return next(new Error('unauthorized'));
      socket.data.user = { id: String(user._id), name: user.name, avatar: user.avatar };
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const me = socket.data.user;
    socket.join(`user:${me.id}`);
    let currentRoom = null;

    socket.on('room:join', async ({ roomId }, ack) => {
      try {
        const m = await getMembership(roomId, me.id);
        if (!m || m.room.status === 'ended') return ack?.({ error: 'Not allowed' });
        currentRoom = roomId;
        socket.join(`room:${roomId}`);
        if (!presence.has(roomId)) presence.set(roomId, new Map());
        const rp = presence.get(roomId);
        const entry = rp.get(me.id) || { user: me, sockets: new Set(), activeFile: null };
        const first = entry.sockets.size === 0;
        entry.sockets.add(socket.id);
        rp.set(me.id, entry);
        io.to(`room:${roomId}`).emit('presence:update', snapshot(roomId));
        if (first) socket.to(`room:${roomId}`).emit('notify', { kind: 'join', text: `${me.name} joined` });
        ack?.({ ok: true, role: m.role });
      } catch {
        ack?.({ error: 'Join failed' });
      }
    });

    // socket.rooms is updated when the host removes someone (socketsLeave), so this is a cheap live membership check.
    const inRoom = () => currentRoom && socket.rooms.has(`room:${currentRoom}`);

    socket.on('file:active', ({ fileId }) => {
      if (!inRoom()) return;
      const entry = presence.get(currentRoom)?.get(me.id);
      if (!entry) return;
      entry.activeFile = typeof fileId === 'string' ? fileId : null;
      io.to(`room:${currentRoom}`).emit('presence:update', snapshot(currentRoom));
    });

    socket.on('typing', ({ isTyping }) => {
      if (!inRoom()) return;
      socket.to(`room:${currentRoom}`).emit('typing', { user: me, isTyping: !!isTyping });
    });

    // Chat: role is re-checked on every event, so removed users can't keep posting.
    socket.on('chat:send', async (data, ack) => {
      try {
        const parsed = chatSchema.parse(data);
        if (parsed.roomId !== currentRoom) return ack?.({ error: 'Join the room first' });
        const m = await getMembership(parsed.roomId, me.id);
        if (!m || m.room.status === 'ended') return ack?.({ error: 'Not allowed' });
        const msg = await Message.create({
          room: parsed.roomId, user: me.id, text: parsed.text.trim(), snippet: parsed.snippet,
        });
        const out = {
          id: msg._id, text: msg.text, snippet: msg.snippet?.code ? msg.snippet : undefined,
          createdAt: msg.createdAt, user: me,
        };
        io.to(`room:${parsed.roomId}`).emit('chat:message', out);
        ack?.({ ok: true, id: msg._id });
      } catch (e) {
        ack?.({ error: e.name === 'ZodError' ? 'Message is empty or too long' : 'Send failed' });
      }
    });

    socket.on('help:request', async ({ fileName }) => {
      if (!currentRoom) return;
      const m = await getMembership(currentRoom, me.id);
      if (!m) return;
      socket.to(`room:${currentRoom}`).emit('notify', {
        kind: 'help', text: `${me.name} needs help${fileName ? ` in ${String(fileName).slice(0, 60)}` : ''}`,
      });
    });

    socket.on('disconnect', () => {
      if (!currentRoom) return;
      const rp = presence.get(currentRoom);
      const entry = rp?.get(me.id);
      if (!entry) return;
      entry.sockets.delete(socket.id);
      if (entry.sockets.size === 0) {
        rp.delete(me.id);
        socket.to(`room:${currentRoom}`).emit('notify', { kind: 'leave', text: `${me.name} left` });
        if (rp.size === 0) presence.delete(currentRoom);
      }
      io.to(`room:${currentRoom}`).emit('presence:update', snapshot(currentRoom));
    });
  });

  // Called by REST routes when a user is removed or a session ends.
  io.evictUser = (roomId, userId) => {
    const rp = presence.get(String(roomId));
    if (rp?.delete(String(userId))) {
      if (rp.size === 0) presence.delete(String(roomId));
      io.to(`room:${roomId}`).emit('presence:update', snapshot(String(roomId)));
    }
  };
  io.evictRoom = (roomId) => presence.delete(String(roomId));

  return io;
}

module.exports = { setupSocket };
