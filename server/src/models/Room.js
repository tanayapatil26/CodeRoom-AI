const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['host', 'collaborator', 'viewer'], default: 'collaborator' },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    code: { type: String, required: true, unique: true, index: true },
    host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    participants: [participantSchema],
    settings: {
      locked: { type: Boolean, default: false },
      defaultRole: { type: String, enum: ['collaborator', 'viewer'], default: 'collaborator' },
    },
    status: { type: String, enum: ['active', 'ended'], default: 'active' },
  },
  { timestamps: true }
);

// Files, messages and AI history live in their own collections (File, Message, AIHistory)
// so this document never grows toward MongoDB's 16 MB limit.
module.exports = mongoose.model('Room', roomSchema);
