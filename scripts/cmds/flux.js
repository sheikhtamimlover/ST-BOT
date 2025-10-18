const axios = require("axios");

module.exports = {
  config: {
    name: "flux",
    version: "2.4.68",
    author: "Dipto",
    role: 0, // 0 = all users, 1 = admin only
    shortDescription: {
      en: "Generate AI images"
    },
    longDescription: {
      en: "Generate AI images from text prompts using Flux API by Dipto"
    },
    category: "image generator",
    guide: {
      en: "{pn} [prompt] --ratio 1024x1024\nExample: {pn} cat wearing sunglasses --ratio 1:1"
    },
    countDown: 15
  },

  onStart: async function ({ args, message }) {
    const dipto = "https://www.noobs-api.rf.gd/dipto";

    if (!args[0]) {
      return message.reply("❌ Please provide a prompt.\nExample: flux cat in space --ratio 16:9");
    }

    try {
      const input = args.join(" ");
      const [prompt, ratio = "1:1"] = input.includes("--ratio")
        ? input.split("--ratio").map(s => s.trim())
        : [input, "1:1"];

      const pr = await message.pr("🌀 Generating your image, please wait...", "✅");

      const apiurl = `${dipto}/flux?prompt=${encodeURIComponent(prompt)}&ratio=${encodeURIComponent(ratio)}`;
      const response = await axios.get(apiurl, { responseType: "stream" });

      const imageMsg = {
        body: `✅ Done!\n📝 Prompt: ${prompt}\n📐 Ratio: ${ratio}`,
        attachment: response.data
      };

      await pr.success();
      return message.reply(imageMsg);

    } catch (error) {
      const pr = await message.pr("Processing failed...");
      await pr.error("❌ Failed to generate image.\nTry again later or check your prompt.");
    }
  }
};