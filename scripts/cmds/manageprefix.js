
const fs = require("fs-extra");

module.exports = {
	config: {
		name: "manageprefix",
		aliases: ["mp"],
		version: "2.4.60",
		author: "ST | Sheikh Tamim",
		countDown: 5,
		role: 2, // Admin only
		description: "Manage prefix settings for the bot",
		category: "admin",
		guide: {
			en: "   {pn} status - Show current prefix settings"
				+ "\n   {pn} global <true|false> - Enable/disable global prefix requirement"
				+ "\n   {pn} admin <true|false> - Enable/disable admin prefix requirement"
				+ "\n   {pn} adduid <uid> - Add specific UID to no-prefix list"
				+ "\n   {pn} removeuid <uid> - Remove specific UID from no-prefix list"
				+ "\n   {pn} listuid - List all specific UIDs in no-prefix list"
		}
	},

	ST: async function ({ message, args, getLang }) {
		const config = global.GoatBot.config;
		
		if (!args[0]) {
			return message.reply("Please specify an action. Use 'status', 'global', 'admin', 'adduid', 'removeuid', or 'listuid'.");
		}

		switch (args[0].toLowerCase()) {
			case "status": {
				const globalPrefix = config.usePrefix.enable ? "✅ Enabled" : "❌ Disabled";
				const adminPrefix = config.usePrefix.adminUsePrefix.enable ? "✅ Enabled" : "❌ Disabled";
				const specificUids = config.usePrefix.adminUsePrefix.specificUids.length > 0 
					? config.usePrefix.adminUsePrefix.specificUids.join(", ") 
					: "None";

				return message.reply(
					`🔧 **Prefix Settings Status**\n\n` +
					`📌 Global Prefix Required: ${globalPrefix}\n` +
					`👑 Admin Prefix Required: ${adminPrefix}\n` +
					`👥 Specific UIDs (No Prefix): ${specificUids}\n\n` +
					`ℹ️ Current Prefix: "${config.prefix}"`
				);
			}

			case "global": {
				if (!args[1] || !["true", "false"].includes(args[1].toLowerCase())) {
					return message.reply("Please specify 'true' or 'false' for global prefix setting.");
				}
				
				const newValue = args[1].toLowerCase() === "true";
				config.usePrefix.enable = newValue;
				fs.writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
				
				// Reload config
				delete require.cache[require.resolve(global.client.dirConfig)];
				global.GoatBot.config = require(global.client.dirConfig);
				
				return message.reply(`✅ Global prefix requirement has been ${newValue ? "enabled" : "disabled"}.`);
			}

			case "admin": {
				if (!args[1] || !["true", "false"].includes(args[1].toLowerCase())) {
					return message.reply("Please specify 'true' or 'false' for admin prefix setting.");
				}
				
				const newValue = args[1].toLowerCase() === "true";
				config.usePrefix.adminUsePrefix.enable = newValue;
				fs.writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
				
				// Reload config
				delete require.cache[require.resolve(global.client.dirConfig)];
				global.GoatBot.config = require(global.client.dirConfig);
				
				return message.reply(`✅ Admin prefix requirement has been ${newValue ? "enabled" : "disabled"}.`);
			}

			case "adduid": {
				if (!args[1]) {
					return message.reply("Please provide a UID to add to the no-prefix list.");
				}
				
				const uid = args[1];
				if (!config.usePrefix.adminUsePrefix.specificUids.includes(uid)) {
					config.usePrefix.adminUsePrefix.specificUids.push(uid);
					fs.writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
					
					// Reload config
					delete require.cache[require.resolve(global.client.dirConfig)];
					global.GoatBot.config = require(global.client.dirConfig);
					
					return message.reply(`✅ UID ${uid} has been added to the no-prefix list.`);
				} else {
					return message.reply(`⚠️ UID ${uid} is already in the no-prefix list.`);
				}
			}

			case "removeuid": {
				if (!args[1]) {
					return message.reply("Please provide a UID to remove from the no-prefix list.");
				}
				
				const uid = args[1];
				const index = config.usePrefix.adminUsePrefix.specificUids.indexOf(uid);
				if (index > -1) {
					config.usePrefix.adminUsePrefix.specificUids.splice(index, 1);
					fs.writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
					
					// Reload config
					delete require.cache[require.resolve(global.client.dirConfig)];
					global.GoatBot.config = require(global.client.dirConfig);
					
					return message.reply(`✅ UID ${uid} has been removed from the no-prefix list.`);
				} else {
					return message.reply(`⚠️ UID ${uid} is not in the no-prefix list.`);
				}
			}

			case "listuid": {
				const uids = config.usePrefix.adminUsePrefix.specificUids;
				if (uids.length === 0) {
					return message.reply("📝 No specific UIDs are currently in the no-prefix list.");
				}
				
				return message.reply(`📝 **Specific UIDs (No Prefix Required):**\n${uids.map((uid, index) => `${index + 1}. ${uid}`).join("\n")}`);
			}

			default:
				return message.reply("Invalid action. Use 'status', 'global', 'admin', 'adduid', 'removeuid', or 'listuid'.");
		}
	}
};
