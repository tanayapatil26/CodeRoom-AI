const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    avatar: { type: String, default: '' },
    createdRooms: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Room' }],
  },
  { timestamps: true }
);

userSchema.methods.toPublic = function () {
  return { id: this._id, name: this.name, email: this.email, avatar: this.avatar };
};

module.exports = mongoose.model('User', userSchema);
