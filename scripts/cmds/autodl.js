const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "autodl",
    aliases: [],
    version: "2.4.66",
    author: "ST | Sheikh Tamim",
    countDown: 5,
    role: 0,
    shortDescription: "Auto download videos from 12+ platforms",
    longDescription: "",
    category: "media",
    guide: {
      en: `Auto download from 12+ platforms: TikTok, Facebook, Instagram, YouTube, Twitter, Pinterest, Reddit, LinkedIn, CapCut, Douyin, Snapchat, Threads, Tumblr`,
    },
  },

  onStart: () => {},

  onChat: async function ({ message, event, usersData }) {
    const url = event.body?.trim() || "";
    if (!url) return;

    try {
      const supportedPlatforms = [
        "vt.tiktok.com", "www.tiktok.com", "vm.tiktok.com",
        "facebook.com", "fb.watch",
        "instagram.com",
        "youtu.be", "youtube.com",
        "x.com", "twitter.com",
        "pin.it", "pinterest.com",
        "reddit.com", "redd.it",
        "linkedin.com",
        "capcut.com",
        "douyin.com",
        "snapchat.com",
        "threads.net",
        "tumblr.com"
      ];

      const urlPattern = /https?:\/\/[^\s]+/gi;
      const urls = url.match(urlPattern);
      if (!urls || urls.length === 0) return;

      const validUrl = urls.find(u => 
        supportedPlatforms.some(domain => u.toLowerCase().includes(domain))
      );

      if (!validUrl) return;

      const userData = await usersData.get(event.senderID);
      const userName = userData ? userData.name : "User";

      const waitMsg = await message.reply(`⏳ Downloading your video, ${userName}... Please wait 😊`);

      const apiUrl = "https://st-dl.vercel.app/api/download/auto";
      const response = await axios.post(apiUrl, { url: validUrl });

      const data = response.data;
      if (!data?.success || !data?.data?.videos?.length) {
        throw new Error("No video found or download failed.");
      }

      const videoUrl = data.data.videos[0];

      const fileExt = path.extname(videoUrl.split("?")[0]) || ".mp4";
      const cacheDir = path.join(__dirname, "cache");
      const filePath = path.join(cacheDir, `download${fileExt}`);

      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

      const media = await axios.get(videoUrl, { responseType: "arraybuffer" });
      fs.writeFileSync(filePath, Buffer.from(media.data, "binary"));

      const tinyUrlResponse = await axios.get(
        `https://tinyurl.com/api-create.php?url=${encodeURIComponent(videoUrl)}`
      );

      message.unsend(waitMsg.messageID);

      await message.reply({
        body: `✅ Downloaded from ${data.platform?.toUpperCase() || "UNKNOWN"}\n🔗 Link: ${tinyUrlResponse.data}`,
        attachment: fs.createReadStream(filePath),
      });

      fs.unlinkSync(filePath);

    } catch (err) {
      console.error("Download error:", err);
      message.reply(
        `❌ Error: ${err.message}\n\nSupported platforms:\nTikTok, Facebook, Instagram, YouTube, Twitter, Pinterest, Reddit, LinkedIn, CapCut, Douyin, Snapchat, Threads, Tumblr`
      );
    }
  },
};