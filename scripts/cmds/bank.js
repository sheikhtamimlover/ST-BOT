
const moment = require("moment-timezone");

module.exports = {
	config: {
		name: "bank",
		aliases: [],
		version: "2.4.71",
		author: "ST BOT",
		countDown: 5,
		role: 0,
		description: {
			en: "ST BOT Banking System - Complete banking solution with loans, investments, games, and more"
		},
		category: "economy",
		guide: {
			en: "   {pn} register - Register for bank account\n"
				+ "   {pn} balance [@mention] - Check bank balance\n"
				+ "   {pn} deposit <amount> [duration] - Deposit money (duration: 1h, 1d, 1w, 1m, permanent)\n"
				+ "   {pn} withdraw <amount> - Withdraw money from bank\n"
				+ "   {pn} tobank <amount> - Move money from wallet to bank (1% fee per $1000)\n"
				+ "   {pn} towallet <amount> - Move money from bank to wallet (1% fee per $1000)\n"
				+ "   {pn} transfer <@mention|reply> <amount> - Transfer money\n"
				+ "   {pn} loan <amount> - Take a loan (5% interest)\n"
				+ "   {pn} payloan <amount> - Pay back loan\n"
				+ "   {pn} invest <amount> <duration> - Invest money (1h-1m)\n"
				+ "   {pn} daily - Claim daily reward\n"
				+ "   {pn} lottery - Play free daily lottery\n"
				+ "   {pn} spin <bet> - Spin slot machine\n"
				+ "   {pn} coinflip <bet> <heads|tails> - Flip a coin\n"
				+ "   {pn} trade <buy|sell> <amount> - Trade coins\n"
				+ "   {pn} transactions - View transaction history\n"
				+ "   {pn} leaderboard - View bank rankings"
		}
	},

	langs: {
		en: {
			notRegistered: "❌ You don't have a bank account! Use '/bank register' to create one.",
			registered: "✅ Bank account created successfully!\n💰 Welcome bonus: $500",
			alreadyRegistered: "❌ You already have a bank account!",
			balance: "🏦 Bank Balance\n━━━━━━━━━━━━━━━\n👤 User: %1\n💰 Balance: $%2\n📊 Total Deposited: $%3\n📤 Total Withdrawn: $%4\n💳 Loan: $%5\n📅 Member Since: %6",
			depositSuccess: "✅ Deposited $%1 to your bank account!\n💰 New Balance: $%2",
			withdrawSuccess: "✅ Withdrawn $%1 from your bank account!\n💰 New Balance: $%2",
			insufficientFunds: "❌ Insufficient funds in your wallet!",
			insufficientBank: "❌ Insufficient funds in your bank account!",
			transferSuccess: "✅ Transferred $%1 to %2\n💰 Your New Balance: $%3",
			loanTaken: "✅ Loan of $%1 approved!\n💳 Interest Rate: 5%\n⚠️ Total to repay: $%2",
			hasLoan: "❌ You already have an active loan! Pay it back first.",
			loanPaid: "✅ Paid $%1 towards your loan!\n💳 Remaining: $%2",
			noLoan: "❌ You don't have any active loan!",
			investSuccess: "✅ Invested $%1 for %2\n📈 Expected Return: $%3\n⏰ Matures at: %4",
			dailyClaimed: "🎁 Daily Reward Claimed!\n💰 +$%1\n🔥 Streak: %2 days\n⏰ Come back tomorrow!",
			alreadyClaimed: "❌ You already claimed your daily reward!\n⏰ Come back in %1",
			lotteryWon: "🎉 JACKPOT! You won $%1 from the lottery!\n🍀 Lucky number: %2",
			lotteryLost: "😔 Better luck next time!\n🍀 Your number: %1 | Winning number: %2",
			alreadyPlayedLottery: "❌ You already played lottery today!\n⏰ Come back tomorrow!",
			spinResult: "🎰 SLOT MACHINE\n━━━━━━━━━━━━\n%1\n━━━━━━━━━━━━\n%2",
			coinflipWin: "🪙 Coin landed on %1!\n✅ You won $%2!",
			coinflipLose: "🪙 Coin landed on %1!\n❌ You lost $%2!",
			tradeSuccess: "📊 Trade executed!\n%1 %2 coins\n💰 New Balance: $%3"
		}
	},

	ST: async function ({ args, message, event, usersData, getLang, api }) {
		const { bankData } = global.db;
		const { senderID, messageReply } = event;
		const command = args[0]?.toLowerCase();

		// Register
		if (command === "register") {
			const existingBankData = await bankData.get(senderID);
			if (existingBankData && existingBankData.userID) {
				return message.reply(getLang("alreadyRegistered"));
			}
			await bankData.create(senderID);
			await usersData.addMoney(senderID, 500);
			return message.reply(getLang("registered"));
		}

		// Check if user is registered
		const userBankDataCheck = await bankData.get(senderID);
		if (!userBankDataCheck || !userBankDataCheck.userID) {
			return message.reply(getLang("notRegistered"));
		}

		const userData = await usersData.get(senderID);
		const userBankData = await bankData.get(senderID);

		switch (command) {
			case "balance":
			case "bal": {
				let targetID = senderID;
				if (Object.keys(event.mentions).length > 0) {
					targetID = Object.keys(event.mentions)[0];
				} else if (messageReply) {
					targetID = messageReply.senderID;
				}

				const targetBankDataCheck = await bankData.get(targetID);
				if (!targetBankDataCheck || !targetBankDataCheck.userID) {
					return message.reply("❌ User doesn't have a bank account!");
				}

				const targetBankData = await bankData.get(targetID);
				const targetUserData = await usersData.get(targetID);
				const memberSince = moment(targetBankData.registeredAt).format("MMM DD, YYYY");

				return message.reply(getLang("balance",
					targetUserData.name,
					targetBankData.bankBalance.toLocaleString(),
					targetBankData.totalDeposited.toLocaleString(),
					targetBankData.totalWithdrawn.toLocaleString(),
					targetBankData.loan.amount.toLocaleString(),
					memberSince
				));
			}

			case "deposit": {
				const amount = parseInt(args[1]);
				if (isNaN(amount) || amount <= 0) {
					return message.reply("❌ Invalid amount!");
				}
				if (userData.money < amount) {
					return message.reply(getLang("insufficientFunds"));
				}

				const duration = args[2];
				const depositData = {
					amount,
					depositedAt: new Date(),
					duration: duration || "permanent",
					withdrawable: !duration || duration === "permanent"
				};

				if (duration && duration !== "permanent") {
					const durationMs = parseDuration(duration);
					if (!durationMs) {
						return message.reply("❌ Invalid duration! Use: 1h, 1d, 1w, 1m, or permanent");
					}
					depositData.maturesAt = new Date(Date.now() + durationMs);
					depositData.interest = calculateInterest(amount, duration);
				}

				await usersData.subtractMoney(senderID, amount);
				userBankData.deposits.push(depositData);
				userBankData.bankBalance += amount;
				userBankData.totalDeposited += amount;
				await bankData.set(senderID, userBankData);
				await bankData.addTransaction(senderID, {
					type: "deposit",
					amount,
					duration: duration || "permanent"
				});

				return message.reply(getLang("depositSuccess", amount.toLocaleString(), userBankData.bankBalance.toLocaleString()));
			}

			case "withdraw": {
				const amount = parseInt(args[1]);
				if (isNaN(amount) || amount <= 0) {
					return message.reply("❌ Invalid amount!");
				}
				if (userBankData.bankBalance < amount) {
					return message.reply(getLang("insufficientBank"));
				}

				// Check for locked deposits
				const availableBalance = calculateAvailableBalance(userBankData);
				if (availableBalance < amount) {
					return message.reply(`❌ Only $${availableBalance.toLocaleString()} is available for withdrawal!\nSome funds are locked in time deposits.`);
				}

				await usersData.addMoney(senderID, amount);
				userBankData.bankBalance -= amount;
				userBankData.totalWithdrawn += amount;
				await bankData.set(senderID, userBankData);
				await bankData.addTransaction(senderID, {
					type: "withdraw",
					amount
				});

				return message.reply(getLang("withdrawSuccess", amount.toLocaleString(), userBankData.bankBalance.toLocaleString()));
			}

			case "transfer": {
				let targetID = Object.keys(event.mentions)[0];
				let amount = parseInt(args[2]);

				if (messageReply) {
					targetID = messageReply.senderID;
					amount = parseInt(args[1]);
				}

				if (!targetID) {
					return message.reply("❌ Please mention someone or reply to their message!");
				}
				if (isNaN(amount) || amount <= 0) {
					return message.reply("❌ Invalid amount!");
				}
				if (userBankData.bankBalance < amount) {
					return message.reply(getLang("insufficientBank"));
				}
				const targetBankCheck = await bankData.get(targetID);
				if (!targetBankCheck || !targetBankCheck.userID) {
					return message.reply("❌ Target user doesn't have a bank account!");
				}

				const targetBankData = await bankData.get(targetID);
				const targetUserData = await usersData.get(targetID);

				userBankData.bankBalance -= amount;
				targetBankData.bankBalance += amount;

				await bankData.set(senderID, userBankData);
				await bankData.set(targetID, targetBankData);
				await bankData.addTransaction(senderID, {
					type: "transfer_out",
					amount,
					to: targetID
				});
				await bankData.addTransaction(targetID, {
					type: "transfer_in",
					amount,
					from: senderID
				});

				return message.reply(getLang("transferSuccess", amount.toLocaleString(), targetUserData.name, userBankData.bankBalance.toLocaleString()));
			}

			case "loan": {
				const amount = parseInt(args[1]);
				if (isNaN(amount) || amount <= 0) {
					return message.reply("❌ Invalid amount!");
				}
				if (userBankData.banned.isBanned) {
					const canUnban = new Date(userBankData.banned.canUnbanAt);
					const now = new Date();
					if (now < canUnban) {
						return message.reply(`❌ You are banned from bank services!\n📛 Reason: ${userBankData.banned.reason}\n⏰ Can request unban after: ${moment(canUnban).format("MMM DD, YYYY HH:mm")}`);
					}
				}
				if (userBankData.loan.amount > 0) {
					return message.reply(getLang("hasLoan"));
				}
				if (userBankData.loanRequests.some(r => r.status === "pending")) {
					return message.reply("❌ You already have a pending loan request!");
				}

				const interestAmount = Math.floor(amount * 0.05);
				const totalRepay = amount + interestAmount;
				const requestID = Date.now().toString();

				const loanRequest = {
					requestID,
					amount,
					totalRepay,
					requestedAt: new Date(),
					status: "pending",
					threadID: event.threadID
				};

				userBankData.loanRequests.push(loanRequest);
				await bankData.set(senderID, userBankData);

				// Send to admin thread
				const mainThreadID = global.GoatBot.config.mainThreadId;
				const threadData = await api.getThreadInfo(event.threadID);
				const threadName = threadData.threadName || "Unknown Thread";

				api.sendMessage(
					`🏦 NEW LOAN REQUEST\n━━━━━━━━━━━━━━━━\n` +
					`👤 User: ${userData.name}\n` +
					`💰 Amount: $${amount.toLocaleString()}\n` +
					`💳 Total to Repay: $${totalRepay.toLocaleString()}\n` +
					`📍 Thread: ${threadName}\n` +
					`🆔 Request ID: ${requestID}\n` +
					`⏰ Requested: ${moment().format("MMM DD, YYYY HH:mm")}\n\n` +
					`Reply "yes" to approve or "no" to reject`,
					mainThreadID,
					(err, info) => {
						if (!err) {
							global.GoatBot.onReply.set(info.messageID, {
								commandName: "bank",
								messageID: info.messageID,
								author: senderID,
								requestID,
								type: "loanApproval",
								amount,
								totalRepay,
								threadID: event.threadID
							});
						}
					}
				);

				return message.reply(`✅ Loan request submitted!\n💰 Amount: $${amount.toLocaleString()}\n💳 Total to Repay: $${totalRepay.toLocaleString()}\n⏰ Waiting for admin approval...`);
			}

			case "payloan": {
				if (userBankData.loan.amount === 0) {
					return message.reply(getLang("noLoan"));
				}

				let payAmount;

				// Check if user wants to pay full amount (no args or "full" or "all")
				if (!args[1] || args[1].toLowerCase() === "full" || args[1].toLowerCase() === "all") {
					payAmount = userBankData.loan.amount;
					if (userBankData.bankBalance < payAmount) {
						return message.reply(`❌ Insufficient bank balance to pay full loan!\n💳 Loan Amount: $${userBankData.loan.amount.toLocaleString()}\n💰 Your Balance: $${userBankData.bankBalance.toLocaleString()}\n📝 Use: bank payloan <amount> to pay partial`);
					}
				} else {
					// Manual amount entry
					const amount = parseInt(args[1]);
					if (isNaN(amount) || amount <= 0) {
						return message.reply("❌ Invalid amount! Use a number or leave empty to pay full loan.");
					}
					if (userBankData.bankBalance < amount) {
						return message.reply(getLang("insufficientBank"));
					}
					payAmount = Math.min(amount, userBankData.loan.amount);
				}

				userBankData.bankBalance -= payAmount;
				userBankData.loan.amount -= payAmount;
				
				const isFullyPaid = userBankData.loan.amount === 0;
				
				if (isFullyPaid) {
					userBankData.loan.takenAt = null;
					userBankData.loan.dueDate = null;
					userBankData.loan.threadID = null;
				}
				
				await bankData.set(senderID, userBankData);
				await bankData.addTransaction(senderID, {
					type: "loan_payment",
					amount: payAmount
				});

				if (isFullyPaid) {
					return message.reply(`✅ Loan fully paid!\n💰 Paid: $${payAmount.toLocaleString()}\n🎉 You're debt-free!\n💰 New Balance: $${userBankData.bankBalance.toLocaleString()}`);
				} else {
					return message.reply(getLang("loanPaid", payAmount.toLocaleString(), userBankData.loan.amount.toLocaleString()));
				}
			}

			case "tobank": {
				const amount = parseInt(args[1]);
				if (isNaN(amount) || amount <= 0) {
					return message.reply("❌ Invalid amount!");
				}
				if (userData.money < amount) {
					return message.reply(getLang("insufficientFunds"));
				}

				// 1% fee per $1000
				const fee = Math.floor((amount / 1000) * 10);
				const totalCost = amount + fee;

				if (userData.money < totalCost) {
					return message.reply(`❌ You need $${totalCost.toLocaleString()} (including $${fee.toLocaleString()} fee)!`);
				}

				await usersData.subtractMoney(senderID, totalCost);
				userBankData.bankBalance += amount;
				await bankData.set(senderID, userBankData);
				await bankData.addTransaction(senderID, {
					type: "wallet_to_bank",
					amount
				});

				return message.reply(`✅ Transferred $${amount.toLocaleString()} to bank!\n💸 Fee: $${fee.toLocaleString()}\n💰 New Bank Balance: $${userBankData.bankBalance.toLocaleString()}`);
			}

			case "towallet": {
				const amount = parseInt(args[1]);
				if (isNaN(amount) || amount <= 0) {
					return message.reply("❌ Invalid amount!");
				}
				if (userBankData.bankBalance < amount) {
					return message.reply(getLang("insufficientBank"));
				}

				// 1% fee per $1000
				const fee = Math.floor((amount / 1000) * 10);
				const amountAfterFee = amount - fee;

				if (amountAfterFee <= 0) {
					return message.reply("❌ Amount too small after fee deduction!");
				}

				userBankData.bankBalance -= amount;
				await usersData.addMoney(senderID, amountAfterFee);
				await bankData.set(senderID, userBankData);
				await bankData.addTransaction(senderID, {
					type: "bank_to_wallet",
					amount: amountAfterFee
				});

				return message.reply(`✅ Transferred $${amountAfterFee.toLocaleString()} to wallet!\n💸 Fee: $${fee.toLocaleString()}\n💵 New Wallet Balance: $${(userData.money + amountAfterFee).toLocaleString()}`);
			}

			case "invest": {
				const amount = parseInt(args[1]);
				const duration = args[2];

				if (isNaN(amount) || amount <= 0) {
					return message.reply("❌ Invalid amount!");
				}
				if (userBankData.bankBalance < amount) {
					return message.reply(getLang("insufficientBank"));
				}
				if (!duration) {
					return message.reply("❌ Please specify duration! (1h, 1d, 1w, 1m)");
				}

				const durationMs = parseDuration(duration);
				if (!durationMs) {
					return message.reply("❌ Invalid duration! Use: 1h, 1d, 1w, 1m");
				}

				const returnRate = getInvestmentReturn(duration);
				const expectedReturn = Math.floor(amount * returnRate);
				const maturesAt = new Date(Date.now() + durationMs);

				const investment = {
					amount,
					investedAt: new Date(),
					maturesAt,
					expectedReturn,
					duration
				};

				userBankData.investments.push(investment);
				userBankData.bankBalance -= amount;
				await bankData.set(senderID, userBankData);
				await bankData.addTransaction(senderID, {
					type: "investment",
					amount,
					duration
				});

				return message.reply(getLang("investSuccess",
					amount.toLocaleString(),
					duration,
					expectedReturn.toLocaleString(),
					moment(maturesAt).format("MMM DD, YYYY HH:mm")
				));
			}

			case "daily": {
				const today = moment.tz("Asia/Dhaka").format("DD/MM/YYYY");
				if (userBankData.dailyClaim.lastClaimed === today) {
					const tomorrow = moment.tz("Asia/Dhaka").add(1, 'day').startOf('day');
					const timeLeft = tomorrow.diff(moment.tz("Asia/Dhaka"));
					const hours = Math.floor(timeLeft / (1000 * 60 * 60));
					const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
					return message.reply(getLang("alreadyClaimed", `${hours}h ${minutes}m`));
				}

				userBankData.dailyClaim.streak += 1;
				userBankData.dailyClaim.lastClaimed = today;
				const reward = 100 + (userBankData.dailyClaim.streak * 10);

				userBankData.bankBalance += reward;
				await bankData.set(senderID, userBankData);
				await bankData.addTransaction(senderID, {
					type: "daily_claim",
					amount: reward
				});

				return message.reply(getLang("dailyClaimed", reward.toLocaleString(), userBankData.dailyClaim.streak));
			}

			case "lottery": {
				const today = moment.tz("Asia/Dhaka").format("DD/MM/YYYY");
				if (userBankData.lottery.lastPlayed === today) {
					return message.reply(getLang("alreadyPlayedLottery"));
				}

				const userNumber = Math.floor(Math.random() * 100);
				const winningNumber = Math.floor(Math.random() * 100);

				if (Math.abs(userNumber - winningNumber) <= 10) {
					const prize = 1000;
					userBankData.bankBalance += prize;
					userBankData.lottery.totalWins += 1;
					userBankData.lottery.lastPlayed = today;
					await bankData.set(senderID, userBankData);
					await bankData.addTransaction(senderID, {
						type: "lottery_win",
						amount: prize
					});
					return message.reply(getLang("lotteryWon", prize.toLocaleString(), winningNumber));
				}

				userBankData.lottery.lastPlayed = today;
				await bankData.set(senderID, userBankData);
				return message.reply(getLang("lotteryLost", userNumber, winningNumber));
			}

			case "spin": {
				const bet = parseInt(args[1]);
				if (isNaN(bet) || bet <= 0) {
					return message.reply("❌ Invalid bet amount!");
				}
				if (userBankData.bankBalance < bet) {
					return message.reply(getLang("insufficientBank"));
				}

				// Send initial spinning message
				const spinningMsg = await message.reply("🎰 SPINNING...\n━━━━━━━━━━━━\n🔄 🔄 🔄\n━━━━━━━━━━━━\n⏳ Please wait...");

				// Wait for dramatic effect
				await new Promise(resolve => setTimeout(resolve, 2000));

				const slots = ["🍒", "🍋", "🍊", "🍇", "💎", "⭐"];
				let winnings = 0;
				let resultText = "";
				let result = [];

				// 30% win rate, 70% lose rate
				const winChance = Math.random();

				if (winChance < 0.30) {
					// WIN - 30% chance
					const winType = Math.random();
					if (winType < 0.05) {
						// 5% chance for jackpot
						const jackpotSlot = slots[4]; // 💎
						result = [jackpotSlot, jackpotSlot, jackpotSlot];
						winnings = bet * 10;
						resultText = `💎 JACKPOT! 💎\n✅ You won $${winnings.toLocaleString()}!\n💰 New Balance: $${(userBankData.bankBalance + winnings).toLocaleString()}`;
					} else if (winType < 0.20) {
						// 15% chance for triple match
						const tripleSlot = slots[Math.floor(Math.random() * 3)]; // Lower value slots
						result = [tripleSlot, tripleSlot, tripleSlot];
						winnings = bet * 5;
						resultText = `🎉 Triple Match!\n✅ You won $${winnings.toLocaleString()}!\n💰 New Balance: $${(userBankData.bankBalance + winnings).toLocaleString()}`;
					} else {
						// 80% chance for double match (within wins)
						const doubleSlot = slots[Math.floor(Math.random() * slots.length)];
						result = [doubleSlot, doubleSlot, slots[Math.floor(Math.random() * slots.length)]];
						winnings = bet * 2;
						resultText = `👍 Double Match!\n✅ You won $${winnings.toLocaleString()}!\n💰 New Balance: $${(userBankData.bankBalance + winnings).toLocaleString()}`;
					}
				} else {
					// LOSE - 70% chance
					result = [
						slots[Math.floor(Math.random() * slots.length)],
						slots[Math.floor(Math.random() * slots.length)],
						slots[Math.floor(Math.random() * slots.length)]
					];
					// Ensure no matches
					while ((result[0] === result[1] && result[1] === result[2]) || 
					       (result[0] === result[1] || result[1] === result[2] || result[0] === result[2])) {
						result = [
							slots[Math.floor(Math.random() * slots.length)],
							slots[Math.floor(Math.random() * slots.length)],
							slots[Math.floor(Math.random() * slots.length)]
						];
					}
					winnings = -bet;
					resultText = `😔 No match!\n❌ You lost $${bet.toLocaleString()}!\n💰 New Balance: $${(userBankData.bankBalance + winnings).toLocaleString()}`;
				}

				userBankData.bankBalance += winnings;
				await bankData.set(senderID, userBankData);
				await bankData.addTransaction(senderID, {
					type: "slot_game",
					amount: winnings
				});

				// Edit message with result
				const finalMsg = `🎰 SLOT MACHINE\n━━━━━━━━━━━━\n${result.join(" | ")}\n━━━━━━━━━━━━\n${resultText}`;
				return api.editMessage(finalMsg, spinningMsg.messageID);
			}

			case "coinflip": {
				const bet = parseInt(args[1]);
				const choice = args[2]?.toLowerCase();

				if (isNaN(bet) || bet <= 0) {
					return message.reply("❌ Invalid bet amount!");
				}
				if (!["heads", "tails"].includes(choice)) {
					return message.reply("❌ Choose heads or tails!");
				}
				if (userBankData.bankBalance < bet) {
					return message.reply(getLang("insufficientBank"));
				}

				const result = Math.random() < 0.5 ? "heads" : "tails";
				const won = result === choice;

				if (won) {
					userBankData.bankBalance += bet;
					await bankData.set(senderID, userBankData);
					await bankData.addTransaction(senderID, {
						type: "coinflip_win",
						amount: bet
					});
					return message.reply(getLang("coinflipWin", result, bet.toLocaleString()));
				} else {
					userBankData.bankBalance -= bet;
					await bankData.set(senderID, userBankData);
					await bankData.addTransaction(senderID, {
						type: "coinflip_loss",
						amount: bet
					});
					return message.reply(getLang("coinflipLose", result, bet.toLocaleString()));
				}
			}

			case "trade": {
				const action = args[1]?.toLowerCase();
				const amount = parseInt(args[2]);

				if (!["buy", "sell"].includes(action)) {
					return message.reply("❌ Use 'buy' or 'sell'!");
				}
				if (isNaN(amount) || amount <= 0) {
					return message.reply("❌ Invalid amount!");
				}

				const rate = 1 + (Math.random() * 0.2 - 0.1); // ±10% fluctuation
				const cost = Math.floor(amount * rate);

				if (action === "buy") {
					if (userBankData.bankBalance < cost) {
						return message.reply(getLang("insufficientBank"));
					}
					userBankData.bankBalance -= cost;
					userBankData.premiumCurrency += amount;
				} else {
					if (userBankData.premiumCurrency < amount) {
						return message.reply("❌ Insufficient premium currency!");
					}
					userBankData.premiumCurrency -= amount;
					userBankData.bankBalance += cost;
				}

				await bankData.set(senderID, userBankData);
				await bankData.addTransaction(senderID, {
					type: `trade_${action}`,
					amount: action === "buy" ? cost : amount
				});

				return message.reply(getLang("tradeSuccess",
					action === "buy" ? "Bought" : "Sold",
					amount,
					userBankData.bankBalance.toLocaleString()
				));
			}

			case "transactions":
			case "history": {
				if (!userBankData.transactions || userBankData.transactions.length === 0) {
					return message.reply("❌ No transactions yet!");
				}

				let msg = "📜 Transaction History (Last 10)\n━━━━━━━━━━━━━━━━\n";
				userBankData.transactions.slice(0, 10).forEach((tx, i) => {
					const time = moment(tx.timestamp).format("MMM DD, HH:mm");
					const sign = tx.type.includes("win") || tx.type.includes("deposit") || tx.type.includes("in") ? "+" : "-";
					msg += `${i + 1}. ${tx.type.toUpperCase()}: ${sign}$${Math.abs(tx.amount).toLocaleString()} - ${time}\n`;
				});

				return message.reply(msg);
			}

			case "leaderboard":
			case "top": {
				const allBanks = global.db.allBankData.sort((a, b) => b.bankBalance - a.bankBalance).slice(0, 10);
				let msg = "🏆 Bank Leaderboard (Top 10)\n━━━━━━━━━━━━━━━━\n";

				for (let i = 0; i < allBanks.length; i++) {
					const user = await usersData.get(allBanks[i].userID);
					const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
					msg += `${medal} ${user.name}: $${allBanks[i].bankBalance.toLocaleString()}\n`;
				}

				return message.reply(msg);
			}

			default:
				return message.SyntaxError();
		}
	},

	onReply: async function ({ event, Reply, message, usersData, api }) {
		const { bankData } = global.db;
		const adminConfig = global.GoatBot.config.adminBot;
		
		if (!adminConfig.includes(event.senderID)) {
			return;
		}

		if (Reply.type === "loanApproval") {
			const response = event.body.toLowerCase().trim();
			const { requestID, amount, totalRepay, threadID, author: requesterID } = Reply;

			if (!["yes", "no"].includes(response)) {
				return message.reply("❌ Reply 'yes' to approve or 'no' to reject!");
			}

			const requesterBankData = await bankData.get(requesterID);
			const requestIndex = requesterBankData.loanRequests.findIndex(r => r.requestID === requestID);

			if (requestIndex === -1) {
				return message.reply("❌ Loan request not found!");
			}

			const requesterUserData = await usersData.get(requesterID);
			const LOAN_DUE_DAYS = 7;

			if (response === "yes") {
				// Approve loan
				const dueDate = new Date();
				dueDate.setDate(dueDate.getDate() + LOAN_DUE_DAYS);

				requesterBankData.loan = {
					amount: totalRepay,
					takenAt: new Date(),
					interestRate: 5,
					dueDate,
					threadID
				};
				requesterBankData.loanRequests[requestIndex].status = "approved";
				requesterBankData.bankBalance += amount;

				await bankData.set(requesterID, requesterBankData);
				await bankData.addTransaction(requesterID, {
					type: "loan_approved",
					amount,
					totalRepay
				});

				// Notify user with mention
				const requesterUserData = await usersData.get(requesterID);
				api.sendMessage(
					{
						body: `@${requesterUserData.name} ✅ LOAN APPROVED!\n━━━━━━━━━━━━━━━━\n` +
							`💰 Amount: $${amount.toLocaleString()}\n` +
							`💳 Total to Repay: $${totalRepay.toLocaleString()}\n` +
							`📅 Due Date: ${moment(dueDate).format("MMM DD, YYYY")}\n` +
							`⚠️ Pay within ${LOAN_DUE_DAYS} days or face ban!`,
						mentions: [{
							tag: `@${requesterUserData.name}`,
							id: requesterID
						}]
					},
					threadID
				);

				return message.reply(`✅ Loan approved for ${requesterUserData.name}!`);
			} else {
				// Reject loan
				requesterBankData.loanRequests[requestIndex].status = "rejected";
				await bankData.set(requesterID, requesterBankData);

				// Notify user with mention
				const requesterUserData = await usersData.get(requesterID);
				api.sendMessage(
					{
						body: `@${requesterUserData.name} ❌ LOAN REJECTED\n━━━━━━━━━━━━━━━━\n` +
							`Your loan request for $${amount.toLocaleString()} was rejected.\n` +
							`You can reapply for a loan anytime.`,
						mentions: [{
							tag: `@${requesterUserData.name}`,
							id: requesterID
						}]
					},
					threadID
				);

				return message.reply(`❌ Loan rejected for ${requesterUserData.name}.`);
			}
		}
	}
};

function parseDuration(duration) {
	const units = {
		'h': 60 * 60 * 1000,
		'd': 24 * 60 * 60 * 1000,
		'w': 7 * 24 * 60 * 60 * 1000,
		'm': 30 * 24 * 60 * 60 * 1000
	};

	const match = duration.match(/^(\d+)([hdwm])$/);
	if (!match) return null;

	const value = parseInt(match[1]);
	const unit = match[2];

	return value * units[unit];
}

function calculateInterest(amount, duration) {
	const rates = {
		'1h': 0.01,
		'1d': 0.02,
		'1w': 0.05,
		'1m': 0.15
	};
	return Math.floor(amount * (rates[duration] || 0));
}

function getInvestmentReturn(duration) {
	const rates = {
		'1h': 1.05,
		'1d': 1.1,
		'1w': 1.25,
		'1m': 1.5
	};
	return rates[duration] || 1.1;
}

function calculateAvailableBalance(userBankData) {
	let locked = 0;
	const now = new Date();

	userBankData.deposits.forEach(deposit => {
		if (!deposit.withdrawable && deposit.maturesAt && new Date(deposit.maturesAt) > now) {
			locked += deposit.amount;
		}
	});

	return userBankData.bankBalance - locked;
}
