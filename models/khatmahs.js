var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var deepPopulate = require('mongoose-deep-populate');

var user = require('./users');

var khatmahSchema = new Schema({
  owner: String,
  name: String,
  date: {type: Date, default: Date.now},
  status: String,
  participants: [{user:{type:Number,ref:'user'}, status:String, ahzab:[Number]}]
});

khatmahSchema.plugin(deepPopulate);
mongoose.model('khatmah', khatmahSchema);
