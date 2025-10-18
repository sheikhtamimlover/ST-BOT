
const axios = require('axios');

module.exports = {
	config: {
		name: "stmsg",
		version: "2.4.68",
		author: "ST | Sheikh Tamim",
		countDown: 5,
		role: 2,
		description: "View and reply to ST messages from server",
		category: "admin",
		guide: {
			en: "   {pn} - View list of messages\n" +
			     "   Reply with message number to view full message\n" +
			     "   Reply to the full message to send response to server"
		}
	},

	langs: {
		en: {
			noMessages: "📭 No messages found for this thread.",
			messageList: "📬 ST Messages List\n━━━━━━━━━━━━━━━━━━━━━━\n\n%1\n\n━━━━━━━━━━━━━━━━━━━━━━\n💡 Reply with message number to view details",
			messageDetails: "📬 Message #%1\n━━━━━━━━━━━━━━━━━━━━━━\n\n%2\n\n📅 Sent: %3\n━━━━━━━━━━━━━━━━━━━━━━\n💬 Reply to this message to respond to ST Bot server",
			sendingReply: "⏳ Sending your reply to ST Bot server...",
			replySuccess: "✅ Your reply has been sent to ST Bot server successfully!",
			replyFailed: "❌ Failed to send reply: %1",
			error: "❌ Failed to fetch messages. Please try again later.",
			onlyAdmin: "⚠️ Only bot admins can reply to ST messages."
		}
	},

	onStart: async function ({ message, event, getLang, api }) {
		const mainThreadId = global.GoatBot.config.mainThreadId;
		
		if (!mainThreadId || mainThreadId.trim() === "") {
			return message.reply("❌ Main thread ID not configured in config.json");
		}
		
		try {
			const stbotApi = new global.utils.STBotApis();
			const response = await axios.get(`${stbotApi.baseURL}/api/messages/ids/${mainThreadId}`);
			
			if (!response.data.success || !response.data.data || response.data.data.length === 0) {
				return message.reply(getLang("noMessages"));
			}
			
			const messagesList = response.data.data
				.reverse()
				.map((msg) => `${msg.serialNo}. ${msg.preview || 'No preview'}\n   📅 ${msg.sentAt}`)
				.join('\n\n');
			
			return message.reply(
				getLang("messageList", messagesList),
				(err, info) => {
					if (!err) {
						global.GoatBot.onReply.set(info.messageID, {
							commandName: module.exports.config.name,
							messageID: info.messageID,
							author: event.senderID,
							messagesData: response.data.data,
							type: 'list'
						});
					}
				}
			);
		} catch (error) {
			return message.reply(getLang("error"));
		}
	},

	onReply: async function ({ message, event, Reply, getLang, args, api }) {
		const { author, messagesData, type, originalMessageId, threadId } = Reply;
		
		if (event.senderID !== author) {
			return;
		}
		
		const isAdmin = global.utils.isAdmin(event.senderID);
		if (!isAdmin) {
			return message.reply(getLang("onlyAdmin"));
		}
		
		if (type === 'list') {
			const messageNum = parseInt(args[0]);
			
			if (isNaN(messageNum)) {
				return;
			}
			
			const selectedMessage = messagesData.find(msg => msg.serialNo === messageNum);
			
			if (!selectedMessage) {
				return message.reply("❌ Message not found");
			}
			
			try {
				const stbotApi = new global.utils.STBotApis();
				const detailResponse = await axios.get(`${stbotApi.baseURL}/api/messages/by-id/${selectedMessage.messageId}`);
				
				if (!detailResponse.data.success || !detailResponse.data.data) {
					return message.reply(getLang("error"));
				}
				
				const msgData = detailResponse.data.data;
				const attachments = [];
				
				if (msgData.mediaUrls && msgData.mediaUrls.length > 0) {
					for (const media of msgData.mediaUrls) {
						try {
							const stream = await global.utils.getStreamFromURL(media.url);
							attachments.push(stream);
						} catch (e) {
							// Silent fail
						}
					}
				}
				
				const msgOptions = {
					body: getLang("messageDetails", msgData.serialNo, msgData.message, msgData.sentAt)
				};
				
				if (attachments.length > 0) {
					msgOptions.attachment = attachments;
				}
				
				const mainThreadId = global.GoatBot.config.mainThreadId;
				
				return message.reply(msgOptions, (err, info) => {
					if (!err) {
						global.GoatBot.onReply.set(info.messageID, {
							commandName: module.exports.config.name,
							messageID: info.messageID,
							author: event.senderID,
							originalMessageId: selectedMessage.messageId,
							threadId: mainThreadId,
							type: 'reply'
						});
					}
				});
				
			} catch (error) {
				return message.reply(getLang("error"));
			}
		}
		else if (type === 'reply') {
			const replyText = event.body;
			
			if (!replyText || !replyText.trim()) {
				return;
			}
			
			try {
				await message.reply(getLang("sendingReply"));
				
				const stbotApi = new global.utils.STBotApis();
				
				const replyPayload = {
					sendId: originalMessageId,
					threadId: threadId,
					message: replyText
				};
				
				const response = await axios.post(`${stbotApi.baseURL}/api/messages/reply`, replyPayload, {
					headers: {
						'Content-Type': 'application/json'
					}
				});
				
				if (response.data.success) {
					return message.reply(getLang("replySuccess"));
				} else {
					return message.reply(getLang("replyFailed", response.data.error || 'Unknown error'));
				}
				
			} catch (error) {
				return message.reply(getLang("replyFailed", error.message));
			}
		}
	}
};
