const { getTime } = global.utils;

module.exports = {
	config: {
		name: "logsbot",
		isBot: true,
		version: "2.3.5",
		author: "ST",
		envConfig: {
			allow: true
		},
		category: "events"
	},

	langs: {
		vi: {
			title: "====== Nhật ký bot ======",
			added: "\n✅\nSự kiện: bot được thêm vào nhóm mới\n- Người thêm: %1",
			kicked: "\n❌\nSự kiện: bot bị kick\n- Người kick: %1",
			footer: "\n- User ID: %1\n- Nhóm: %2\n- ID nhóm: %3\n- Thời gian: %4"
		},
		en: {
			title: "====== Bot logs ======",
			added: "\n✅\nEvent: bot has been added to a new group\n- Added by: %1",
			kicked: "\n❌\nEvent: bot has been kicked\n- Kicked by: %1",
			footer: "\n- User ID: %1\n- Group: %2\n- Group ID: %3\n- Time: %4"
		}
	},

	onStart: async ({ usersData, threadsData, event, api, getLang }) => {
		if (
			(event.logMessageType == "log:subscribe" && event.logMessageData.addedParticipants.some(item => item.userFbId == api.getCurrentUserID()))
			|| (event.logMessageType == "log:unsubscribe" && event.logMessageData.leftParticipantFbId == api.getCurrentUserID())
		) return async function () {
			const { author, threadID } = event;
			if (author == api.getCurrentUserID())
				return;
			let threadName;
			const { config } = global.GoatBot;
			const { botLogging } = config;

			// Check if logging is enabled for this event type
			if (event.logMessageType == "log:subscribe") {
				if (!event.logMessageData.addedParticipants.some(item => item.userFbId == api.getCurrentUserID()))
					return;
				if (!botLogging.logBotAdded)
					return;
			}
			else if (event.logMessageType == "log:unsubscribe") {
				if (event.logMessageData.leftParticipantFbId != api.getCurrentUserID())
					return;
				if (!botLogging.logBotKicked)
					return;
			}

			let msg = getLang("title");

			if (event.logMessageType == "log:subscribe") {
				threadName = (await api.getThreadInfo(threadID)).threadName;
				const authorName = await usersData.getName(author);
				msg += getLang("added", authorName);
			}
			else if (event.logMessageType == "log:unsubscribe") {
				const authorName = await usersData.getName(author);
				const threadData = await threadsData.get(threadID);
				threadName = threadData.threadName;
				msg += getLang("kicked", authorName);
			}
			const time = getTime("DD/MM/YYYY HH:mm:ss");
			msg += getLang("footer", author, threadName, threadID, time);
			
			// Send to specified thread IDs if enabled
			if (botLogging && botLogging.enable && botLogging.sendToThreads && botLogging.logThreadIds && botLogging.logThreadIds.length > 0) {
				for (const logThreadID of botLogging.logThreadIds) {
					try {
						await api.sendMessage(msg, logThreadID);
					} catch (err) {
						// Check if it's a thread disabled error and handle silently
						if (err.error === 1545116 || err.errorSummary === 'Thread disabled') {
							if (!botLogging.silentOnDisabledThreads) {
								console.log(`Log thread ${logThreadID} is disabled, skipping log message`);
							}
						} else {
							console.error(`Failed to send log message to thread ${logThreadID}:`, err.message);
						}
					}
				}
			}
			
			// Send to admin IDs if enabled
			if (botLogging && botLogging.enable && botLogging.sendToAdmins) {
				for (const adminID of config.adminBot) {
					try {
						await api.sendMessage(msg, adminID);
					} catch (err) {
						// Check if it's a thread disabled error and handle silently
						if (err.error === 1545116 || err.errorSummary === 'Thread disabled') {
							if (!botLogging.silentOnDisabledThreads) {
								console.log(`Admin thread ${adminID} is disabled, skipping log message`);
							}
						} else {
							console.error(`Failed to send log message to admin ${adminID}:`, err.message);
						}
					}
				}
			}
		};
	}
};