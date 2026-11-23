const mongoose = require('mongoose');

const aiHistorySchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    prompt: { type: String, required: true },
    response: { type: String, default: '' },
    fileName: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('AIHistory', aiHistorySchema);
