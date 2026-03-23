const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const stbotApi = new global.utils.STBotApis();

module.exports = {
  config: {
    name: "gist",
    aliases: [],
    version: "2.4.78",
    author: "ST | Sheikh Tamim",
    countDown: 5,
    role: 0,
    description: "Upload code files to gist system",
    category: "utility",
    guide: {
      en:
        "   {pn} <filename.ext> <code>\n" +
        "   {pn} -c <filename>\n" +
        "   {pn} -e <filename>"
    }
  },

  ST: async function ({ message, args, event }) {

    if (!args[0]) {
      return message.reply(
        "📝 Gist Usage:\n\n" +
        "1. Direct upload:\n" +
        "   !gist file.js <code>\n\n" +
        "2. From path:\n" +
        "   !gist -c <filename>\n" +
        "   !gist -e <filename>"
      );
    }

    let filename, filePath, content;

    // ========================
    // 📁 COMMAND FILE (-c)
    // ========================
    if (args[0] === "-c") {
      if (!args[1]) {
        return message.reply("❌ Provide command filename");
      }

      filename = args[1].endsWith(".js") ? args[1] : args[1] + ".js";
      filePath = path.join(__dirname, filename);

      if (!fs.existsSync(filePath)) {
        return message.reply(`❌ File not found: ${filename}`);
      }

      content = fs.readFileSync(filePath, "utf-8");
    }

    // ========================
    // 📁 EVENT FILE (-e)
    // ========================
    else if (args[0] === "-e") {
      if (!args[1]) {
        return message.reply("❌ Provide event filename");
      }

      filename = args[1].endsWith(".js") ? args[1] : args[1] + ".js";
      filePath = path.join(__dirname, "../events", filename);

      if (!fs.existsSync(filePath)) {
        return message.reply(`❌ File not found: ${filename}`);
      }

      content = fs.readFileSync(filePath, "utf-8");
    }

    // ========================
    // 🧾 DIRECT CODE
    // ========================
    else {
      filename = args[0];

      if (!path.extname(filename)) {
        return message.reply("❌ File extension required");
      }

      content = event.body
        .slice(event.body.indexOf(filename) + filename.length + 1)
        .trim();

      if (!content) {
        return message.reply("❌ No code provided");
      }
    }

    // ========================
    // 🚀 API REQUEST
    // ========================
    try {
      const response = await axios.post(
        `${stbotApi.baseURL}/gist/files`,
        {
          filename: filename,
          content: content
        }
      );

      const res = response.data;

      if (res.success) {
        const data = res.data;

        return message.reply(
          `✅ Gist Uploaded Successfully & fully private !\n\n` +
          `📁 Name: ${data.name}\n` +
          `📦 Size: ${data.size} bytes\n` +
          `🔗 Download URL:\n${data.download_url}\n\n`
        );
      } else {
        return message.reply(`❌ Upload failed`);
      }

    } catch (err) {
      // 🔥 Better error debug
      if (err.response) {
        console.error("❌ STATUS:", err.response.status);
        console.error("❌ DATA:", err.response.data);
      }

      return message.reply(`❌ Error: ${err.message}`);
    }
  }
};