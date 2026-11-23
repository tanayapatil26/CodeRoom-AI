const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    type: { type: String, enum: ['file', 'folder'], default: 'file' },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'File', default: null },
    language: { type: String, default: 'plaintext' },
    // Initial content + latest plain-text snapshot. The live source of truth is the Yjs doc (see YDoc).
    content: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('File', fileSchema);
