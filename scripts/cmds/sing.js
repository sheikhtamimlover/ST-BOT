const axios = require("axios");
const yts = require("yt-search");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "sing",
    aliases: ["song"],
    version: "2.4.78",
    author: "ST | Sheikh Tamim",
    role: 0,
    category: "music"
  },

  ST: async function ({ message, args, event, usersData }) {
    const stapi = new global.utils.STBotApis();

    if (!args[0]) {
      return message.reply("🎵 Enter song name");
    }


    let showList = false;

    if (args[0] === "-s") {
      showList = true;
      args.shift();
    }

    const query = args.join(" ");
    if (!query) return message.reply("❌ Enter song name");

    const userName = await usersData.getName(event.senderID);
    const processing = await message.reply(`⏳ Searching "${query}"...`);

    try {
      const search = await yts(query);
      if (!search.videos.length) {
        await message.unsend(processing.messageID);
        return message.reply("❌ No results found");
      }


      if (!showList) {
        const v = search.videos[0];

        await message.unsend(processing.messageID);

        const dlMsg = await message.reply(`⬇️ Downloading: ${v.title}`);

        const res = await axios.post(`${stapi.baseURL}/audioytdlv1`, {
          url: v.url,
          format: "mp3"
        });

        if (!res.data?.downloadUrl) {
          await message.unsend(dlMsg.messageID);
          return message.reply("❌ Download failed");
        }

        const audio = await axios.get(res.data.downloadUrl, {
          responseType: "arraybuffer"
        });

        const file = path.join(__dirname, "cache", `audio_${Date.now()}.mp3`);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, Buffer.from(audio.data));

        await message.unsend(dlMsg.messageID);

        await message.reply({
          body:
            `🎶 ${v.title}\n` +
            `👤 ${v.author.name}\n` +
            `⏱ ${v.timestamp}`,
          attachment: fs.createReadStream(file)
        });

        fs.unlinkSync(file);
        return;
      }


      const top = search.videos.slice(0, 6);

      let msg = `🔍 Results for "${query}"\n\n`;

      top.forEach((v, i) => {
        msg += `${i + 1}. ${v.title}\n⏱ ${v.timestamp}\n\n`;
      });

      msg += "👉 Reply with number";

      await message.unsend(processing.messageID);

      return message.reply(msg, (err, info) => {
        global.GoatBot.onReply.set(info.messageID, {
          commandName: module.exports.config.name,
          author: event.senderID,
          videos: top
        });
      });

    } catch (e) {
      console.error(e);
      await message.unsend(processing.messageID);
      return message.reply("❌ Error: " + e.message);
    }
  },


  onReply: async function ({ message, event, Reply, usersData }) {
    if (event.senderID !== Reply.author) {
      return message.reply("⚠️ Not your request");
    }

    const choice = parseInt(event.body);
    if (isNaN(choice) || choice < 1 || choice > Reply.videos.length) {
      return message.reply("❌ Invalid choice");
    }

    const stapi = new global.utils.STBotApis();
    const video = Reply.videos[choice - 1];

    const userName = await usersData.getName(event.senderID);

    const dlMsg = await message.reply(`⬇️ Downloading: ${video.title}`);

    try {
      const res = await axios.post(`${stapi.baseURL}/audioytdlv1`, {
        url: video.url,
        format: "mp3"
      });

      if (!res.data?.downloadUrl) {
        await message.unsend(dlMsg.messageID);
        return message.reply("❌ Download failed");
      }

      const audio = await axios.get(res.data.downloadUrl, {
        responseType: "arraybuffer"
      });

      const file = path.join(__dirname, "cache", `audio_${Date.now()}.mp3`);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, Buffer.from(audio.data));

      await message.unsend(dlMsg.messageID);

      await message.reply({
        body:
          `🎶 ${video.title}\n` +
          `👤 Requested by: ${userName}\n` +
          `⏱ ${video.timestamp}`,
        attachment: fs.createReadStream(file)
      });

      fs.unlinkSync(file);

    } catch (err) {
      console.error(err);
      await message.unsend(dlMsg.messageID);
      return message.reply("❌ Download error");
    }
  }
};