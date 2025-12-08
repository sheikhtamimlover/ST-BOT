module.exports = {
	config: {
		name: "staidb",
		aliases: [],
		version: "2.4.75",
		author: "ST | Sheikh Tamim",
		countDown: 5,
		role: 0,
		description: "View STAI command/event generation history",
		category: "ai",
		guide: {
			en: "   {pn} - View your recent history"
				+ "\n   {pn} all - View all history (admin only)"
				+ "\n   {pn} <serial_number> - View specific entry details"
				+ "\n   {pn} commands - View command generations only"
				+ "\n   {pn} events - View event generations only"
		}
	},

	ST: async function({ message, args, event, usersData, threadsData, staiHistoryData, api }) {
		const { senderID, threadID } = event;

		if (!staiHistoryData) {
			return message.reply("❌ STAI history database is not available");
		}

		// View specific entry by serial number
		if (args[0] && !isNaN(args[0])) {
			const serialNumber = parseInt(args[0]);
			const entry = await staiHistoryData.getBySerialNumber(serialNumber);

			if (!entry) {
				return message.reply(`❌ No entry found with serial number: ${serialNumber}`);
			}

			const date = new Date(entry.createdAt).toLocaleString();
			let response = `📊 STAI History Entry #${entry.serialNumber}\n\n`;
			response += `👤 User: ${entry.userName} (${entry.userID})\n`;
			response += `📂 Thread: ${entry.threadName || 'Private'} (${entry.threadID})\n`;
			response += `🔧 Action: ${entry.actionType.replace(/_/g, ' ')}\n`;
			response += `📁 Type: ${entry.itemType}\n`;
			response += `📝 File: ${entry.fileName}\n`;
			response += `📅 Date: ${date}\n`;
			response += `✅ Success: ${entry.success ? 'Yes' : 'No'}\n`;

			if (entry.description) {
				response += `📖 Description: ${entry.description}\n`;
			}

			if (entry.gistRawUrl) {
				response += `\n🔗 Gist URL:\n${entry.gistRawUrl}`;
			}

			return message.reply(response);
		}

		// Filter options
		let filter = {};
		let filterName = "Recent";

		if (args[0] === "all") {
			if (!global.utils.isAdmin(senderID)) {
				return message.reply("❌ Only admins can view all history");
			}
			filterName = "All";
		} else if (args[0] === "commands") {
			filter.userID = senderID;
			filter.itemType = "command";
			filterName = "Your Commands";
		} else if (args[0] === "events") {
			filter.userID = senderID;
			filter.itemType = "event";
			filterName = "Your Events";
		} else {
			filter.userID = senderID;
			filterName = "Your";
		}

		const history = await staiHistoryData.getHistory(filter, 20);

		if (history.length === 0) {
			return message.reply(`📊 No STAI history found`);
		}

		let response = `📊 ${filterName} STAI History (${history.length} entries)\n\n`;

		history.forEach((entry, index) => {
			const icon = entry.itemType === 'command' ? '🔧' : '⚡';
			const successIcon = entry.success ? '✅' : '❌';
			response += `${index + 1}. [#${entry.serialNumber}] ${icon} ${entry.fileName}\n`;
			response += `   ${entry.actionType.replace(/_/g, ' ')} ${successIcon}\n`;
			response += `   ${new Date(entry.createdAt).toLocaleDateString()}\n\n`;
		});

		response += `\n💡 Reply with a serial number to view details`;

		return message.reply(response, (err, info) => {
			if (!err && info) {
				global.GoatBot.onReply.set(info.messageID, {
					commandName: "staidb",
					messageID: info.messageID,
					author: senderID,
					type: "view_details",
					history: history,
					staiHistoryData: staiHistoryData
				});
			}
		});
	},

	onReply: async function({ Reply, message, event, args }) {
		const { author, type, history, staiHistoryData } = Reply;

		// Only the original author can reply
		if (event.senderID !== author) {
			return;
		}

		if (!staiHistoryData) {
			return message.reply("❌ STAI history database is not available");
		}

		if (type === "view_details") {
			const input = args[0];

			// Check if input is a valid number
			if (!input || isNaN(input)) {
				return message.reply("❌ Please enter a valid serial number");
			}

			const serialNumber = parseInt(input);

			// Get the entry by serial number
			const entry = await staiHistoryData.getBySerialNumber(serialNumber);

			if (!entry) {
				return message.reply(`❌ No entry found with serial number: ${serialNumber}`);
			}

			const date = new Date(entry.createdAt).toLocaleString();
			let response = `📊 STAI History Entry #${entry.serialNumber}\n\n`;
			response += `👤 User: ${entry.userName} (${entry.userID})\n`;
			response += `📂 Thread: ${entry.threadName || 'Private'} (${entry.threadID})\n`;
			response += `🔧 Action: ${entry.actionType.replace(/_/g, ' ')}\n`;
			response += `📁 Type: ${entry.itemType}\n`;
			response += `📝 File: ${entry.fileName}\n`;
			response += `📅 Date: ${date}\n`;
			response += `✅ Success: ${entry.success ? 'Yes' : 'No'}\n`;

			if (entry.description) {
				response += `📖 Description: ${entry.description}\n`;
			}

			if (entry.gistRawUrl) {
				response += `\n🔗 Gist URL:\n${entry.gistRawUrl}`;
			}

			// Delete the onReply after showing details
			global.GoatBot.onReply.delete(Reply.messageID);

			return message.reply(response);
		}
	}
};