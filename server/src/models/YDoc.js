const mongoose = require('mongoose');

// Binary Yjs document state, one per file.
const ydocSchema = new mongoose.Schema(
  {
    fileId: { type: String, required: true, unique: true, index: true },
    state: { type: Buffer, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('YDoc', ydocSchema);
