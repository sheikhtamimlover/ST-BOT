const axios = require('axios');

module.exports = {
  config: {
    name: 'gpt',
    aliases: [],
    version: '2.4.70',
    author: 'ST',
    countDown: 0,
    role: 0,
    shortDescription: 'Chat with GPT',
    longDescription: {
      vi: 'Chat with GPT AI',
      en: 'Chat with GPT AI'
    },
    category: 'AI',
    guide: {
      en: '{pn} <your message>\nReply to bot message to continue conversation'
    }
  },

  onReply: async function ({ api, event, handleReply }) {
    if (event.type !== "message_reply") return;

    const userMessage = event.body.toLowerCase();
    if (userMessage === '/r' || userMessage === '/edittext') return;

    try {
      let data = JSON.stringify({
        "agent": 1,
        "context": [
          {
            "role": "user",
            "content": userMessage
          }
        ],
        "message": userMessage
      });

      let config = {
        method: 'POST',
        url: 'https://api.manusai.watch/api/chat',
        headers: {
          'User-Agent': 'Masiha%20AI/1 CFNetwork/3860.100.1 Darwin/25.0.0',
          'Content-Type': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        data: data
      };

      const response = await axios.request(config);

      if (response.data && response.data.status && response.data.data) {
        const gptResponse = response.data.data;

        api.sendMessage(gptResponse, event.threadID, (error, info) => {
          if (!error && info) {
            if (global.GoatBot && global.GoatBot.onReply) {
              global.GoatBot.onReply.set(info.messageID, {
                commandName: module.exports.config.name,
                type: 'reply',
                messageID: info.messageID,
                author: event.senderID,
                text: gptResponse
              });
            }
          }
        }, event.messageID);
      } else {
        api.sendMessage('❌ No response from AI.', event.threadID, event.messageID);
      }

    } catch (error) {
      console.error('GPT Error:', error.message);
      api.sendMessage('❌ An error occurred while processing your request.', event.threadID, event.messageID);
    }
  },

  onStart: async function ({ api, args, event }) {
    try {
      if (!args[0]) {
        api.sendMessage(
          "Hello! I'm GPT AI\nHow can I assist you today?\n\nUsage: gpt <your message>",
          event.threadID,
          event.messageID
        );
        return;
      }

      const userMessage = args.join(' ');

      let data = JSON.stringify({
        "agent": 1,
        "context": [
          {
            "role": "user",
            "content": userMessage
          }
        ],
        "message": userMessage
      });

      let config = {
        method: 'POST',
        url: 'https://api.manusai.watch/api/chat',
        headers: {
          'User-Agent': 'Masiha%20AI/1 CFNetwork/3860.100.1 Darwin/25.0.0',
          'Content-Type': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        data: data
      };

      const response = await axios.request(config);

      if (response.data && response.data.status && response.data.data) {
        const gptResponse = response.data.data;

        api.sendMessage(gptResponse, event.threadID, (error, info) => {
          if (!error && info) {
            if (global.GoatBot && global.GoatBot.onReply) {
              global.GoatBot.onReply.set(info.messageID, {
                commandName: module.exports.config.name,
                type: 'reply',
                messageID: info.messageID,
                author: event.senderID,
                text: gptResponse
              });
            }
          }
        }, event.messageID);
      } else {
        api.sendMessage('❌ No response from AI.', event.threadID, event.messageID);
      }

    } catch (error) {
      console.error('GPT Error:', error.message);
      api.sendMessage(`❌ An error occurred: ${error.message}`, event.threadID, event.messageID);
    }
  }
};
