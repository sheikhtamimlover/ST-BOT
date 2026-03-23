const axios = require("axios");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const sharp = require("sharp");
const stapi = new global.utils.STBotApis();


module.exports = {
  config: {
    name: "zom",
    version: "2.4.78",
    author: "ST | Sheikh Tamim",
    description: "Zombify image using AI (Classic/In Place + Zombie/Witch/Werewolf)",
    category: "Anime Filter",
    guide: {
      en: `🧟 Usage:
Reply to an image and type:
• !zom → Default (Classic + Zombie)
• !zom <mode> <model>

Modes:
1️⃣ Classic
2️⃣ In Place

Models:
1️⃣ Zombie
2️⃣ Witch
3️⃣ Werewolf`
    }
  },

  ST: async function ({ api, event, args, usersData }) {
    try {
      // Ensure user replied to an image
      if (!event.messageReply || !event.messageReply.attachments?.length) {
        return api.sendMessage("⚠️ | Please reply to an image to use this command.", event.threadID, event.messageID);
      }

      // ===== Mode & Model Setup =====
      const modes = { 1: "Classic", 2: "In Place" };
      const models = { 1: "zombie", 2: "witch", 3: "werewolf" };

      const mode = modes[args[0]] || "Classic";
      const model = models[args[1]] || "zombie";

      // ===== Fetch User Info =====
      const userData = await usersData.get(event.senderID);
      const userName = userData ? userData.name : "Unknown User";

      // ===== Download Image =====
      const imageUrl = event.messageReply.attachments[0].url;
      const imgBuffer = (await axios.get(imageUrl, { responseType: "arraybuffer" })).data;

      // ===== FormData Payload =====
      const form = new FormData();
      form.append("image", Buffer.from(imgBuffer), {
        filename: "billie.jpeg",
        contentType: "image/jpeg"
      });
      form.append("mode", mode);
      form.append("model", model);

      // ===== Send Processing Message =====
      const processingMsg = await api.sendMessage(
        `🧠 | Processing your image (${mode} + ${model})...`,
        event.threadID,
        event.messageID
      );

      // ===== API Request =====
      const response = await axios.post(`${stapi.baseURL}/api/zombify`, form, {
        headers: form.getHeaders()
      });

      const resultUrl = response.data?.resultUrl;
      if (!response.data?.success || !resultUrl) {
        // Unsend processing message before returning error
        api.unsendMessage(processingMsg.messageID);
        return api.sendMessage("⚠️ | Failed to process image. Please try again later.", event.threadID, event.messageID);
      }

      // ===== Download Processed Image =====
      const processedImage = (await axios.get(resultUrl, { responseType: "arraybuffer" })).data;

      // ===== Convert WebP → JPEG =====
      const jpegBuffer = await sharp(Buffer.from(processedImage))
        .jpeg({ quality: 90 })
        .toBuffer();

      // ===== Save to Temp File =====
      const tmpDir = path.join(__dirname, "tmp");
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
      const tempPath = path.join(tmpDir, `zom_${Date.now()}.jpg`);
      await fs.promises.writeFile(tempPath, jpegBuffer);

      // ===== Unsend "Processing..." Message =====
      api.unsendMessage(processingMsg.messageID);

      // ===== Send Final Processed Image =====
      await api.sendMessage(
        {
          body: `✨ | ${userName}, your image has been transformed!\n🧩 Mode: ${mode}\n👹 Model: ${model}`,
          attachment: fs.createReadStream(tempPath)
        },
        event.threadID
      );

      // ===== Cleanup Temp File =====
      setTimeout(() => {
        fs.promises.unlink(tempPath).catch(() => {});
      }, 5000);

    } catch (error) {
      console.error("❌ ZOM ERROR:", {
        message: error.message,
        response: error.response?.data,
        stack: error.stack
      });
      const err = error.response?.data?.error || error.message;
      api.sendMessage(`⚠️ | Failed to process: ${err}`, event.threadID, event.messageID);
    }
  }
};