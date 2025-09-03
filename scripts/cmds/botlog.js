
const { writeFileSync } = require("fs-extra");

module.exports = {
	config: {
		name: "botlog",
		aliases: ["blogconfig"],
		version: "2.3.5",
		author: "ST | Sheikh Tamim",
		countDown: 5,
		role: 2,
		description: {
			vi: "Cấu hình hệ thống log bot",
			en: "Configure bot logging system settings"
		},
		category: "owner",
		guide: {
			en: "   {pn} on/off: Enable/disable bot logging"
				+ "\n   {pn} thread on/off: Enable/disable thread-based logging"
				+ "\n   {pn} thread add <threadID>: Add thread to log list"
				+ "\n   {pn} thread remove <threadID>: Remove thread from log list"
				+ "\n   {pn} thread list: Show current thread list"
				+ "\n   {pn} admin on/off: Enable/disable admin logging"
				+ "\n   {pn} silent on/off: Enable/disable silent mode for disabled threads"
				+ "\n   {pn} added on/off: Enable/disable bot added event logging"
				+ "\n   {pn} kicked on/off: Enable/disable bot kicked event logging"
				+ "\n   {pn} info: Show current configuration"
		}
	},

	langs: {
		en: {
			enabled: "✅ Bot logging enabled",
			disabled: "❌ Bot logging disabled",
			threadEnabled: "✅ Thread logging enabled",
			threadDisabled: "❌ Thread logging disabled",
			threadAdded: "✅ Added thread %1 to logging list",
			threadRemoved: "✅ Removed thread %1 from logging list",
			threadNotFound: "❌ Thread %1 not found in logging list",
			threadList: "📋 Current logging threads:\n%1",
			noThreads: "📋 No threads configured for logging",
			adminEnabled: "✅ Admin logging enabled",
			adminDisabled: "❌ Admin logging disabled",
			silentEnabled: "✅ Silent mode enabled for disabled threads",
			silentDisabled: "❌ Silent mode disabled for disabled threads",
			currentConfig: "🔧 Current Bot Logging Configuration:\n\n📢 Main: %1\n📋 Thread logging: %2\n📝 Thread IDs: %3\n👑 Admin logging: %4\n🔇 Silent mode: %5",
			syntaxError: "❌ Invalid syntax. Use {pn} help for guide"
		}
	},

	onStart: async function ({ args, message, event, getLang }) {
		const { threadID } = event;
		const { config } = global.GoatBot;
		
		// Initialize botLogging if it doesn't exist
		if (!config.botLogging) {
			config.botLogging = {
				enable: true,
				sendToThreads: false,
				logThreadIds: [],
				sendToAdmins: true,
				silentOnDisabledThreads: true
			};
		}
		
		const logConfig = config.botLogging;

		if (!args[0]) {
			const status = logConfig.enable ? "✅ Enabled" : "❌ Disabled";
			const threadStatus = logConfig.sendToThreads ? "✅ Enabled" : "❌ Disabled";
			const threadIds = logConfig.logThreadIds && logConfig.logThreadIds.length > 0 ? logConfig.logThreadIds.join(", ") : "None";
			const adminStatus = logConfig.sendToAdmins ? "✅ Enabled" : "❌ Disabled";
			const silentStatus = logConfig.silentOnDisabledThreads ? "✅ Enabled" : "❌ Disabled";
			const addedStatus = logConfig.logBotAdded ? "✅ Enabled" : "❌ Disabled";
			const kickedStatus = logConfig.logBotKicked ? "✅ Enabled" : "❌ Disabled";
			
			return message.reply(getLang("currentConfig", status, threadStatus, threadIds, adminStatus, silentStatus) + `\n🤖 Bot Added: ${addedStatus}\n👋 Bot Kicked: ${kickedStatus}`);
		}

		const subCommand = args[0].toLowerCase();
		const action = args[1] ? args[1].toLowerCase() : null;

		switch (subCommand) {
			case "on":
			case "enable":
				logConfig.enable = true;
				break;
			case "off":
			case "disable":
				logConfig.enable = false;
				break;
			case "added":
				if (action === "on" || action === "enable") {
					logConfig.logBotAdded = true;
					message.reply("✅ Bot added logging enabled");
				} else if (action === "off" || action === "disable") {
					logConfig.logBotAdded = false;
					message.reply("❌ Bot added logging disabled");
				} else {
					return message.reply("❌ Use: botlog added on/off");
				}
				break;
			case "kicked":
			case "leave":
				if (action === "on" || action === "enable") {
					logConfig.logBotKicked = true;
					message.reply("✅ Bot kicked logging enabled");
				} else if (action === "off" || action === "disable") {
					logConfig.logBotKicked = false;
					message.reply("❌ Bot kicked logging disabled");
				} else {
					return message.reply("❌ Use: botlog kicked on/off");
				}
				break;
			case "thread":
				if (action === "on" || action === "enable") {
					logConfig.sendToThreads = true;
					message.reply(getLang("threadEnabled"));
				} else if (action === "off" || action === "disable") {
					logConfig.sendToThreads = false;
					message.reply(getLang("threadDisabled"));
				} else if (action === "add") {
					const threadIdToAdd = args[2];
					if (!threadIdToAdd) {
						return message.reply("❌ Please provide thread ID");
					}
					if (!logConfig.logThreadIds.includes(threadIdToAdd)) {
						logConfig.logThreadIds.push(threadIdToAdd);
						message.reply(getLang("threadAdded", threadIdToAdd));
					} else {
						message.reply("❌ Thread already in logging list");
					}
				} else if (action === "remove") {
					const threadIdToRemove = args[2];
					if (!threadIdToRemove) {
						return message.reply("❌ Please provide thread ID");
					}
					const index = logConfig.logThreadIds.indexOf(threadIdToRemove);
					if (index > -1) {
						logConfig.logThreadIds.splice(index, 1);
						message.reply(getLang("threadRemoved", threadIdToRemove));
					} else {
						message.reply(getLang("threadNotFound", threadIdToRemove));
					}
				} else if (action === "list") {
					if (logConfig.logThreadIds.length > 0) {
						message.reply(getLang("threadList", logConfig.logThreadIds.join("\n")));
					} else {
						message.reply(getLang("noThreads"));
					}
				} else {
					return message.reply("❌ Use: botlog thread on/off/add/remove/list");
				}
				break;
			case "admin":
				if (action === "on" || action === "enable") {
					logConfig.sendToAdmins = true;
					message.reply(getLang("adminEnabled"));
				} else if (action === "off" || action === "disable") {
					logConfig.sendToAdmins = false;
					message.reply(getLang("adminDisabled"));
				} else {
					return message.reply("❌ Use: botlog admin on/off");
				}
				break;
			case "silent":
				if (action === "on" || action === "enable") {
					logConfig.silentOnDisabledThreads = true;
					message.reply(getLang("silentEnabled"));
				} else if (action === "off" || action === "disable") {
					logConfig.silentOnDisabledThreads = false;
					message.reply(getLang("silentDisabled"));
				} else {
					return message.reply("❌ Use: botlog silent on/off");
				}
				break;
			case "info":
			case "config":
				const status = logConfig.enable ? "✅ Enabled" : "❌ Disabled";
				const threadStatus = logConfig.sendToThreads ? "✅ Enabled" : "❌ Disabled";
				const threadIds = logConfig.logThreadIds && logConfig.logThreadIds.length > 0 ? logConfig.logThreadIds.join(", ") : "None";
				const adminStatus = logConfig.sendToAdmins ? "✅ Enabled" : "❌ Disabled";
				const silentStatus = logConfig.silentOnDisabledThreads ? "✅ Enabled" : "❌ Disabled";
				const addedStatus = logConfig.logBotAdded ? "✅ Enabled" : "❌ Disabled";
				const kickedStatus = logConfig.logBotKicked ? "✅ Enabled" : "❌ Disabled";
				
				message.reply(getLang("currentConfig", status, threadStatus, threadIds, adminStatus, silentStatus) + `\n🤖 Bot Added: ${addedStatus}\n👋 Bot Kicked: ${kickedStatus}`);
				break;
			default:
				if (subCommand === "on" || subCommand === "enable") {
					logConfig.enable = true;
					message.reply(getLang("enabled"));
				} else if (subCommand === "off" || subCommand === "disable") {
					logConfig.enable = false;
					message.reply(getLang("disabled"));
				} else {
					return message.reply(getLang("syntaxError"));
				}
		}

		// Save config changes
		const fs = require("fs-extra");
		fs.writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
		
		if (!["info", "config", "added", "kicked", "thread", "admin", "silent"].includes(subCommand)) {
			message.reply(subCommand === "on" || subCommand === "enable" ? getLang("enabled") : getLang("disabled"));
		} {
			return message.reply(getLang("syntaxError"));
		}

		switch (args[0].toLowerCase()) {
			case "on":
			case "enable": {
				logConfig.enable = true;
				writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
				return message.reply(getLang("enabled"));
			}

			case "off":
			case "disable": {
				logConfig.enable = false;
				writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
				return message.reply(getLang("disabled"));
			}

			case "thread": {
				if (!args[1]) return message.reply(getLang("syntaxError"));

				switch (args[1].toLowerCase()) {
					case "on":
					case "enable":
						logConfig.sendToThreads = true;
						writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
						return message.reply(getLang("threadEnabled"));

					case "off":
					case "disable":
						logConfig.sendToThreads = false;
						writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
						return message.reply(getLang("threadDisabled"));

					case "add":
						if (!args[2]) return message.reply(getLang("syntaxError"));
						const addThreadId = args[2];
						if (!logConfig.logThreadIds.includes(addThreadId)) {
							logConfig.logThreadIds.push(addThreadId);
							writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
							return message.reply(getLang("threadAdded", addThreadId));
						}
						return message.reply(getLang("threadNotFound", addThreadId));

					case "remove":
						if (!args[2]) return message.reply(getLang("syntaxError"));
						const removeThreadId = args[2];
						const threadIndex = logConfig.logThreadIds.indexOf(removeThreadId);
						if (threadIndex !== -1) {
							logConfig.logThreadIds.splice(threadIndex, 1);
							writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
							return message.reply(getLang("threadRemoved", removeThreadId));
						}
						return message.reply(getLang("threadNotFound", removeThreadId));

					case "list":
						if (logConfig.logThreadIds.length === 0) {
							return message.reply(getLang("noThreads"));
						}
						const threadList = logConfig.logThreadIds.map((id, index) => `${index + 1}. ${id}`).join("\n");
						return message.reply(getLang("threadList", threadList));

					default:
						return message.reply(getLang("syntaxError"));
				}
			}

			case "admin": {
				if (!args[1]) return message.reply(getLang("syntaxError"));

				switch (args[1].toLowerCase()) {
					case "on":
					case "enable":
						logConfig.sendToAdmins = true;
						writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
						return message.reply(getLang("adminEnabled"));

					case "off":
					case "disable":
						logConfig.sendToAdmins = false;
						writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
						return message.reply(getLang("adminDisabled"));

					default:
						return message.reply(getLang("syntaxError"));
				}
			}

			case "silent": {
				if (!args[1]) return message.reply(getLang("syntaxError"));

				switch (args[1].toLowerCase()) {
					case "on":
					case "enable":
						logConfig.silentOnDisabledThreads = true;
						writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
						return message.reply(getLang("silentEnabled"));

					case "off":
					case "disable":
						logConfig.silentOnDisabledThreads = false;
						writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
						return message.reply(getLang("silentDisabled"));

					default:
						return message.reply(getLang("syntaxError"));
				}
			}

			case "info": {
				const threadIds = logConfig.logThreadIds.length > 0 ? logConfig.logThreadIds.join(", ") : "None";
				return message.reply(getLang("currentConfig", 
					logConfig.enable ? "Enabled" : "Disabled",
					logConfig.sendToThreads ? "Enabled" : "Disabled",
					threadIds,
					logConfig.sendToAdmins ? "Enabled" : "Disabled",
					logConfig.silentOnDisabledThreads ? "Enabled" : "Disabled"
				));
			}

			default:
				return message.reply(getLang("syntaxError"));
		}
	}
};
