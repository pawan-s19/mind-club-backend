const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },

  password: {
    type: String,
    required: true,
    minlength: 6
  },

  phone: {
    type: String,
    trim: true
  },

  bio: {
    type: String,
    trim: true,
    maxlength: 300
  },

  avatar: {
    url: { type: String, trim: true },
    fileId: { type: String, select: false }
  },

  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    default: 'other'
  },

  dob: {
    type: Date
  },

  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date
  }
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
