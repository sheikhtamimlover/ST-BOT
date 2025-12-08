
const mongoose = require("mongoose");
const { Schema } = mongoose;

const staiHistoryModel = new Schema({
	userID: String,
	userName: String,
	threadID: String,
	threadName: String,
	actionType: String, // 'create_command', 'fix_command', 'create_event', 'fix_event', 'image'
	itemType: String, // 'command' or 'event'
	fileName: String,
	gistUrl: String,
	gistRawUrl: String,
	serialNumber: {
		type: Number,
		unique: true
	},
	description: String,
	success: {
		type: Boolean,
		default: true
	}
}, {
	timestamps: true,
	minimize: false
});

module.exports = mongoose.model("staiHistory", staiHistoryModel);
