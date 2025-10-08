const fs = require("fs-extra");
const { createCanvas, loadImage } = require("canvas");

module.exports = {
  config: {
    name: "hug",
    version: "1.1.0",
    author: "Rakib Adil",
    countDown: 5,
    role: 0,
    longDescription: "{p}hug @mention someone you want to hug that person 🫂",
    category: "funny",
    guide: "{p}hug and mention someone you want to hug 🥴",
    usePrefix: true,// you can use this command without prefix, juat set it to false.
    premium: false,
    notes: "If you change the author then the command will not work and not usable"
  },

  onStart: async function ({ api, message, event, usersData }) {
    const config = module.exports.config;
    const eAuth = "UmFraWIgQWRpbA==";
    const dAuth = Buffer.from(eAuth, "base64").toString("utf8");
    if (config.author !== dAuth) {
      return message.reply("⚠️ Command author mismatch. Please restore original author name to use this command.");
    }

    let one = event.senderID, two;
    const mention = Object.keys(event.mentions);
    
    if(mention.length > 0){
        two = mention[0];
    }else if(event.type === "message_reply") {
        two = event.messageReply.senderID;
    }else{
        message.reply("please mention or reply someone to hug")
    };

    try {
      const avatarURL1 = await usersData.getAvatarUrl(one);
      const avatarURL2 = await usersData.getAvatarUrl(two);

      const canvas = createCanvas(800, 750);
      const ctx = canvas.getContext("2d");

      const background = await loadImage("https://files.catbox.moe/qxovn9.jpg");
      ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

      const avatar1 = await loadImage(avatarURL1);
      const avatar2 = await loadImage(avatarURL2);

      ctx.save();
      ctx.beginPath();
      ctx.arc(610, 340, 85, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar1, 525, 255, 170, 170);
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.arc(230, 350, 85, 0, Math.PI * 2); // Bigger & lower
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar2, 145, 265, 170, 170);
      ctx.restore();

      const outputPath = `${__dirname}/tmp/hug_image.png`;
      const buffer = canvas.toBuffer("image/png");
      fs.writeFileSync(outputPath, buffer);

      message.reply(
        {
          body: "🫂 A warm hug 💞",
          attachment: fs.createReadStream(outputPath)
        },
        () => fs.unlinkSync(outputPath)
      );
    } catch (error) {
      console.error(error.message);
      api.sendMessage("⚠️ An error occurred, try again later.", event.threadID);
    }
  }
};