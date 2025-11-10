const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const stbotApi = new global.utils.STBotApis();

module.exports = {
  config: {
    name: "autodl",
    aliases: [],
    version: "2.4.72",
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
    const inputUrl = event.body?.trim();
    if (!inputUrl) return;

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

    const urlPattern = /(?:https?:\/\/)?[^\s]+/gi;
    const urls = inputUrl.match(urlPattern);
    if (!urls || urls.length === 0) return;

    const validUrl = urls.find(u => {
      const urlToCheck = u.startsWith("http") ? u : `https://${u}`;
      return supportedPlatforms.some(domain => urlToCheck.toLowerCase().includes(domain));
    });

    if (!validUrl) return;
    const finalUrl = validUrl.startsWith("http") ? validUrl : `https://${validUrl}`;

    const userData = await usersData.get(event.senderID);
    const userName = userData ? userData.name : "User";

    const startTime = Date.now();
    const pr = await message.pr(`⏳ Downloading your video, ${userName}... Please wait 😊`, "✅");

    try {
      // ----------------------
      // Special YouTube Handling
      // ----------------------
      if (finalUrl.includes("youtube.com") || finalUrl.includes("youtu.be")) {
        const ytApiUrl = `${stbotApi.baseURL}/cyt/youtube`;
        const ytResp = await axios.post(ytApiUrl, { url: finalUrl }, { headers: stbotApi.getHeaders(true) });
        const ytData = ytResp.data;

        if (!ytData?.success || !ytData?.medias?.length) throw new Error("No YouTube video found.");

        // Filter for videos with audio, sort by height
        const mediaWithAudio = ytData.medias
          .filter(m => m.is_audio || m.audioQuality)
          .sort((a, b) => b.height - a.height);

        if (!mediaWithAudio.length) throw new Error("No YouTube video with audio available.");

        const media = mediaWithAudio[0];
        const proxyUrl = `${stbotApi.baseURL}${media.proxyUrl}`;
        const downloadUrl = `${stbotApi.baseURL}${media.downloadUrl}`;
        const filePath = path.join(__dirname, `${event.senderID}.mp4`);

        let usedUrl;
        try {
          usedUrl = proxyUrl;
          const streamResp = await axios({ url: proxyUrl, method: "GET", responseType: "stream" });
          const writer = fs.createWriteStream(filePath);
          streamResp.data.pipe(writer);
          await new Promise((resolve, reject) => { writer.on("finish", resolve); writer.on("error", reject); });
        } catch {
          usedUrl = downloadUrl;
          const streamResp = await axios({ url: downloadUrl, method: "GET", responseType: "stream" });
          const writer = fs.createWriteStream(filePath);
          streamResp.data.pipe(writer);
          await new Promise((resolve, reject) => { writer.on("finish", resolve); writer.on("error", reject); });
        }

        await pr.success();

        await message.reply({
          body: `🎬 | ${ytData.title || "YouTube Video"}\n✅ Platform: YouTube`,
          attachment: fs.createReadStream(filePath)
        });

        fs.unlinkSync(filePath);
        return; // exit after YouTube processing
      }

      // ----------------------
      // Other Platforms (12+)
      // ----------------------
      const apiUrl = `${stbotApi.baseURL}/api/download/auto`;
      const response = await axios.post(apiUrl, { url: finalUrl }, { headers: stbotApi.getHeaders(true) });
      const data = response.data;

      if (!data?.success || !data?.data?.videos?.length) throw new Error("No video found or download failed.");

      const videoUrl = data.data.videos[0];
      const fileExt = path.extname(videoUrl.split("?")[0]) || ".mp4";
      const cacheDir = path.join(__dirname, "cache");
      const filePath = path.join(cacheDir, `download${fileExt}`);
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

      const mediaResp = await axios.get(videoUrl, { responseType: "arraybuffer" });
      fs.writeFileSync(filePath, Buffer.from(mediaResp.data, "binary"));

      const tinyUrlResp = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(videoUrl)}`);
      const endTime = Date.now();
      const timeTaken = ((endTime - startTime) / 1000).toFixed(2);

      await pr.success();

      await message.reply({
        body: `✅ Downloaded from ${data.platform?.toUpperCase() || "UNKNOWN"}\n🔗 Link: ${tinyUrlResp.data}\n⏱️ Time taken: ${timeTaken}s`,
        attachment: fs.createReadStream(filePath),
      });

      fs.unlinkSync(filePath);

    } catch (err) {
      console.error("Download error:", err);
      await pr.error(
        `❌ Error: ${err.message}\n\nSupported platforms:\nTikTok, Facebook, Instagram, YouTube, Twitter, Pinterest, Reddit, LinkedIn, CapCut, Douyin, Snapchat, Threads, Tumblr`
      );
    }
  },
};
