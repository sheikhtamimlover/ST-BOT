const fs = require("fs-extra");

const pathFile = `${__dirname}/tmp/restart.txt`;

function isE2EEThreadID(threadID) {
	return typeof threadID === "string" && threadID.includes("@");
}

function readRestartState() {
	if (!fs.existsSync(pathFile))
		return null;

	const raw = fs.readFileSync(pathFile, "utf-8").trim();
	if (!raw)
		return null;

	try {
		const data = JSON.parse(raw);
		if (data && data.threadID && data.time)
			return data;
	}
	catch (_) {
		// Backward compatibility with the old "threadID time" format.
	}

	const [threadID, time] = raw.split(" ");
	if (!threadID || !time)
		return null;
	return { threadID, time: Number(time), isE2EE: isE2EEThreadID(threadID) };
}

async function sendRestartNotification(api, data) {
	const time = Number(data.time) || Date.now();
	await api.sendMessage(`✅ | Bot restarted\n⏰ | Time: ${(Date.now() - time) / 1000}s`, data.threadID);
	fs.removeSync(pathFile);
}

function queueE2EERestartNotification(api, data) {
	global.GoatBot.pendingE2eeRestartNotifications = global.GoatBot.pendingE2eeRestartNotifications || [];

	const exists = global.GoatBot.pendingE2eeRestartNotifications.some(item => item.pathFile === pathFile);
	if (!exists) {
		global.GoatBot.pendingE2eeRestartNotifications.push({
			...data,
			pathFile,
			source: "restart"
		});
	}

	if (global.GoatBot.e2eeFullyReady && typeof global.GoatBot.sendPendingE2eeRestartNotifications === "function") {
		global.GoatBot.sendPendingE2eeRestartNotifications(api).catch(() => {});
	}
}

module.exports = {
	config: {
		name: "restart",
		version: "1.2",
		author: "NTKhang",
		countDown: 5,
		role: 2,
		description: {
			vi: "Khởi động lại bot",
			en: "Restart bot"
		},
		category: "Owner",
		guide: {
			vi: "   {pn}: Khởi động lại bot",
			en: "   {pn}: Restart bot"
		}
	},

	langs: {
		vi: {
			restartting: "🔄 | Đang khởi động lại bot..."
		},
		en: {
			restartting: "🔄 | Restarting bot..."
		}
	},

	onLoad: function ({ api }) {
		const data = readRestartState();
		if (!data)
			return;

		if (isE2EEThreadID(data.threadID))
			return queueE2EERestartNotification(api, data);

		sendRestartNotification(api, data).catch(() => {});
	},

	onStart: async function ({ message, event, getLang }) {
		fs.ensureDirSync(`${__dirname}/tmp`);
		fs.writeFileSync(pathFile, JSON.stringify({
			threadID: event.threadID,
			messageID: event.messageID,
			isE2EE: isE2EEThreadID(event.threadID),
			time: Date.now()
		}, null, 2));

		await message.reply(getLang("restartting"));
		process.exit(2);
	}
};
