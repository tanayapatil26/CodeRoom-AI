const express = require('express');
const mongoose = require('mongoose');
const { z } = require('zod');
const File = require('../models/File');
const YDoc = require('../models/YDoc');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { getMembership, canEdit } = require('../services/roomAccess');
const { languageFromName, wrap } = require('../utils/helpers');

const router = express.Router({ mergeParams: true });
router.use(requireAuth);

const nameRule = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(120)
  .regex(/^[^/\\]+$/, 'Name cannot contain slashes');

const createSchema = z.object({
  name: nameRule,
  type: z.enum(['file', 'folder']).default('file'),
  parent: z.string().nullable().optional(),
});
const renameSchema = z.object({ name: nameRule });

const dto = (f) => ({ id: f._id, name: f.name, type: f.type, parent: f.parent, language: f.language, updatedAt: f.updatedAt });
const emitChanged = (req) => req.app.get('io').to(`room:${req.params.roomId}`).emit('files:changed');

async function guard(req, res, needEdit) {
  if (!mongoose.isValidObjectId(req.params.roomId)) {
    res.status(404).json({ error: 'Room not found' });
    return null;
  }
  const m = await getMembership(req.params.roomId, req.user._id);
  if (!m) {
    res.status(403).json({ error: 'Not in this room' });
    return null;
  }
  if (m.room.status === 'ended') {
    res.status(410).json({ error: 'This session has ended' });
    return null;
  }
  if (needEdit && !canEdit(m.role)) {
    res.status(403).json({ error: 'Viewers cannot change files' });
    return null;
  }
  return m;
}

router.get(
  '/',
  wrap(async (req, res) => {
    if (!(await guard(req, res, false))) return;
    const files = await File.find({ room: req.params.roomId }).sort({ type: -1, name: 1 });
    res.json({ files: files.map(dto) });
  })
);

router.post(
  '/',
  validate(createSchema),
  wrap(async (req, res) => {
    if (!(await guard(req, res, true))) return;
    const { name, type, parent } = req.body;
    if (parent) {
      const p = await File.findOne({ _id: parent, room: req.params.roomId, type: 'folder' });
      if (!p) return res.status(400).json({ error: 'Parent folder not found' });
    }
    const dup = await File.exists({ room: req.params.roomId, parent: parent || null, name });
    if (dup) return res.status(409).json({ error: `"${name}" already exists here` });
    const count = await File.countDocuments({ room: req.params.roomId });
    if (count >= 100) return res.status(400).json({ error: 'File limit reached (100 per room)' });
    const file = await File.create({
      room: req.params.roomId, name, type, parent: parent || null,
      language: type === 'file' ? languageFromName(name) : 'plaintext',
    });
    emitChanged(req);
    res.status(201).json({ file: dto(file) });
  })
);

router.patch(
  '/:fileId',
  validate(renameSchema),
  wrap(async (req, res) => {
    if (!(await guard(req, res, true))) return;
    const file = await File.findOne({ _id: req.params.fileId, room: req.params.roomId });
    if (!file) return res.status(404).json({ error: 'File not found' });
    const dup = await File.exists({ room: req.params.roomId, parent: file.parent, name: req.body.name, _id: { $ne: file._id } });
    if (dup) return res.status(409).json({ error: `"${req.body.name}" already exists here` });
    file.name = req.body.name;
    if (file.type === 'file') file.language = languageFromName(file.name);
    await file.save();
    emitChanged(req);
    res.json({ file: dto(file) });
  })
);

router.delete(
  '/:fileId',
  wrap(async (req, res) => {
    if (!(await guard(req, res, true))) return;
    const all = await File.find({ room: req.params.roomId }).select('_id parent');
    const toDelete = new Set([req.params.fileId]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const f of all) {
        if (f.parent && toDelete.has(String(f.parent)) && !toDelete.has(String(f._id))) {
          toDelete.add(String(f._id));
          grew = true;
        }
      }
    }
    const ids = [...toDelete];
    await Promise.all([File.deleteMany({ _id: { $in: ids } }), YDoc.deleteMany({ fileId: { $in: ids } })]);
    emitChanged(req);
    res.json({ ok: true, deleted: ids });
  })
);

module.exports = router;
