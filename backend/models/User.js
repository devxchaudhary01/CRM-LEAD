const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

// ROLES:
// super_admin         → system-wide, no org
// org_owner           → owns org, full access
// sub_business_owner  → owner-like access without ownership transfer/delete capabilities
// ops_manager         → view + download + share + assign roles to agents
// ops_lead            → view dashboard, NO download
// c1 / c2 / c3        → calling agents, NO dashboard
// (sub_admin kept for backward compat = ops_manager equivalent)

// SUBSCRIPTION:
// free    → limited leads, basic features

// pro     → all features

const userSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true },
  password:     { type: String, minlength: 6, select: false },
  phone:        { type: String, default: '' },
  role: {
    type: String,
    enum: ['super_admin','org_owner','sub_business_owner','ops_manager','ops_lead','c1','c2','c3','user'],
    default: 'c1'
  },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isActive:     { type: Boolean, default: true },
  lastLogin:    { type: Date },

  // Auth methods
  authMethod:   { type: String, enum: ['email','google','otp'], default: 'email' },
  googleId:     { type: String, default: '' },

  // OTP (Phase 2)
  otp:          { type: String, select: false },
  otpExpiry:    { type: Date,   select: false },

}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = async function(p) {
  if (!this.password) return false;
  return bcrypt.compare(p, this.password);
};

module.exports = mongoose.model('User', userSchema);
