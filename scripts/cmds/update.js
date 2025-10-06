const axios = require("axios");
const fs = require("fs-extra");
const execSync = require("child_process").execSync;
const dirBootLogTemp = `${__dirname}/tmp/rebootUpdated.txt`;

module.exports = {
	config: {
		name: "update",
		version: "2.4.62",
		author: "ST | Sheikh Tamim",
		role: 2,
		description: {
			en: "Check for and install updates for the chatbot.",
			vi: "Kiểm tra và cài đặt phiên bản mới nhất của chatbot trên GitHub."
		},
		category: "owner",
		guide: {
			en: "   {pn}\n   {pn} refuse - Temporarily refuse update and allow bot to work normally for 2 hours",
			vi: "   {pn}\n   {pn} refuse - Từ chối cập nhật tạm thời và cho phép bot hoạt động bình thường trong 2 giờ"
		}
	},

	langs: {
		vi: {
			noUpdates: "✅ | Bạn đang sử dụng phiên bản mới nhất của GoatBot V2 (v%1).",
			updatePrompt: "💫 | Bạn đang sử dụng phiên bản %1. Hiện tại đã có phiên bản %2. Bạn có muốn cập nhật chatbot lên phiên bản mới nhất không?"
				+ "\n\n⬆️ | Các tệp sau sẽ được cập nhật:"
				+ "\n%3%4"
				+ "\n\nℹ️ | Xem chi tiết tại https://github.com/sheikhtamimlover/ST-BOT/commits/main"
				+ "\n💡 | Thả cảm xúc bất kỳ vào tin nhắn này để xác nhận",
			fileWillDelete: "\n🗑️ | Các tệp/thư mục sau sẽ bị xóa:\n%1",
			andMore: " ...và %1 tệp khác",
			updateConfirmed: "🚀 | Đã xác nhận, đang cập nhật...",
			updateComplete: "✅ | Cập nhật thành công, bạn có muốn khởi động lại chatbot ngay bây giờ không (phản hồi tin nhắn với nội dung \"yes\" hoặc \"y\" để xác nhận).",
			updateTooFast: "⭕ Vì bản cập nhật gần nhất được thực phát hành cách đây %1 phút %2 giây nên không thể cập nhật. Vui lòng thử lại sau %3 phút %4 giây nữa để cập nhật không bị lỗi.",
			botWillRestart: "🔄 | Bot sẽ khởi động lại ngay!",
			mediaLoadError: "⚠️ | Không thể tải một số tệp media từ bản cập nhật"
		},
		en: {
			noUpdates: "✅ | You are using the latest version of ST | BOT (v%1).",
			refuseSuccess: "✅ | Update requirement temporarily disabled for 2 hours. Bot will work normally.",
			noUpdateToRefuse: "⚠️ | No pending update to refuse.",
			updatePrompt: "💫 | You are using version %1. There is a new version %2. Do you want to update the chatbot to the latest version?"
				+ "\n\n⬆️ | The following files will be updated:"
				+ "\n%3%4"
				+ "\n\nℹ️ | See details at https://github.com/sheikhtamimlover/ST-BOT/commits/main"
				+ "\n💡 | React to this message to confirm.",
			fileWillDelete: "\n🗑️ | The following files/folders will be deleted:\n%1",
			andMore: " ...and %1 more files",
			updateConfirmed: "🚀 | Confirmed, updating...",
			updateComplete: "✅ | Update complete, do you want to restart the chatbot now (reply with \"yes\" or \"y\" to confirm)?",
			updateTooFast: "⭕ Because the latest update was released %1 minutes %2 seconds ago, you can't update now. Please try again after %3 minutes %4 seconds to avoid errors.",
			botWillRestart: "🔄 | The bot will restart now!",
			mediaLoadError: "⚠️ | Failed to load some media files from update"
		}
	},

	onLoad: async function ({ api }) {
		if (fs.existsSync(dirBootLogTemp)) {
			const threadID = fs.readFileSync(dirBootLogTemp, "utf-8");
			fs.removeSync(dirBootLogTemp);
			api.sendMessage("The chatbot has been restarted.", threadID);
		}
	},

	ST: async function ({ message, getLang, commandName, event, args }) {
		// Handle refuse command
		if (args[0] && (args[0].toLowerCase() === 'refuse' || args[0].toLowerCase() === 'r')) {
			if (global.updateAvailable && global.updateAvailable.hasUpdate) {
				// Set refuse timestamp (refuse for 2 hours)
				global.updateRefuseUntil = Date.now() + (2 * 60 * 60 * 1000);
				global.GoatBot.updateRefuseUntil = global.updateRefuseUntil;
				
				// Temporarily disable update requirement
				global.updateAvailable.hasUpdate = false;
				global.GoatBot.updateAvailable.hasUpdate = false;
				
				// Reset notification tracking to allow fresh notifications after 2 hours
				global.updateNotificationSent = {
					users: new Set(),
					admins: new Set()
				};
				
				const refuseMessage = `✅ Update Requirement Temporarily Disabled\n\n` +
					`⏰ The project will work normally for the next 2 hours.\n` +
					`After that, update will be required again.\n\n` +
					`💡 Use ${global.GoatBot.config.prefix}update anytime to update immediately.`;
				
				return message.reply(refuseMessage);
			} else {
				return message.reply("⚠️ No pending update to refuse.");
			}
		}
		
		// Check for updates
		const { data: { version } } = await axios.get("https://raw.githubusercontent.com/sheikhtamimlover/ST-BOT/refs/heads/main/package.json");
		const { data: versions } = await axios.get("https://raw.githubusercontent.com/sheikhtamimlover/ST-BOT/refs/heads/main/versions.json");

		const currentVersion = require("../../package.json").version;
		if (compareVersion(version, currentVersion) < 1)
			return message.reply(getLang("noUpdates", currentVersion));

		const newVersions = versions.slice(versions.findIndex(v => v.version == currentVersion) + 1);

		let fileWillUpdate = [...new Set(newVersions.map(v => Object.keys(v.files || {})).flat())]
			.sort()
			.filter(f => f?.length);
		const totalUpdate = fileWillUpdate.length;
		fileWillUpdate = fileWillUpdate
			.slice(0, 10)
			.map(file => ` - ${file}`).join("\n");

		let fileWillDelete = [...new Set(newVersions.map(v => Object.keys(v.deleteFiles || {}).flat()))]
			.sort()
			.filter(f => f?.length);
		const totalDelete = fileWillDelete.length;
		fileWillDelete = fileWillDelete
			.slice(0, 10)
			.map(file => ` - ${file}`).join("\n");

		// Get version notes
		const versionNotes = newVersions
			.filter(v => v.note)
			.map(v => `📝 v${v.version}: ${v.note}`)
			.join('\n');

		const notesSection = versionNotes ? `\n\n📋 What's New:\n${versionNotes}` : '';

		// Collect media URLs from all new versions
		const allImageUrls = newVersions.flatMap(v => v.imageUrl || []);
		const allVideoUrls = newVersions.flatMap(v => v.videoUrl || []);
		const allAudioUrls = newVersions.flatMap(v => v.audioUrl || []);
		const allMediaUrls = [...allImageUrls, ...allVideoUrls, ...allAudioUrls];

		// Prepare media section
		let mediaSection = '';
		if (allImageUrls.length > 0) mediaSection += `\n🖼️ Preview Images: ${allImageUrls.length}`;
		if (allVideoUrls.length > 0) mediaSection += `\n🎥 Demo Videos: ${allVideoUrls.length}`;
		if (allAudioUrls.length > 0) mediaSection += `\n🎵 Audio Files: ${allAudioUrls.length}`;

		// Prepare attachments from URLs
		const attachments = [];
		let mediaErrors = 0;
		for (const url of allMediaUrls.slice(0, 10)) { // Limit to 10 attachments
			try {
				const axios = require("axios");
				const response = await axios.get(url, { 
					responseType: 'stream',
					headers: {
						'User-Agent': 'ST-BOT/2.4.50'
					}
				});
				attachments.push(response.data);
			} catch (error) {
				console.error(`Failed to load media from ${url}:`, error.message);
				mediaErrors++;
			}
		}

		// Add media error info if any failed
		if (mediaErrors > 0 && allMediaUrls.length > 0) {
			mediaSection += `\n⚠️ ${mediaErrors} media files failed to load`;
		}

		// Prompt user to update
		const messageOptions = {
			body: getLang(
				"updatePrompt",
				currentVersion,
				version,
				fileWillUpdate + (totalUpdate > 10 ? "\n" + getLang("andMore", totalUpdate - 10) : ""),
				totalDelete > 0 ? "\n" + getLang(
					"fileWillDelete",
					fileWillDelete + (totalDelete > 10 ? "\n" + getLang("andMore", totalDelete - 10) : "")
				) : ""
			) + notesSection + mediaSection
		};

		if (attachments.length > 0) {
			messageOptions.attachment = attachments;
		}

		message.reply(messageOptions, (err, info) => {
				if (err)
					return console.error(err);

				global.GoatBot.onReaction.set(info.messageID, {
					messageID: info.messageID,
					threadID: info.threadID,
					authorID: event.senderID,
					commandName
				});
			});
	},

	onReaction: async function ({ message, getLang, Reaction, event, commandName }) {
		const { userID } = event;
		if (userID != Reaction.authorID)
			return;

		const { data: lastCommit } = await axios.get('https://api.github.com/repos/sheikhtamimlover/ST-BOT/commits/main');
		const lastCommitDate = new Date(lastCommit.commit.committer.date);
		// if < 5min then stop update and show message
		if (new Date().getTime() - lastCommitDate.getTime() < 5 * 60 * 1000) {
			const minutes = Math.floor((new Date().getTime() - lastCommitDate.getTime()) / 1000 / 60);
			const seconds = Math.floor((new Date().getTime() - lastCommitDate.getTime()) / 1000 % 60);
			const minutesCooldown = Math.floor((5 * 60 * 1000 - (new Date().getTime() - lastCommitDate.getTime())) / 1000 / 60);
			const secondsCooldown = Math.floor((5 * 60 * 1000 - (new Date().getTime() - lastCommitDate.getTime())) / 1000 % 60);
			return message.reply(getLang("updateTooFast", minutes, seconds, minutesCooldown, secondsCooldown));
		}

		await message.reply(getLang("updateConfirmed"));
		// Update chatbot
		execSync("node updater", {
			stdio: "inherit"
		});
		fs.writeFileSync(dirBootLogTemp, event.threadID);

		const updateCompleteMessage = getLang("updateComplete") + 
			"\n\n🐛 Found any bugs after update? Use " + global.GoatBot.config.prefix + "streport to report issues directly to the owner!" +
			"\n📱 Follow the developer: @sheikh.tamim_lover on Instagram for updates and support!";

		message.reply(updateCompleteMessage, (err, info) => {
			if (err)
				return console.error(err);

			global.GoatBot.onReply.set(info.messageID, {
				messageID: info.messageID,
				threadID: info.threadID,
				authorID: event.senderID,
				commandName
			});
		});
	},

	onReply: async function ({ message, getLang, event }) {
		if (['yes', 'y'].includes(event.body?.toLowerCase())) {
			// Set flag to indicate update completed successfully
			global.updateJustCompleted = true;
			await message.reply(getLang("botWillRestart"));
			process.exit(2);
		}
	}
};

function compareVersion(version1, version2) {
	const v1 = version1.split(".");
	const v2 = version2.split(".");
	for (let i = 0; i < 3; i++) {
		if (parseInt(v1[i]) > parseInt(v2[i]))
			return 1;
		if (parseInt(v1[i]) < parseInt(v2[i]))
			return -1;
	}
	return 0;
}
