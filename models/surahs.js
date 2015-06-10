var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var surahSchema = new Schema({
  hizb: String,
  surahNum: String,
  surah: String
});

mongoose.model('surah', surahSchema);
