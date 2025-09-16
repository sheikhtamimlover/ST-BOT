
module.exports = {
	config: {
		name: "premium",
		version: "2.4.50",
		author: "ST | Sheikh Tamim",
		countDown: 5,
		role: 0,
		description: "Premium system management - request for all users, manage for admins",
		category: "system",
		guide: {
			en: "   {pn} request [message]: Request premium access (available to all)"
				+ "\n   {pn} add <uid/@mention>: Add user to premium (admin only)"
				+ "\n   {pn} remove <uid/@mention>: Remove user from premium (admin only)"
				+ "\n   {pn} list: Show premium users list (admin only)"
				+ "\n   {pn} pending: Show pending premium requests (admin only)"
		}
	},

	langs: {
		en: {
			requestSent: "✅ Your premium request has been sent to admins!",
			requestExists: "⚠️ You already have a pending premium request!",
			alreadyPremium: "✅ You already have premium access!",
			noPermission: "❌ You don't have permission to use this command!",
			userNotFound: "❌ User not found!",
			addedPremium: "✅ User %1 (%2) has been added to premium!",
			removedPremium: "✅ User %1 (%2) has been removed from premium!",
			userNotPremium: "❌ User %1 (%2) is not a premium member!",
			noPremiumUsers: "📝 No premium users found!",
			premiumList: "🌟 Premium Users List (Page %1/%2):\n\n%3",
			noPendingRequests: "📝 No pending premium requests!",
			pendingRequests: "📋 Pending Premium Requests:\n\n%1",
			invalidPage: "❌ Invalid page number!",
			replyToRemove: "Reply with:\n• r <numbers>: Remove users (e.g., r 1 2 3)\n• p <number>: Change page",
			replyToManage: "Reply with:\n• a <numbers>: Approve requests (e.g., a 1 2 3)\n• d <numbers>: Deny requests (e.g., d 1 2 3)",
			requestApproved: "✅ Premium request approved for user %1!",
			requestDenied: "❌ Premium request denied for user %1!",
			invalidNumber: "❌ Invalid number!",
			requestNotFound: "❌ Request not found!"
		}
	},

	ST: async function({ message, args, event, usersData, getLang, api }) {
		const { senderID, threadID } = event;
		const { adminBot } = global.GoatBot.config;
		const isAdmin = adminBot.includes(senderID.toString()) || adminBot.includes(senderID);
		const action = args[0]?.toLowerCase();

		switch (action) {
			case "request": {
				const userData = await usersData.get(senderID);
				if (userData.premium) {
					return message.reply(getLang("alreadyPremium"));
				}

				const existingRequests = userData.premiumRequests || [];
				const existingRequest = existingRequests.find(req => req.userID === senderID);
				if (existingRequest) {
					return message.reply(getLang("requestExists"));
				}

				const requestMessage = args.slice(1).join(" ") || "No message provided";
				const newRequest = {
					userID: senderID,
					userName: userData.name,
					threadID: threadID,
					message: requestMessage,
					timestamp: Date.now()
				};

				existingRequests.push(newRequest);
				await usersData.set(senderID, existingRequests, "premiumRequests");

				message.reply(getLang("requestSent"));
				break;
			}

			case "add":
			case "a": {
				if (!isAdmin) {
					return message.reply(getLang("noPermission"));
				}

				let targetID;
				if (event.type === "message_reply") {
					targetID = event.messageReply.senderID;
				} else if (Object.keys(event.mentions).length > 0) {
					targetID = Object.keys(event.mentions)[0];
				} else if (args[1]) {
					targetID = args[1];
				} else {
					return message.SyntaxError();
				}

				try {
					const userData = await usersData.get(targetID);
					await usersData.set(targetID, true, "premium");
					message.reply(getLang("addedPremium", userData.name, targetID));
				} catch (error) {
					message.reply(getLang("userNotFound"));
				}
				break;
			}

			case "remove":
			case "r": {
				if (!isAdmin) {
					return message.reply(getLang("noPermission"));
				}

				let targetID;
				if (event.type === "message_reply") {
					targetID = event.messageReply.senderID;
				} else if (Object.keys(event.mentions).length > 0) {
					targetID = Object.keys(event.mentions)[0];
				} else if (args[1]) {
					targetID = args[1];
				} else {
					return message.SyntaxError();
				}

				try {
					const userData = await usersData.get(targetID);
					if (!userData.premium) {
						return message.reply(getLang("userNotPremium", userData.name, targetID));
					}
					await usersData.set(targetID, false, "premium");
					message.reply(getLang("removedPremium", userData.name, targetID));
				} catch (error) {
					message.reply(getLang("userNotFound"));
				}
				break;
			}

			case "list": {
				if (!isAdmin) {
					return message.reply(getLang("noPermission"));
				}

				const allUsers = await usersData.getAll();
				const premiumUsers = allUsers.filter(user => user.premium === true);

				if (premiumUsers.length === 0) {
					return message.reply(getLang("noPremiumUsers"));
				}

				const page = parseInt(args[1]) || 1;
				const itemsPerPage = 20;
				const totalPages = Math.ceil(premiumUsers.length / itemsPerPage);

				if (page < 1 || page > totalPages) {
					return message.reply(getLang("invalidPage"));
				}

				const startIndex = (page - 1) * itemsPerPage;
				const endIndex = startIndex + itemsPerPage;
				const usersOnPage = premiumUsers.slice(startIndex, endIndex);

				let userList = "";
				usersOnPage.forEach((user, index) => {
					const serialNumber = startIndex + index + 1;
					userList += `${serialNumber}. ${user.name} (${user.userID})\n`;
				});

				const replyMessage = getLang("premiumList", page, totalPages, userList) + "\n\n" + getLang("replyToRemove");

				message.reply(replyMessage, (err, info) => {
					if (err) return;
					global.GoatBot.onReply.set(info.messageID, {
						commandName: "premium",
						messageID: info.messageID,
						author: senderID,
						type: "list",
						page: page,
						totalPages: totalPages,
						users: premiumUsers,
						startIndex: startIndex
					});
				});
				break;
			}

			case "pending": {
				if (!isAdmin) {
					return message.reply(getLang("noPermission"));
				}

				const allUsers = await usersData.getAll();
				const allRequests = [];
				
				for (const user of allUsers) {
					if (user.premiumRequests && user.premiumRequests.length > 0) {
						allRequests.push(...user.premiumRequests);
					}
				}

				if (allRequests.length === 0) {
					return message.reply(getLang("noPendingRequests"));
				}

				// Group requests by thread
				const requestsByThread = {};
				for (const request of allRequests) {
					if (!requestsByThread[request.threadID]) {
						requestsByThread[request.threadID] = [];
					}
					requestsByThread[request.threadID].push(request);
				}

				let requestList = "";
				let globalIndex = 1;
				
				for (const threadID in requestsByThread) {
					const requests = requestsByThread[threadID];
					
					// Get thread name
					let threadName = "Unknown Thread";
					try {
						const threadData = await api.getThreadInfo(threadID);
						threadName = threadData.threadName || threadData.name || `Group ${threadID}`;
					} catch (error) {
						try {
							const threadsData = global.db.threadsData;
							const dbThreadData = await threadsData.get(threadID);
							threadName = dbThreadData.threadName || `Group ${threadID}`;
						} catch (dbError) {
							threadName = `Group ${threadID}`;
						}
					}
					
					requestList += `${threadName}:\n`;
					
					for (const request of requests) {
						const date = new Date(request.timestamp).toLocaleDateString();
						requestList += `${globalIndex}/ ${request.userName} (${request.userID}) - ${request.message} . ${date}\n`;
						globalIndex++;
					}
					requestList += "\n";
				}

				const replyMessage = getLang("pendingRequests", requestList) + getLang("replyToManage");

				message.reply(replyMessage, (err, info) => {
					if (err) return;
					global.GoatBot.onReply.set(info.messageID, {
						commandName: "premium",
						messageID: info.messageID,
						author: senderID,
						type: "pending",
						requests: allRequests
					});
				});
				break;
			}

			default: {
				// If user provided an action but it's not "request" and they're not admin
				if (args[0] && !isAdmin) {
					return message.reply(getLang("noPermission"));
				}
				return message.SyntaxError();
			}
		}
	},

	onReply: async function({ message, event, Reply, usersData, getLang }) {
		const { senderID, body } = event;
		const { author, type } = Reply;

		if (author !== senderID) return;

		const { adminBot } = global.GoatBot.config;
		const isAdmin = adminBot.includes(senderID.toString()) || adminBot.includes(senderID);

		if (!isAdmin) {
			return message.reply(getLang("noPermission"));
		}

		const input = body.trim().toLowerCase().split(" ");
		const action = input[0];

		if (type === "list") {
			const { page, totalPages, users, startIndex } = Reply;

			if (action === "p") {
				const pageNumber = parseInt(input[1]);
				if (isNaN(pageNumber) || pageNumber < 1 || pageNumber > totalPages) {
					return message.reply(getLang("invalidPage"));
				}

				const newStartIndex = (pageNumber - 1) * 20;
				const newEndIndex = newStartIndex + 20;
				const usersOnPage = users.slice(newStartIndex, newEndIndex);

				let userList = "";
				usersOnPage.forEach((user, index) => {
					const serialNumber = newStartIndex + index + 1;
					userList += `${serialNumber}. ${user.name} (${user.userID})\n`;
				});

				const replyMessage = getLang("premiumList", pageNumber, totalPages, userList) + "\n\n" + getLang("replyToRemove");

				message.reply(replyMessage, (err, info) => {
					if (err) return;
					message.unsend(Reply.messageID);
					global.GoatBot.onReply.set(info.messageID, {
						commandName: "premium",
						messageID: info.messageID,
						author: senderID,
						type: "list",
						page: pageNumber,
						totalPages: totalPages,
						users: users,
						startIndex: newStartIndex
					});
				});
			} else if (action === "r") {
				const numbers = input.slice(1).map(n => parseInt(n)).filter(n => !isNaN(n));
				
				if (numbers.length === 0) {
					return message.reply(getLang("invalidNumber"));
				}

				let removedCount = 0;
				const removedUsers = [];

				for (const num of numbers) {
					const userIndex = num - 1;
					const globalIndex = startIndex + (userIndex % 20);
					const targetUser = users[globalIndex];

					if (targetUser) {
						await usersData.set(targetUser.userID, false, "premium");
						removedUsers.push(`${targetUser.name} (${targetUser.userID})`);
						removedCount++;
					}
				}

				if (removedCount > 0) {
					message.reply(`✅ Removed premium from ${removedCount} user(s):\n${removedUsers.join("\n")}`);
				}
				message.unsend(Reply.messageID);
			}
		} else if (type === "pending") {
			const { requests } = Reply;
			const numbers = input.slice(1).map(n => parseInt(n)).filter(n => !isNaN(n));

			if (action === "a") {
				if (numbers.length === 0) {
					return message.reply(getLang("invalidNumber"));
				}

				const invalidNumbers = numbers.filter(num => num < 1 || num > requests.length);
				if (invalidNumbers.length > 0) {
					return message.reply(getLang("invalidNumber"));
				}

				let approvedCount = 0;
				const approvedUsers = [];

				for (const num of numbers) {
					const request = requests[num - 1];
					if (request) {
						await usersData.set(request.userID, true, "premium");
						
						// Remove request from user's premiumRequests array
						const userData = await usersData.get(request.userID);
						const updatedRequests = (userData.premiumRequests || []).filter(req => req.timestamp !== request.timestamp);
						await usersData.set(request.userID, updatedRequests, "premiumRequests");
						
						approvedUsers.push(request.userName);
						approvedCount++;
					}
				}
				
				if (approvedCount > 0) {
					message.reply(`✅ Approved ${approvedCount} premium request(s):\n${approvedUsers.join(", ")}`);
				}
				message.unsend(Reply.messageID);
			} else if (action === "d") {
				if (numbers.length === 0) {
					return message.reply(getLang("invalidNumber"));
				}

				const invalidNumbers = numbers.filter(num => num < 1 || num > requests.length);
				if (invalidNumbers.length > 0) {
					return message.reply(getLang("invalidNumber"));
				}

				let deniedCount = 0;
				const deniedUsers = [];

				for (const num of numbers) {
					const request = requests[num - 1];
					if (request) {
						// Remove request from user's premiumRequests array
						const userData = await usersData.get(request.userID);
						const updatedRequests = (userData.premiumRequests || []).filter(req => req.timestamp !== request.timestamp);
						await usersData.set(request.userID, updatedRequests, "premiumRequests");
						
						deniedUsers.push(request.userName);
						deniedCount++;
					}
				}
				
				if (deniedCount > 0) {
					message.reply(`❌ Denied ${deniedCount} premium request(s):\n${deniedUsers.join(", ")}`);
				}
				message.unsend(Reply.messageID);
			}
		}
	}
};
