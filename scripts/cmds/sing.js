
const axios = require("axios");
const yts = require("yt-search");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "sing",
    aliases: [],
    version: "2.4.72",
    author: "ST | Sheikh Tamim",
    countDown: 5,
    role: 0,
    shortDescription: "Search and download YouTube songs",
    longDescription: "Search and download audio from YouTube",
    category: "music",
    guide: {
      en: "{pn} <song name>"
    }
  },

  ST: async function ({ message, args, event, usersData }) {
    const query = args.join(" ");
    if (!query) return message.reply("🎵 Please enter a song name.");

    const userName = await usersData.getName(event.senderID);
    const processingMsg = await message.reply(`⏳ ${userName}, searching and downloading... Please wait.`);

    try {
      const searchResult = await yts(query);
      if (!searchResult.videos.length) {
        await message.unsend(processingMsg.messageID);
        return message.reply("❌ No videos found for your query.");
      }

      const video = searchResult.videos[0];
      const videoUrl = video.url;

      const stbotApi = new global.utils.STBotApis();
      const payload = { url: videoUrl };

      const response = await axios.post(
        `${stbotApi.baseURL}/cyt/youtube`,
        payload,
        { 
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': stbotApi.xApiKey
          }
        }
      );

      if (response.data.success && response.data.medias) {
        const audioMedia = response.data.medias.find(m => m.type === 'audio');
        
        if (!audioMedia) {
          await message.unsend(processingMsg.messageID);
          return message.reply("❌ No audio format found.");
        }

        const audioUrl = `${stbotApi.baseURL}${audioMedia.downloadUrl || audioMedia.proxyUrl}`;
        const title = response.data.title;
        const filename = `audio.${audioMedia.extension || audioMedia.ext || 'mp3'}`;

        const cachePath = path.join(__dirname, "cache", filename);

        const audioResponse = await axios.get(audioUrl, {
          responseType: "arraybuffer"
        });

        fs.writeFileSync(cachePath, Buffer.from(audioResponse.data));

        await message.unsend(processingMsg.messageID);

        await message.reply({
          body: `🎶 Now Playing: ${title}\n👤 Requested by: ${userName}`,
          attachment: fs.createReadStream(cachePath)
        });

        fs.unlinkSync(cachePath);
      } else {
        await message.unsend(processingMsg.messageID);
        return message.reply("❌ Failed to download the audio.");
      }

    } catch (err) {
      console.error(err);
      await message.unsend(processingMsg.messageID);
      return message.reply("⚠️ Error while processing your request: " + err.message);
    }
  }
};
