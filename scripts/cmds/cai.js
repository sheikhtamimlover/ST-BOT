const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const stapi = new global.utils.STBotApis();


const DEFAULT_CHARACTER_ID = "pUgX0GZ6P8SpBaLKWg3tATJRjIgK8m2jLAdkbo8nG8Y";

module.exports = {
  config: {
    name: "cai",
    aliases: [],
    version: "2.4.78",
    author: "ST | Sheikh Tamim",
    countDown: 5,
    role: 0,
    description: "Character AI chat system",
    category: "ai"
  },

ST: async function ({ message, args, event }) {
    const uid = event.senderID;
    global.caiData ??= {};
    global.caiData[uid] ??= {};


    if (args[0] === "audio" || args[0] === "-a") {
      const state = args[1];
      global.caiData[uid].audio = state === "on";
      return message.reply(`🎧 Audio ${state === "on" ? "ON" : "OFF"}`);
    }


    if (args[0] === "create") {
      return message.reply("✏️ Enter character name:", (err, info) => {
        global.GoatBot.onReply.set(info.messageID, {
          commandName: module.exports.config.name,
          author: uid,
          type: "create_name",
          data: {},
          messageID: info.messageID
        });
      });
    }


    if (args[0] === "list") {
      const res = await axios.get(`${stapi.baseURL}/cai/characters`);
      const chars = res.data.characters;

      let msg = "🎭 CHARACTER LIST:\n\n";
      chars.forEach((c, i) => msg += `${i + 1}. ${c.name}\n`);

      return message.reply(msg + "\n\nReply number to select", (err, info) => {
        global.GoatBot.onReply.set(info.messageID, {
          commandName: module.exports.config.name,
          author: uid,
          type: "select",
          characters: chars,
          messageID: info.messageID
        });
      });
    }


    const text = args.join(" ");
    if (!text) return message.reply("❌ Enter message");

    if (!global.caiData[uid].characterId) {
      global.caiData[uid].characterId = DEFAULT_CHARACTER_ID;
    }

    const voice = global.caiData[uid].audio === true;

    try {
      const res = await axios.post(`${stapi.baseURL}/cai/chat`, {
        message: text,
        characterId: global.caiData[uid].characterId,
        voiceEnabled: voice
      });

      const data = res.data;

 
      if (voice && data.audio) {
        const file = path.join(__dirname, "cai.mp3");
        const audio = (await axios.get(data.audio, { responseType: "arraybuffer" })).data;
        fs.writeFileSync(file, audio);

        return message.reply({
          body: data.reply,
          attachment: fs.createReadStream(file)
        }, (err, info) => {
          global.GoatBot.onReply.set(info.messageID, {
            commandName: module.exports.config.name,
            author: uid,
            type: "chat",
            messageID: info.messageID
          });
        });
      }

      return message.reply(data.reply, (err, info) => {
        global.GoatBot.onReply.set(info.messageID, {
          commandName: module.exports.config.name,
          author: uid,
          type: "chat",
          messageID: info.messageID
        });
      });

    } catch {
      return message.reply("❌ Chat error");
    }
  },


  onReply: async function ({ message, event, Reply }) {
    const uid = event.senderID;
    if (Reply.author !== uid) return;

    global.caiData ??= {};
    global.caiData[uid] ??= {};


    if (Reply.type === "select") {
      const index = parseInt(event.body);
      if (isNaN(index)) return message.reply("❌ Invalid number");

      const char = Reply.characters[index - 1];
      global.caiData[uid].characterId = char.characterId;

      return message.reply(`✅ Selected: ${char.name}`);
    }


    if (Reply.type === "chat") {
      const voice = global.caiData[uid].audio === true;

      try {
        const res = await axios.post(`${stapi.baseURL}/cai/chat`, {
          message: event.body,
          characterId: global.caiData[uid].characterId || DEFAULT_CHARACTER_ID,
          voiceEnabled: voice
        });

        const data = res.data;

        if (voice && data.audio) {
          const file = path.join(__dirname, "cai.mp3");
          const audio = (await axios.get(data.audio, { responseType: "arraybuffer" })).data;
          fs.writeFileSync(file, audio);

          return message.reply({
            body: data.reply,
            attachment: fs.createReadStream(file)
          }, (err, info) => {
            global.GoatBot.onReply.set(info.messageID, {
              commandName: module.exports.config.name,
              author: uid,
              type: "chat",
              messageID: info.messageID
            });
          });
        }

        return message.reply(data.reply, (err, info) => {
          global.GoatBot.onReply.set(info.messageID, {
            commandName: module.exports.config.name,
            author: uid,
            type: "chat",
            messageID: info.messageID
          });
        });

      } catch {
        return message.reply("❌ Chat failed");
      }
    }


    if (Reply.type.startsWith("create_")) {
      await message.unsend(Reply.messageID);

      const data = Reply.data;


      if (Reply.type === "create_name") {
        data.name = event.body;

        return message.reply("📝 Enter title:", (err, info) => {
          global.GoatBot.onReply.set(info.messageID, {
            commandName: module.exports.config.name,
            author: uid,
            type: "create_title",
            data,
            messageID: info.messageID
          });
        });
      }


      if (Reply.type === "create_title") {
        data.title = event.body;

        return message.reply("📄 Enter description:", (err, info) => {
          global.GoatBot.onReply.set(info.messageID, {
            commandName: module.exports.config.name,
            author: uid,
            type: "create_desc",
            data,
            messageID: info.messageID
          });
        });
      }


      if (Reply.type === "create_desc") {
        data.description = event.body;

        return message.reply("💬 Enter greeting:", (err, info) => {
          global.GoatBot.onReply.set(info.messageID, {
            commandName: module.exports.config.name,
            author: uid,
            type: "create_greet",
            data,
            messageID: info.messageID
          });
        });
      }


      if (Reply.type === "create_greet") {
        data.greeting = event.body;

        const res = await axios.post(`${stapi.baseURL}/cai/create`, {
          name: data.name,
          title: data.title,
          description: data.description,
          greeting: data.greeting
        });

        return message.reply(
          `✅ Character Created!\n\n` +
          `👤 ${data.name}\n` +
          `📌 ${data.title}`
        );
      }

    }
  }
};