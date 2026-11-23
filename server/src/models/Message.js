const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, default: '', maxlength: 2000 },
    snippet: {
      language: { type: String },
      code: { type: String, maxlength: 8000 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);
