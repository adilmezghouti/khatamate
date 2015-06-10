var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');
var Schema = mongoose.Schema;

var userSchema = new Schema({
	id: {type:String, required: true, unique: true},
	name: {type:String, required: true, unique: true},
	picture: String,
	nbrOfKhatmatesFinished: Number,
	token: String,
	timeleft: String,
	lastup: Date,
	creation_date: {type: Date, default:Date.now}
});

userSchema.plugin(uniqueValidator);

mongoose.model('user', userSchema);
