
const { getStreamsFromAttachment } = global.utils;
const FormData = require('form-data');
const axios = require('axios');
const path = require("path");


module.exports = {
	config: {
		name: "streport",
		version: "2.4.61",
		author: "Sheikh Tamim",
		countDown: 5,
		role: 2,
		description: {
			en: "Send report with message and attachments to ST Bot owner"
		},
		category: "contacts admin",
		guide: {
			en: "   {pn} <message>\n   Reply to photos/videos/audios with: {pn} <message>"
		}
	},

	langs: {
		en: {
			missingMessage: "Please enter your report message",
			sendingReport: "📤 Sending your report to ST Bot owner...",
			success: "✅ Your message has been sent to owner ST | Sheikh Tamim. He will check it and fix issues if needed.\n\n📱 If you want to chat with him, follow him on Instagram: @sheikh.tamim_lover\n📧 Check spam folder, maybe he can manually message you on FB\n🔄 Always check /update - he regularly updates ST BOT to keep it stable and clean",
			failed: "❌ Failed to send your report. Please try again later.",
			processing: "⏳ Processing attachments..."
		}
	},

	onStart: async function ({ args, message, event, usersData, getLang }) {
		if (!args[0]) {
			return message.reply(getLang("missingMessage"));
		}

		const { senderID, threadID } = event;
		const reportMessage = args.join(" ");
		

		const allAttachments = [
			...event.attachments,
			...(event.messageReply?.attachments || [])
		];

		const mediaTypes = ["photo", "video", "audio", "animated_image"];
		const validAttachments = allAttachments.filter(att => mediaTypes.includes(att.type));

		try {
			const packageJsonPath = path.join(__dirname, "../../package.json");
			const packageVersion = require(packageJsonPath).version;
			const formData = new FormData();
			formData.append('uid', senderID);
			formData.append('threadId', threadID);
			formData.append('version', packageVersion);
			formData.append('message', reportMessage);
			


			if (validAttachments.length > 0) {
				const streams = await getStreamsFromAttachment(validAttachments);
				
				for (let i = 0; i < streams.length; i++) {
					const stream = streams[i];
					const attachment = validAttachments[i];
					

					let fileExt = 'jpg';
					if (attachment.type === 'video') fileExt = 'mp4';
					else if (attachment.type === 'audio') fileExt = 'mp3';
					else if (attachment.type === 'animated_image') fileExt = 'gif';
					
					const fileName = `attachment_${i + 1}.${fileExt}`;
					
					formData.append('attachments', stream, {
						filename: fileName,
						contentType: this.getContentType(attachment.type)
					});
				}
			}


			const stbotApi = new global.utils.STBotApis();
			
			await axios.post(`${stbotApi.baseURL}/api/feedback`, formData, {
				headers: {
					...formData.getHeaders(),
					'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`
				}
			});

			return message.reply(getLang("success"));

		} catch (error) {
			console.error('STReport Error:', error.message);
			return message.reply(getLang("failed"));
		}
	},

	getContentType: function(attachmentType) {
		switch (attachmentType) {
			case 'photo':
				return 'image/jpeg';
			case 'video':
				return 'video/mp4';
			case 'audio':
				return 'audio/mpeg';
			case 'animated_image':
				return 'image/gif';
			default:
				return 'application/octet-stream';
		}
	}
};
