// models/Payment.js
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  organization:    { type: mongoose.Schema.Types.ObjectId, ref:'Organization', required:true },
  paidBy:          { type: mongoose.Schema.Types.ObjectId, ref:'User', required:true },

  // Razorpay fields
  razorpayOrderId:   { type: String, required:true },
  razorpayPaymentId: { type: String, default:'' },
  razorpaySignature: { type: String, default:'' },

  // Plan purchased
  plan:    { type: String, enum:['trial','pro'], required:true },
  amount:  { type: Number, required:true },   // in paise
  currency:{ type: String, default:'INR' },

  // Status
  status:  { type: String, enum:['created','paid','failed'], default:'created' },

  // Subscription period
  validFrom: { type: Date },
  validTill: { type: Date },   // +30 days from payment

  // Notes
  notes: { type: String, default:'' },

}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
