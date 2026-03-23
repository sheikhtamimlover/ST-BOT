const fs = require("fs-extra");

module.exports = {
	config: {
		name: "typing",
		aliases: [],
		version: "2.4.78",
		author: "ST | Sheikh Tamim",
		countDown: 5,
		role: 2,
		description: "Manage typing indicator for bot messages",
		category: "config",
		guide: {
			vi: "{pn} status: hiển thị trạng thái hiện tại\n" +
				"{pn} on|off: bật/tắt typing indicator\n" +
				"{pn} duration <milliseconds>: đặt thời lượng typing (ví dụ 4000)",
			en: "{pn} status: show current typing setting\n" +
				"{pn} on|off: enable/disable typing indicator\n" +
				"{pn} duration <milliseconds>: set typing duration (e.g. 4000)"
		}
	},

	langs: {
		vi: {
			status: "Typing indicator: %1\nThời lượng: %2 ms",
			enabled: "Typing indicator đã bật.",
			disabled: "Typing indicator đã tắt.",
			duration: "Typing duration đặt thành %1 ms.",
			invalidDuration: "Giá trị thời lượng không hợp lệ (phải là số > 0).",
			invalidSyntax: "Cú pháp không hợp lệ. Sử dụng: {pn} on|off|status|duration <ms>"
		},
		en: {
			status: "Typing indicator: %1\nDuration: %2 ms",
			enabled: "Typing indicator is enabled.",
			disabled: "Typing indicator is disabled.",
			duration: "Typing duration set to %1 ms.",
			invalidDuration: "Invalid duration (must be number > 0).",
			invalidSyntax: "Invalid syntax. Use: {pn} on|off|status|duration <ms>"
		}
	},

	ST: async function({ message, args, getLang }) {
		const command = args[0] ? args[0].toString().toLowerCase() : "";
		const config = global.GoatBot.config || {};

		if (!command || command === "status") {
			const enabled = config.enableTypingIndicator ? "ON" : "OFF";
			const duration = Number(config.typingDuration) || 4000;
			return message.reply(getLang("status", enabled, duration));
		}

		if (command === "on" || command === "off") {
			config.enableTypingIndicator = command === "on";
			fs.writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
			if (global.GoatBot && typeof global.GoatBot.refreshFcaConfig === 'function') {
				global.GoatBot.refreshFcaConfig();
			}
			return message.reply(getLang(config.enableTypingIndicator ? "enabled" : "disabled"));
		}

		if (command === "duration") {
			if (!args[1]) return message.reply(getLang("invalidSyntax"));
			const duration = parseInt(args[1]);
			if (isNaN(duration) || duration <= 0) return message.reply(getLang("invalidDuration"));
			config.typingDuration = duration;
			fs.writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
			if (global.GoatBot && typeof global.GoatBot.refreshFcaConfig === 'function') {
				global.GoatBot.refreshFcaConfig();
			}
			return message.reply(getLang("duration", duration));
		}

		return message.reply(getLang("invalidSyntax"));
	}
};