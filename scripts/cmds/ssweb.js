const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const stapi = new global.utils.STBotApis();

module.exports = {
  config: {
    name: "ssweb",
    aliases: [],
    version: "2.4.78",
    author: "ST | Sheikh Tamim",
    countDown: 5,
    role: 0,
    description: "Website screenshot tool",
    category: "utility",
    guide: {
      en:
        "!ssweb <url>\n" +
        "!ssweb mobile <url>\n" +
        "!ssweb custom <url>\n" +
        "!ssweb -c <url>"
    }
  },

  ST: async function ({ message, args }) {

    if (!args[0]) {
      return message.reply("❌ Provide a URL");
    }

    let mode = "desktop";
    let url;


    if (args[0] === "mobile") {
      mode = "phone";
      url = args[1];
    }


    else if (args[0] === "custom" || args[0] === "-c") {
      mode = "custom";
      url = args[1];
    }


    else {
      url = args[0];
    }

    if (!url) {
      return message.reply("❌ URL missing");
    }

    try {
      let apiUrl = `${stapi.baseURL}/api/screenshot?url=${encodeURIComponent(url)}&mode=${mode}`;


      if (mode === "custom") {
        apiUrl += `&width=1200&height=1200`;
      } else {
        apiUrl += `&width=&height=`;
      }


      const res = await axios.get(apiUrl, {
        responseType: "arraybuffer"
      });

      const filePath = path.join(__dirname, "ssweb.png");
      fs.writeFileSync(filePath, res.data);

      return message.reply({
        body: `📸 Screenshot (${mode})\n🌐 ${url}`,
        attachment: fs.createReadStream(filePath)
      });

    } catch (err) {
      console.error(err.response?.data || err.message);
      return message.reply("❌ Screenshot failed");
    }
  }
};