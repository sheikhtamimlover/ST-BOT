const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const stapi = new global.utils.STBotApis();

module.exports = {
  config: {
    name: "emojimix",
    aliases: [],
    version: "2.4.78",
    author: "ST | Sheikh Tamim",
    countDown: 5,
    role: 0,
    description: "Mix two emojis into one image",
    category: "fun",
    guide: {
      en: "!emojimix 😊😍"
    }
  },

  ST: async function ({ message, args }) {

    if (!args[0]) {
      return message.reply("❌ Usage: !emojimix 😊😍");
    }

    // join all emojis (supports space or no space)
    const emoji = args.join("");

    try {
      const url = `${stapi.baseURL}/api/combine?emoji=${encodeURIComponent(emoji)}`;

      // 📥 get image buffer
      const res = await axios.get(url, {
        responseType: "arraybuffer"
      });

      const filePath = path.join(__dirname, "emojimix.png");
      fs.writeFileSync(filePath, res.data);

      return message.reply({
        body: `✨ Emoji Mix: ${emoji}`,
        attachment: fs.createReadStream(filePath)
      });

    } catch (err) {
      console.error(err.response?.data || err.message);
      return message.reply("❌ Failed to mix emojis");
    }
  }
};