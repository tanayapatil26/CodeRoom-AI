const Room = require('../models/Room');

const CAN_EDIT = ['host', 'collaborator'];

// Returns { room, role } or null if the user is not a participant.
async function getMembership(roomId, userId) {
  const room = await Room.findById(roomId);
  if (!room) return null;
  const p = room.participants.find((x) => String(x.user) === String(userId));
  if (!p) return null;
  return { room, role: p.role };
}

const canEdit = (role) => CAN_EDIT.includes(role);

module.exports = { getMembership, canEdit };
