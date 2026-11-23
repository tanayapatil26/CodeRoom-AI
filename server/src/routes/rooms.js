const express = require('express');
const mongoose = require('mongoose');
const { z } = require('zod');
const Room = require('../models/Room');
const File = require('../models/File');
const Message = require('../models/Message');
const AIHistory = require('../models/AIHistory');
const YDoc = require('../models/YDoc');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { generateRoomCode, wrap } = require('../utils/helpers');
const { getMembership } = require('../services/roomAccess');
const { seedFiles } = require('../services/starterFiles');
const { closeUser, closeRoom } = require('../yjs/registry');

const router = express.Router();
router.use(requireAuth);

const isId = (v) => mongoose.isValidObjectId(v);

const createSchema = z.object({ name: z.string().trim().min(2, 'Room name is too short').max(80) });
const joinSchema = z.object({ code: z.string().trim().min(4).max(20).transform((s) => s.toUpperCase()) });
const settingsSchema = z.object({
  locked: z.boolean().optional(),
  defaultRole: z.enum(['collaborator', 'viewer']).optional(),
});
const roleSchema = z.object({ role: z.enum(['collaborator', 'viewer']) });

// Serialize a room with populated participants.
async function serialize(room, myRole) {
  await room.populate('participants.user', 'name email avatar');
  return {
    id: room._id,
    name: room.name,
    code: room.code,
    host: room.host,
    status: room.status,
    settings: room.settings,
    myRole,
    participants: room.participants.map((p) => ({
      id: p.user._id,
      name: p.user.name,
      avatar: p.user.avatar,
      role: p.role,
    })),
    createdAt: room.createdAt,
  };
}

function notifyRoom(req, roomId, event, payload = {}) {
  req.app.get('io').to(`room:${roomId}`).emit(event, payload);
}

router.post(
  '/',
  validate(createSchema),
  wrap(async (req, res) => {
    let code;
    do {
      code = generateRoomCode();
    } while (await Room.exists({ code }));
    const room = await Room.create({
      name: req.body.name,
      code,
      host: req.user._id,
      participants: [{ user: req.user._id, role: 'host' }],
    });
    await seedFiles(room._id);
    req.user.createdRooms.push(room._id);
    await req.user.save();
    res.status(201).json({ room: await serialize(room, 'host') });
  })
);

router.get(
  '/',
  wrap(async (req, res) => {
    const rooms = await Room.find({ 'participants.user': req.user._id, status: 'active' })
      .sort({ updatedAt: -1 })
      .limit(50);
    res.json({
      rooms: rooms.map((r) => ({
        id: r._id,
        name: r.name,
        code: r.code,
        myRole: r.participants.find((p) => String(p.user) === String(req.user._id))?.role,
        participantCount: r.participants.length,
        locked: r.settings.locked,
        updatedAt: r.updatedAt,
      })),
    });
  })
);

router.post(
  '/join',
  validate(joinSchema),
  wrap(async (req, res) => {
    const room = await Room.findOne({ code: req.body.code });
    if (!room || room.status === 'ended') return res.status(404).json({ error: 'No active room with that code' });
    const existing = room.participants.find((p) => String(p.user) === String(req.user._id));
    if (!existing) {
      if (room.settings.locked) return res.status(403).json({ error: 'This room is locked by the host' });
      if (room.participants.length >= 25) return res.status(403).json({ error: 'This room is full' });
      room.participants.push({ user: req.user._id, role: room.settings.defaultRole });
      await room.save();
      notifyRoom(req, room._id, 'room:updated');
    }
    const role = room.participants.find((p) => String(p.user) === String(req.user._id)).role;
    res.json({ room: await serialize(room, role) });
  })
);

router.get(
  '/:roomId',
  wrap(async (req, res) => {
    if (!isId(req.params.roomId)) return res.status(404).json({ error: 'Room not found' });
    const m = await getMembership(req.params.roomId, req.user._id);
    if (!m) return res.status(403).json({ error: 'You are not in this room. Join with its code.' });
    if (m.room.status === 'ended') return res.status(410).json({ error: 'This session has ended' });
    res.json({ room: await serialize(m.room, m.role) });
  })
);

router.post(
  '/:roomId/leave',
  wrap(async (req, res) => {
    const m = await getMembership(req.params.roomId, req.user._id);
    if (!m) return res.json({ ok: true });
    if (m.role === 'host') return res.status(400).json({ error: 'Hosts cannot leave. End the session instead.' });
    m.room.participants = m.room.participants.filter((p) => String(p.user) !== String(req.user._id));
    await m.room.save();
    notifyRoom(req, m.room._id, 'room:updated');
    res.json({ ok: true });
  })
);

function requireHost(m, res) {
  if (!m || m.role !== 'host') {
    res.status(403).json({ error: 'Only the host can do this' });
    return false;
  }
  return true;
}

router.patch(
  '/:roomId/settings',
  validate(settingsSchema),
  wrap(async (req, res) => {
    const m = await getMembership(req.params.roomId, req.user._id);
    if (!requireHost(m, res)) return;
    Object.assign(m.room.settings, req.body);
    await m.room.save();
    notifyRoom(req, m.room._id, 'room:updated');
    res.json({ room: await serialize(m.room, m.role) });
  })
);

router.patch(
  '/:roomId/participants/:userId',
  validate(roleSchema),
  wrap(async (req, res) => {
    const m = await getMembership(req.params.roomId, req.user._id);
    if (!requireHost(m, res)) return;
    const target = m.room.participants.find((p) => String(p.user) === req.params.userId);
    if (!target) return res.status(404).json({ error: 'Participant not found' });
    if (target.role === 'host') return res.status(400).json({ error: 'The host role cannot be changed' });
    target.role = req.body.role;
    await m.room.save();
    notifyRoom(req, m.room._id, 'room:updated');
    // Roles are re-checked on every API call, chat message and socket event. Open editor connections
    // are closed so they reconnect with the new role (viewers reconnect read-only).
    closeUser(String(m.room._id), req.params.userId, 'Role changed');
    res.json({ room: await serialize(m.room, m.role) });
  })
);

router.delete(
  '/:roomId/participants/:userId',
  wrap(async (req, res) => {
    const m = await getMembership(req.params.roomId, req.user._id);
    if (!requireHost(m, res)) return;
    if (req.params.userId === String(req.user._id)) return res.status(400).json({ error: 'You cannot remove yourself' });
    m.room.participants = m.room.participants.filter((p) => String(p.user) !== req.params.userId);
    await m.room.save();
    const io = req.app.get('io');
    io.to(`user:${req.params.userId}`).emit('room:removed', { roomId: String(m.room._id) });
    io.in(`user:${req.params.userId}`).socketsLeave(`room:${m.room._id}`);
    io.evictUser(m.room._id, req.params.userId);
    closeUser(String(m.room._id), req.params.userId, 'Removed from room');
    notifyRoom(req, m.room._id, 'room:updated');
    res.json({ room: await serialize(m.room, m.role) });
  })
);

router.post(
  '/:roomId/end',
  wrap(async (req, res) => {
    const m = await getMembership(req.params.roomId, req.user._id);
    if (!requireHost(m, res)) return;
    m.room.status = 'ended';
    await m.room.save();
    notifyRoom(req, m.room._id, 'room:ended');
    req.app.get('io').in(`room:${m.room._id}`).socketsLeave(`room:${m.room._id}`);
    req.app.get('io').evictRoom(m.room._id);
    closeRoom(String(m.room._id));
    res.json({ ok: true });
  })
);

router.delete(
  '/:roomId',
  wrap(async (req, res) => {
    const m = await getMembership(req.params.roomId, req.user._id);
    if (!requireHost(m, res)) return;
    const files = await File.find({ room: m.room._id }).select('_id');
    await Promise.all([
      YDoc.deleteMany({ fileId: { $in: files.map((f) => String(f._id)) } }),
      File.deleteMany({ room: m.room._id }),
      Message.deleteMany({ room: m.room._id }),
      AIHistory.deleteMany({ room: m.room._id }),
      m.room.deleteOne(),
    ]);
    closeRoom(String(m.room._id));
    res.json({ ok: true });
  })
);

// Chat history & AI history (read)
router.get(
  '/:roomId/messages',
  wrap(async (req, res) => {
    const m = await getMembership(req.params.roomId, req.user._id);
    if (!m) return res.status(403).json({ error: 'Not in this room' });
    const msgs = await Message.find({ room: m.room._id }).sort({ createdAt: -1 }).limit(100).populate('user', 'name avatar');
    res.json({
      messages: msgs.reverse().map((x) => ({
        id: x._id, text: x.text, snippet: x.snippet?.code ? x.snippet : undefined, createdAt: x.createdAt,
        user: { id: x.user._id, name: x.user.name, avatar: x.user.avatar },
      })),
    });
  })
);

router.get(
  '/:roomId/ai-history',
  wrap(async (req, res) => {
    const m = await getMembership(req.params.roomId, req.user._id);
    if (!m) return res.status(403).json({ error: 'Not in this room' });
    const items = await AIHistory.find({ room: m.room._id }).sort({ createdAt: -1 }).limit(30).populate('user', 'name');
    res.json({
      history: items.reverse().map((h) => ({
        id: h._id, action: h.action, prompt: h.prompt, response: h.response, fileName: h.fileName,
        user: h.user?.name, createdAt: h.createdAt,
      })),
    });
  })
);

module.exports = router;
