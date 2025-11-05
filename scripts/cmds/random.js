const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

const baseApi = async () => {
  const base = await axios.get("https://gitlab.com/Rakib-Adil-69/shizuoka-command-store/-/raw/main/apiUrls.json");
  return base.data.random;
};

module.exports = {
  config: {
    name: "random",
    aliases: [],
    version: "2.4.70",
    author: "Rakib Adil",
    role: 0,
    shortDescription: { en: "Upload, fetch, or list hot videos" },
    longDescription: { en: "Add videos by category, fetch random ones, or list all categories" },
    category: "fun",
    guide: { en: "{pn} add <category> (reply with video)\n{pn} <category>\n{pn} list\n{pn}" }
  },
  
  ST: async function({ api, event, message, args }) {
    const apiBase =  await baseApi();
    const action = args[0]?.toLowerCase();
    const category = args[1]?.toLowerCase();
    
    // 📋 List all categories
    if (action === "list") {
      try {
        const res = await axios.get(`${apiBase}/list`);
        if (!res.data.success) return message.reply("⚠️ Couldn't fetch categories!");
        
        const list = res.data.list
          .map(c => `🎞️ ${c.category}: ${c.count} videos`)
          .join("\n");
        
        return message.reply(
          `📂 Available Categories:\n\n${list}\n\n🎬 Total categories: ${res.data.totalCategories}`
        );
      } catch (e) {
        console.error("List error:", e.message);
        return message.reply("⚠️ Failed to fetch category list.");
      }
    }
    
    // 📤 Add a new video
    if (action === "add") {
      if (!category) return message.reply("⚠️ Usage: /random add <category> (reply with video)");
      
      const reply = event.messageReply;
      if (!reply?.attachments?.length) return message.reply("❌ Please reply to a video!");
      const video = reply.attachments.find(a => a.type === "video");
      if (!video) return message.reply("⚠️ Only video attachments are supported.");
      
      try {
        message.reply(`⏳ Uploading video to '${category}'...`);
        
        const tempPath = path.join(__dirname, `temp_${Date.now()}.mp4`);
        const response = await axios.get(video.url, { responseType: "arraybuffer" });
        fs.writeFileSync(tempPath, response.data);
        
        const form = new FormData();
        form.append("file", fs.createReadStream(tempPath));
        form.append("category", category);
        
        const uploadRes = await axios.post(`${apiBase}/upload`, form, { headers: form.getHeaders() });
        fs.unlinkSync(tempPath);
        
        const fileUrl = uploadRes.data.fileUrl;
        if (!fileUrl) return message.reply("❌ Upload failed!");
        
        return message.reply(`✅ Added video to '${category}'!\n🎥 URL: ${fileUrl}`);
      } catch (e) {
        console.error("Upload error:", e.message);
        return message.reply("❌ Upload failed. Try again later.");
      }
    }
    
    // 🎬 Fetch video (random or by category)
    try {
      api.setMessageReaction("⏳", event.messageID, () => {}, true);
      
      const params = action && action !== "add" && action !== "list" ? { category: action } : {};
      const res = await axios.get(`${apiBase}/video`, { params });
      const videoUrl = res.data.url;
      
      if (!videoUrl) {
        api.setMessageReaction("⚠️", event.messageID, () => {}, true);
        return message.reply("📭 No video found!");
      }
      
      // ✅ Download and send as attachment
      const tempFile = path.join(__dirname, `temp_${Date.now()}.mp4`);
      const vidRes = await axios.get(videoUrl, { responseType: "arraybuffer" });
      fs.writeFileSync(tempFile, vidRes.data);
      
      await message.reply({
        body: `🎬 Here's your ${action || "random"} video 🔥`,
        attachment: fs.createReadStream(tempFile)
      });
      
      fs.unlinkSync(tempFile);
      api.setMessageReaction("✅", event.messageID, () => {}, true);
    } catch (e) {
      console.error("Fetch video error:", e.message);
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply("⚠️ Failed to fetch video.");
    }
  }
};