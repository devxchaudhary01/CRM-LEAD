const mongoose = require('mongoose');

const orgSchema = new mongoose.Schema({
  name:  { type:String, required:true, trim:true },
  code:  { type:String, unique:true, uppercase:true, trim:true },
  owner: { type:mongoose.Schema.Types.ObjectId, ref:'User' },
  isActive: { type:Boolean, default:true },

  plan:          { type:String, enum:['trial','free','pro'], default:'trial' },
  planValidTill: { type:Date, default:null },

  followUpConfig: {
    defaultFollowUpDays:  { type:Number, default:1 },
    allowAgentSchedule:   { type:Boolean, default:false },
  },

  customColumns: [{
    key:     { type:String },
    label:   { type:String },
    type:    { type:String, enum:['text','number','select'], default:'text' },
    options: [String],
    editable:{ type:Boolean, default:true },
  }],
}, { timestamps:true });

orgSchema.pre('save', function(next) {
  if (!this.code) {
    this.code = this.name.replace(/\s+/g,'_').toUpperCase().substring(0,10)+'_'+Date.now().toString().slice(-4);
  }
  next();
});

module.exports = mongoose.model('Organization', orgSchema);
