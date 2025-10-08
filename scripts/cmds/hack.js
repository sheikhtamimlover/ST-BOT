const { loadImage, createCanvas } = require('canvas');
const axios = require('axios');
const fs = require('fs-extra');

module.exports = {
  config: {
    name: "hack",
    version: "1.0.10",
    author: "Rakib Adil",
    description: "Create a fake hacked image for mentioned user or the sender user",
    guide: "use {p}hack or {p}hack @mention or reply to someone's message",
    countDown: 5,
    role: 0,
    category: "fun",
    usePrefix: true, // you can use this cmd without prefix by setting to false.
    premium: false
  },

  wrapText: async (text, ctx, maxWidth) => {
    return new Promise((resolve) => {
      if (ctx.measureText(text).width < maxWidth) return resolve([text]);
      if (ctx.measureText("W").width > maxWidth) return resolve(null);
      const words = text.split(" ");
      const lines = [];
      let line = "";
      while (words.length > 0) {
        let split = false;
        while (ctx.measureText(words[0]).width >= maxWidth) {
          const temp = words[0];
          words[0] = temp.slice(0, -1);
          if (split) words[1] = `${temp.slice(-1)}${words[1]}`;
          else {
            split = true;
            words.splice(1, 0, temp.slice(-1));
          }
        }
        if (ctx.measureText(`${line}${words[0]}`).width < maxWidth) line += `${words.shift()} `;
        else {
          lines.push(line.trim());
          line = "";
        }
        if (words.length === 0) lines.push(line.trim());
      }
      return resolve(lines);
    });
  },

  onStart: async ({ args, api, event }) => {
    const pathImg = __dirname + "/cache/bgImg.png";
    const pathAvt1 = __dirname + "/cache/avt.png";

    const mentionIds = Object.keys(event.mentions || {});
    const targetId = (event.messageReply && event.messageReply.senderID)
      ? event.messageReply.senderID
      : (mentionIds.length ? mentionIds[0] : event.senderID);

    let name = "Unknown";
    try {
      const info = await api.getUserInfo(targetId);
      if (info && info[targetId] && info[targetId].name) name = info[targetId].name;
    } catch (e) {
      console.warn("getUserInfo failed:", e?.message || e);
    }

    const bgImg = [
      "https://i.ibb.co/zTf5GSs2/Screenshot-2025-03-03-22-28-20-197-com-facebook-lite-1.png"
    ];
    const rndm = bgImg[Math.floor(Math.random() * bgImg.length)];

    try {
      const bgRes = await axios.get(rndm, { responseType: "arraybuffer" });
      fs.writeFileSync(pathImg, Buffer.from(bgRes.data));

      const avtRes = await axios.get(
        `https://graph.facebook.com/${targetId}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`,
        { responseType: "arraybuffer" }
      );
      fs.writeFileSync(pathAvt1, Buffer.from(avtRes.data));

      const baseImg = await loadImage(pathImg);
      const baseAvt = await loadImage(pathAvt1);

      const canvas = createCanvas(baseImg.width, baseImg.height);
      const ctx = canvas.getContext("2d");

      ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height);

      ctx.font = "35px Arial";
      ctx.fillStyle = "#1878F3";
      ctx.textAlign = "left";

      const lines = await module.exports.wrapText(name, ctx, 350);
      let x = 300;
      let y = 740;
      if (lines && Array.isArray(lines)) {
        for (let line of lines) {
          ctx.fillText(line, x, y);
          y += 33;
        }
      } else {
        ctx.fillText(name, x, y);
      }

      ctx.drawImage(baseAvt, 127, 660, 130, 140);

      const imageBuffer = canvas.toBuffer();
      fs.writeFileSync(pathImg, imageBuffer);

      fs.removeSync(pathAvt1);

      return api.sendMessage(
        {
          body: "✅ hacked done, please check your inbox for pass ⚠️",
          attachment: fs.createReadStream(pathImg)
        },
        event.threadID,
        () => fs.unlinkSync(pathImg),
        event.messageID
      );
    } catch (err) {
      console.error("Error in hack cmd:", err);
      try { if (fs.existsSync(pathAvt1)) fs.removeSync(pathAvt1); } catch(e){}
      try { if (fs.existsSync(pathImg)) fs.removeSync(pathImg); } catch(e){}
      return api.sendMessage("❌ Failed to create hack image. Try again later.", event.threadID, event.messageID);
    }
  }
};