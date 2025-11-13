
const axios = require("axios");
const yts = require("yt-search");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "sing",
    aliases: ["song", "music"],
    version: "2.4.73",
    author: "ST | Sheikh Tamim",
    countDown: 5,
    role: 0,
    shortDescription: { en: "Search and download YouTube songs" },
    longDescription: { en: "Search YouTube and download audio by selecting from results" },
    category: "music",
    guide: { en: "{pn} <song name>\nThen reply with a number (1-6) to download" }
  },

  ST: async function ({ message, args, event, usersData }) {
    const query = args.join(" ");
    if (!query) return message.reply("🎵 Please enter a song name.");

    const userName = await usersData.getName(event.senderID);
    const processingMsg = await message.reply(`⏳ ${userName}, searching for "${query}"... Please wait.`);

    try {
      const searchResult = await yts(query);
      if (!searchResult.videos.length) {
        await message.unsend(processingMsg.messageID);
        return message.reply("❌ No videos found for your query.");
      }

      const top6 = searchResult.videos.slice(0, 6);
      
      let resultMsg = `🔍 Top ${top6.length} YouTube Results for "${query}":\n\n`;
      
      const thumbnailStreams = [];
      
      for (let i = 0; i < top6.length; i++) {
        const v = top6[i];
        resultMsg += `${i + 1}. ${v.title}\n`;
        resultMsg += `   📺 ${v.author.name}\n`;
        resultMsg += `   ⏱ ${v.timestamp}\n`;
        resultMsg += `   🔗 ${v.url}\n\n`;
        
        // Download thumbnail
        try {
          const thumbResponse = await axios.get(v.thumbnail, { responseType: "arraybuffer" });
          const cacheDir = path.join(__dirname, "cache");
          if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
          }
          const thumbPath = path.join(cacheDir, `thumb_${Date.now()}_${i}.jpg`);
          fs.writeFileSync(thumbPath, Buffer.from(thumbResponse.data));
          thumbnailStreams.push(fs.createReadStream(thumbPath));
        } catch (err) {
          console.error(`Error downloading thumbnail ${i}:`, err.message);
        }
      }
      
      resultMsg += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      resultMsg += `💡 Reply with a number (1-${top6.length}) to download!`;

      await message.unsend(processingMsg.messageID);

      return message.reply({
        body: resultMsg,
        attachment: thumbnailStreams
      }, (err, info) => {
        // Clean up thumbnail files
        for (let i = 0; i < top6.length; i++) {
          const thumbPath = path.join(__dirname, "cache", `thumb_${Date.now()}_${i}.jpg`);
          if (fs.existsSync(thumbPath)) {
            fs.unlinkSync(thumbPath);
          }
        }
        
        if (!err) {
          global.GoatBot.onReply.set(info.messageID, {
            commandName: module.exports.config.name,
            messageID: info.messageID,
            author: event.senderID,
            videos: top6,
            userName: userName
          });
        }
      });

    } catch (err) {
      console.error(err);
      await message.unsend(processingMsg.messageID);
      return message.reply("⚠️ Error while searching: " + err.message);
    }
  },

  onReply: async function ({ message, event, Reply, api }) {
    const { videos, userName, author, messageID } = Reply;
    
    if (event.senderID !== author) {
      return message.reply("⚠️ Only the person who searched can download!");
    }

    const choice = parseInt(event.body.trim());
    
    if (isNaN(choice) || choice < 1 || choice > videos.length) {
      return message.reply(`❌ Invalid choice! Please reply with a number between 1 and ${videos.length}`);
    }

    // Unsend the search results message
    await message.unsend(messageID);

    const selectedVideo = videos[choice - 1];
    const videoUrl = selectedVideo.url;

    const downloadMsg = await message.reply(`⏳ Downloading "${selectedVideo.title}"... Please wait.`);

    try {
      const stbotApi = new global.utils.STBotApis();
      
      const payload = {
        url: videoUrl,
        format: "mp3"
      };

      const response = await axios.post(
        `${stbotApi.baseURL}/api/save/download`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': stbotApi.xApiKey
          }
        }
      );

      if (response.data.status && response.data.result && response.data.result.download) {
        const audioData = response.data.result;
        const audioUrl = audioData.download;
        const title = audioData.title;
        const duration = audioData.duration;
        const quality = audioData.quality;

        const cacheDir = path.join(__dirname, "cache");
        if (!fs.existsSync(cacheDir)) {
          fs.mkdirSync(cacheDir, { recursive: true });
        }

        const cachePath = path.join(cacheDir, `audio_${Date.now()}.mp3`);

        const audioResponse = await axios.get(audioUrl, {
          responseType: "arraybuffer"
        });

        fs.writeFileSync(cachePath, Buffer.from(audioResponse.data));

        await message.unsend(downloadMsg.messageID);

        await message.reply({
          body: `🎶 Now Playing: ${title}\n👤 Requested by: ${userName}\n⏱ Duration: ${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}\n🎵 Quality: ${quality}kbps`,
          attachment: fs.createReadStream(cachePath)
        });

        fs.unlinkSync(cachePath);
        
        global.GoatBot.onReply.delete(messageID);

      } else {
        await message.unsend(downloadMsg.messageID);
        return message.reply("❌ Failed to download the audio. The API returned an error.");
      }

    } catch (err) {
      console.error(err);
      await message.unsend(downloadMsg.messageID);
      return message.reply("⚠️ Error while downloading: " + err.message);
    }
  }
};
