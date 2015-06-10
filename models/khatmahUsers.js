var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var khatmahUserSchema = new Schema({
  khatmah: {
    type: Schema.ObjectId,
    ref: "khatmah"
  },
  user: String,
  from: String,
  to: String,
  progress: String,
  status: String
});

mongoose.model('khatmahUser', khatmahUserSchema);
