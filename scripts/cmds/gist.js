
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const stbotApi = new global.utils.STBotApis();

module.exports = {
  config: {
    name: "gist",
    aliases: ["rawupload"],
    version: "2.4.67",
    author: "ST | Sheikh Tamim",
    countDown: 5,
    role: 0,
    description: "Upload code files to get raw URL",
    category: "utility",
    guide: {
      en: "   {pn} <filename.ext> <code> - Upload code with extension\n"
        + "   {pn} -c <filename> - Upload command from path\n"
        + "   {pn} -e <filename> - Upload event from path"
    }
  },

  ST: async function({ message, args, event }) {
    const { senderID } = event;

    if (!args[0]) {
      return message.reply(
        "📝 Gist Upload Usage:\n\n" +
        "1. Upload code directly:\n" +
        "   !gist file.js <code>\n" +
        "   !gist style.css <code>\n" +
        "   !gist data.json <code>\n\n" +
        "2. Upload from path:\n" +
        "   !gist -c <filename> (command)\n" +
        "   !gist -e <filename> (event)"
      );
    }

    // Handle upload from command path
    if (args[0] === "-c") {
      if (!args[1]) {
        return message.reply("❌ Please provide a command filename");
      }

      const filename = args[1].endsWith('.js') ? args[1] : args[1] + '.js';
      const filePath = path.join(__dirname, filename);

      if (!fs.existsSync(filePath)) {
        return message.reply(`❌ Command file not found: ${filename}`);
      }

      const code = fs.readFileSync(filePath, "utf-8");
      const format = path.extname(filename);

      try {
        const response = await axios.post(`${stbotApi.baseURL}/api/raw/upload`, {
          filename: filename.replace(format, ''),
          code: code,
          format: format
        });

        if (response.data.success) {
          return message.reply(
            `✅ Command uploaded successfully!\n\n` +
            `📁 File: ${response.data.filename}\n` +
            `📂 Path: ${response.data.path}\n\n` +
            `🔗 Raw URL:\n${response.data.rawUrl}`
          );
        } else {
          return message.reply(`❌ Upload failed: ${response.data.message}`);
        }
      } catch (err) {
        return message.reply(`❌ Upload error: ${err.message}`);
      }
    }

    // Handle upload from event path
    if (args[0] === "-e") {
      if (!args[1]) {
        return message.reply("❌ Please provide an event filename");
      }

      const filename = args[1].endsWith('.js') ? args[1] : args[1] + '.js';
      const filePath = path.join(__dirname, '../events', filename);

      if (!fs.existsSync(filePath)) {
        return message.reply(`❌ Event file not found: ${filename}`);
      }

      const code = fs.readFileSync(filePath, "utf-8");
      const format = path.extname(filename);

      try {
        const response = await axios.post(`${stbotApi.baseURL}/api/raw/upload`, {
          filename: filename.replace(format, ''),
          code: code,
          format: format
        });

        if (response.data.success) {
          return message.reply(
            `✅ Event uploaded successfully!\n\n` +
            `📁 File: ${response.data.filename}\n` +
            `📂 Path: ${response.data.path}\n\n` +
            `🔗 Raw URL:\n${response.data.rawUrl}`
          );
        } else {
          return message.reply(`❌ Upload failed: ${response.data.message}`);
        }
      } catch (err) {
        return message.reply(`❌ Upload error: ${err.message}`);
      }
    }

    // Handle direct code upload
    const filename = args[0];
    const format = path.extname(filename);
    
    if (!format) {
      return message.reply("❌ Please provide a file extension (e.g., .js, .css, .json)");
    }

    const code = event.body.slice(event.body.indexOf(filename) + filename.length + 1).trim();

    if (!code) {
      return message.reply("❌ Please provide code to upload");
    }

    try {
      const response = await axios.post(`${stbotApi.baseURL}/api/raw/upload`, {
        filename: filename.replace(format, ''),
        code: code,
        format: format
      });

      if (response.data.success) {
        return message.reply(
          `✅ File uploaded successfully!\n\n` +
          `📁 File: ${response.data.filename}\n` +
          `📂 Path: ${response.data.path}\n\n` +
          `🔗 Raw URL:\n${response.data.rawUrl}\n\n` +
          `💡 Share this URL to access your code!`
        );
      } else {
        return message.reply(`❌ Upload failed: ${response.data.message}`);
      }
    } catch (err) {
      return message.reply(`❌ Upload error: ${err.message}`);
    }
  }
};
