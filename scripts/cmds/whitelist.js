
const fs = require("fs-extra");

module.exports = {
	config: {
		name: "whitelist",
		aliases: ["wl"],
		version: "2.4.73",
		author: "ST",
		countDown: 5,
		role: 2,
		description: {
			en: "Manage whitelist mode for users and threads"
		},
		category: "owner",
		guide: {
			en: "   {pn} on/off: Enable/disable user whitelist mode\n"
				+ "   {pn} thread on/off: Enable/disable thread whitelist mode\n"
				+ "   {pn} add [uid]: Add user to whitelist (reply/mention/manual uid)\n"
				+ "   {pn} remove [number]: Remove user from whitelist by list number\n"
				+ "   {pn} list: Show whitelist users\n"
				+ "   {pn} thread add [tid]: Add thread to whitelist\n"
				+ "   {pn} thread remove [number]: Remove thread from whitelist\n"
				+ "   {pn} thread list: Show whitelist threads"
		}
	},

	langs: {
		en: {
			userWlOn: "✅ User whitelist mode enabled",
			userWlOff: "❌ User whitelist mode disabled",
			threadWlOn: "✅ Thread whitelist mode enabled",
			threadWlOff: "❌ Thread whitelist mode disabled",
			userAdded: "✅ Added user %1 to whitelist",
			userRemoved: "✅ Removed user from whitelist",
			threadAdded: "✅ Added thread %1 to whitelist",
			threadRemoved: "✅ Removed thread from whitelist",
			userAlready: "⚠️ User %1 is already in whitelist",
			threadAlready: "⚠️ Thread %1 is already in whitelist",
			invalidNumber: "❌ Invalid number",
			userList: "📋 Whitelist Users (%1):\n%2",
			threadList: "📋 Whitelist Threads (%1):\n%2",
			noUsers: "📋 No users in whitelist",
			noThreads: "📋 No threads in whitelist",
			noReply: "❌ Please reply to a message or mention a user",
			invalidUid: "❌ Invalid UID"
		}
	},

	onStart: async function ({ args, message, event, getLang, usersData, threadsData }) {
		const { config } = global.GoatBot;
		const { dirConfig } = global.client;

		if (!args[0]) return message.SyntaxError();

		// Thread whitelist commands
		if (args[0].toLowerCase() === "thread") {
			if (!args[1]) return message.SyntaxError();

			switch (args[1].toLowerCase()) {
				case "on":
					config.whiteListModeThread.enable = true;
					fs.writeFileSync(dirConfig, JSON.stringify(config, null, 2));
					return message.reply(getLang("threadWlOn"));

				case "off":
					config.whiteListModeThread.enable = false;
					fs.writeFileSync(dirConfig, JSON.stringify(config, null, 2));
					return message.reply(getLang("threadWlOff"));

				case "add": {
					let tid = args[2] || event.threadID;
					if (!tid || isNaN(tid)) return message.reply(getLang("invalidUid"));
					
					tid = tid.toString();
					if (config.whiteListModeThread.whiteListThreadIds.includes(tid))
						return message.reply(getLang("threadAlready", tid));

					config.whiteListModeThread.whiteListThreadIds.push(tid);
					fs.writeFileSync(dirConfig, JSON.stringify(config, null, 2));
					return message.reply(getLang("threadAdded", tid));
				}

				case "remove":
				case "rm": {
					const num = parseInt(args[2]);
					if (isNaN(num) || num < 1 || num > config.whiteListModeThread.whiteListThreadIds.length)
						return message.reply(getLang("invalidNumber"));

					config.whiteListModeThread.whiteListThreadIds.splice(num - 1, 1);
					fs.writeFileSync(dirConfig, JSON.stringify(config, null, 2));
					return message.reply(getLang("threadRemoved"));
				}

				case "list": {
					const threads = config.whiteListModeThread.whiteListThreadIds;
					if (threads.length === 0) return message.reply(getLang("noThreads"));

					const list = await Promise.all(threads.map(async (tid, i) => {
						try {
							const threadInfo = await threadsData.get(tid);
							return `${i + 1}. ${threadInfo.threadName || tid} (${tid})`;
						} catch {
							return `${i + 1}. ${tid}`;
						}
					}));

					return message.reply(getLang("threadList", threads.length, list.join("\n")));
				}
			}
		}

		// User whitelist commands
		switch (args[0].toLowerCase()) {
			case "on":
				config.whiteListMode.enable = true;
				fs.writeFileSync(dirConfig, JSON.stringify(config, null, 2));
				return message.reply(getLang("userWlOn"));

			case "off":
				config.whiteListMode.enable = false;
				fs.writeFileSync(dirConfig, JSON.stringify(config, null, 2));
				return message.reply(getLang("userWlOff"));

			case "add": {
				let uid = args[1];
				
				// Check for reply
				if (event.messageReply) {
					uid = event.messageReply.senderID;
				}
				// Check for mentions
				else if (Object.keys(event.mentions).length > 0) {
					uid = Object.keys(event.mentions)[0];
				}

				if (!uid || isNaN(uid)) return message.reply(getLang("noReply"));

				uid = uid.toString();
				if (config.whiteListMode.whiteListIds.includes(uid))
					return message.reply(getLang("userAlready", uid));

				config.whiteListMode.whiteListIds.push(uid);
				fs.writeFileSync(dirConfig, JSON.stringify(config, null, 2));
				return message.reply(getLang("userAdded", uid));
			}

			case "remove":
			case "rm": {
				const num = parseInt(args[1]);
				if (isNaN(num) || num < 1 || num > config.whiteListMode.whiteListIds.length)
					return message.reply(getLang("invalidNumber"));

				config.whiteListMode.whiteListIds.splice(num - 1, 1);
				fs.writeFileSync(dirConfig, JSON.stringify(config, null, 2));
				return message.reply(getLang("userRemoved"));
			}

			case "list": {
				const users = config.whiteListMode.whiteListIds;
				if (users.length === 0) return message.reply(getLang("noUsers"));

				const list = await Promise.all(users.map(async (uid, i) => {
					try {
						const userName = await usersData.getName(uid);
						return `${i + 1}. ${userName} (${uid})`;
					} catch {
						return `${i + 1}. ${uid}`;
					}
				}));

				return message.reply(getLang("userList", users.length, list.join("\n")));
			}

			default:
				return message.SyntaxError();
		}
	}
};
