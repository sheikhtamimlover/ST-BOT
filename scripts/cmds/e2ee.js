module.exports = {
    config: {
        name: "e2ee",
        version: "1.0",
        author: "ST",
        countDown: 5,
        role: 0,
        description: {
            en: "Test end-to-end encrypted (E2EE) messaging"
        },
        category: "system",
        guide: {
            en: "{pn} — send an E2EE test message with interactive reply"
        }
    },

    langs: {
        en: {
            notE2EE: "⚠️ This command only works in E2EE (end-to-end encrypted) chats.",
            testMsg: "🔒 E2EE Test\n━━━━━━━━━━━━━━━━\nYour message is end-to-end encrypted.\n\nReply with a number:\n1️⃣  1 — Ping test\n2️⃣  2 — Thread info",
            reply1: "✅ Pong! E2EE bridge is working perfectly.",
            reply2: "📋 E2EE Thread Info\n━━━━━━━━━━━━━━━━\n• Thread: {threadID}\n• Encrypted: ✅ Yes\n• Protocol: Labyrinth\n• Bridge: Active",
            replyOther: "❓ Unknown option. Reply with 1 or 2."
        }
    },

    onStart: async function ({ message, event, api, getLang }) {
        if (!event.isE2EE) {
            return message.reply(getLang("notE2EE"));
        }

        // 1. React to the user's triggering message
        await api.setMessageReaction("🔒", event.messageID, () => {}, true).catch(() => {});

        // 2. Show typing indicator for 5 seconds
        await api.sendTypingIndicator(true, event.threadID, () => {}).catch(() => {});
        await new Promise(resolve => setTimeout(resolve, 5000));
        await api.sendTypingIndicator(false, event.threadID, () => {}).catch(() => {});

        // 3. Send the interactive test message
        const sentInfo = await message.reply(getLang("testMsg"));
        if (sentInfo && sentInfo.messageID) {
            global.GoatBot.onReply.set(sentInfo.messageID, {
                commandName: "e2ee",
                messageID: sentInfo.messageID,
                author: event.senderID,
                threadID: event.threadID
            });
        }
    },

    onReply: async function ({ message, event, Reply, getLang }) {
        const choice = (event.body || "").trim();

        if (choice === "1") {
            return message.reply(getLang("reply1"));
        } else if (choice === "2") {
            return message.reply(getLang("reply2").replace("{threadID}", event.threadID));
        } else {
            return message.reply(getLang("replyOther"));
        }
    }
};
