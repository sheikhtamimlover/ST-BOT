
module.exports = function (sequelize) {
	const { Model, DataTypes } = require("sequelize");
	class bankModel extends Model { }
	bankModel.init({
		userID: {
			type: DataTypes.STRING,
			primaryKey: true
		},
		bankBalance: {
			type: DataTypes.BIGINT,
			defaultValue: 0
		},
		loan: {
			type: DataTypes.JSON,
			defaultValue: {
				amount: 0,
				takenAt: null,
				interestRate: 5,
				dueDate: null,
				threadID: null
			}
		},
		loanRequests: {
			type: DataTypes.JSON,
			defaultValue: []
		},
		banned: {
			type: DataTypes.JSON,
			defaultValue: {
				isBanned: false,
				reason: null,
				bannedAt: null,
				canUnbanAt: null
			}
		},
		investments: {
			type: DataTypes.JSON,
			defaultValue: []
		},
		deposits: {
			type: DataTypes.JSON,
			defaultValue: []
		},
		transactions: {
			type: DataTypes.JSON,
			defaultValue: []
		},
		dailyClaim: {
			type: DataTypes.JSON,
			defaultValue: {
				lastClaimed: null,
				streak: 0
			}
		},
		lottery: {
			type: DataTypes.JSON,
			defaultValue: {
				lastPlayed: null,
				totalWins: 0
			}
		},
		premiumCurrency: {
			type: DataTypes.BIGINT,
			defaultValue: 0
		},
		totalDeposited: {
			type: DataTypes.BIGINT,
			defaultValue: 0
		},
		totalWithdrawn: {
			type: DataTypes.BIGINT,
			defaultValue: 0
		},
		registeredAt: {
			type: DataTypes.DATE,
			defaultValue: DataTypes.NOW
		}
	}, {
		sequelize,
		modelName: "bank"
	});

	return bankModel;
};
