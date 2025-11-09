
const mongoose = require("mongoose");
const { Schema } = mongoose;

const bankModel = new Schema({
	userID: {
		type: String,
		unique: true,
		required: true
	},
	bankBalance: {
		type: Number,
		default: 0
	},
	loan: {
		amount: {
			type: Number,
			default: 0
		},
		takenAt: {
			type: Date,
			default: null
		},
		interestRate: {
			type: Number,
			default: 5
		},
		dueDate: {
			type: Date,
			default: null
		},
		threadID: {
			type: String,
			default: null
		}
	},
	loanRequests: {
		type: Array,
		default: []
	},
	banned: {
		isBanned: {
			type: Boolean,
			default: false
		},
		reason: {
			type: String,
			default: null
		},
		bannedAt: {
			type: Date,
			default: null
		},
		canUnbanAt: {
			type: Date,
			default: null
		}
	},
	investments: {
		type: Array,
		default: []
	},
	deposits: {
		type: Array,
		default: []
	},
	transactions: {
		type: Array,
		default: []
	},
	dailyClaim: {
		lastClaimed: {
			type: String,
			default: null
		},
		streak: {
			type: Number,
			default: 0
		}
	},
	lottery: {
		lastPlayed: {
			type: String,
			default: null
		},
		totalWins: {
			type: Number,
			default: 0
		}
	},
	premiumCurrency: {
		type: Number,
		default: 0
	},
	totalDeposited: {
		type: Number,
		default: 0
	},
	totalWithdrawn: {
		type: Number,
		default: 0
	},
	registeredAt: {
		type: Date,
		default: Date.now
	}
}, {
	timestamps: true,
	minimize: false
});

module.exports = mongoose.model("banks", bankModel);
