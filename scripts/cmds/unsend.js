module.exports = {
        config: {
                name: "unsend",
                version: "1.2",
                author: "NTKhang",
                countDown: 5,
                role: 0,
                description: {
                        vi: "Gỡ tin nhắn của bot",
                        en: "Unsend bot's message"
                },
                category: "box chat",
                guide: {
                        vi: "reply tin nhắn muốn gỡ của bot và gọi lệnh {pn}",
                        en: "reply the message you want to unsend and call the command {pn}"
                }
        },

        langs: {
                vi: {
                        syntaxError: "Vui lòng reply tin nhắn muốn gỡ của bot"
                },
                en: {
                        syntaxError: "Please reply the message you want to unsend"
                }
        },

        onStart: async function ({ message, event, api, getLang }) {
                if (!event.messageReply)
                        return message.reply(getLang("syntaxError"));

                const botID = String(api.getCurrentUserID());
                const replyMsgID = event.messageReply.messageID;
                const replySenderID = String(event.messageReply.senderID || "");
                const isE2EEThread = typeof event.threadID === 'string' && event.threadID.includes('@');

                // For E2EE the native bridge may return an empty senderId (proto object {}).
                // Fall back to checking whether the bot's sent-message Set contains this ID.
                const isBotMsg = replySenderID === botID ||
                        (isE2EEThread && global._e2eeBotSentMsgIds &&
                         replyMsgID && global._e2eeBotSentMsgIds.has(String(replyMsgID)));

                if (!isBotMsg)
                        return message.reply(getLang("syntaxError"));

                // Pre-register the message ID → JID so unsendMessage.js routes via E2EE bridge
                if (isE2EEThread && replyMsgID) {
                        global._e2eeMessageMap = global._e2eeMessageMap || new Map();
                        global._e2eeMessageMap.set(String(replyMsgID), String(event.threadID));
                }
                message.unsend(replyMsgID);
        }
};