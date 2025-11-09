
const moment = require("moment-timezone");

// Must match the setting in loanadmin.js
const BAN_COOLDOWN_DAYS = 30;

module.exports = {
	config: {
		name: "checkOverdueLoans",
		version: "2.4.71",
		author: "ST BOT",
		category: "events",
		description: {
			en: "Automatically ban users with overdue loans"
		}
	},

	onStart: async function ({ api }) {
		const { bankData, usersData } = global.db;
		const adminConfig = global.GoatBot.config.adminBot;
		const allBanks = global.db.allBankData;

		setInterval(async () => {
			const now = new Date();

			for (const bank of allBanks) {
				// Skip if user is admin
				if (adminConfig.includes(bank.userID)) {
					continue;
				}

				// Skip if already banned
				if (bank.banned.isBanned) {
					continue;
				}

				// Check if loan is overdue
				if (bank.loan.amount > 0 && bank.loan.dueDate) {
					const dueDate = new Date(bank.loan.dueDate);
					
					if (now > dueDate) {
						// Ban the user
						const canUnbanAt = new Date();
						canUnbanAt.setDate(canUnbanAt.getDate() + BAN_COOLDOWN_DAYS);

						bank.banned = {
							isBanned: true,
							reason: `Failed to repay loan of $${bank.loan.amount.toLocaleString()} within ${moment(bank.loan.takenAt).diff(dueDate, 'days')} days`,
							bannedAt: now,
							canUnbanAt
						};

						await bankData.set(bank.userID, bank);

						// Notify user
						if (bank.loan.threadID) {
							try {
								const user = await usersData.get(bank.userID);
								api.sendMessage(
									`🚫 BANK BAN NOTICE\n━━━━━━━━━━━━━━━━\n` +
									`@${user.name}, you have been banned from bank services!\n\n` +
									`📛 Reason: Failed to repay loan within deadline\n` +
									`💳 Overdue Amount: $${bank.loan.amount.toLocaleString()}\n` +
									`📅 Due Date: ${moment(dueDate).format("MMM DD, YYYY")}\n` +
									`⏰ Can request unban after: ${moment(canUnbanAt).format("MMM DD, YYYY")}\n\n` +
									`Contact admin to resolve this issue.`,
									bank.loan.threadID,
									{
										mentions: [{
											tag: `@${user.name}`,
											id: bank.userID
										}]
									}
								);
							} catch (err) {
								console.error("Error sending ban notification:", err);
							}
						}
					}
				}
			}
		}, 60 * 60 * 1000); // Check every hour
	}
};
