const { getTime } = global.utils;
const moment = require('moment-timezone');

module.exports = {
  config: {
    name: "info",
    version: "3.1",
    author: "RAKIB",
    countDown: 20,
    role: 0,
    shortDescription: "Owner information command",
    longDescription: "This command provides detailed info about the bot owner, uptime, and contact details.",
    category: "owner",
    guide: {}
  },

  onStart: async function ({ message }) {
    const authorName = "⫷ 𝗥𝗔𝗞𝗜𝗕 ⫸";
    const ownAge = "⫷vlobasa age mne nh😌⫸";
    const messenger = "m.me/RAKIB.404X";
    const authorFB = "https://facebook.com/RAKIB.404X";
    const authorNumber = "018112760××";
    const Status = "⫷ 𝐓𝐮𝐫 𝐣𝐚𝐢𝐧𝐚, 𝐥𝐚𝐯 𝐚𝐜𝐡𝐞 ⫸";

    const urls = [
      "https://i.ibb.co/tPZ9V27f/491340593-1199103648320331-755803130140295918-n-jpg-stp-dst-jpg-s480x480-tt6-nc-cat-104-ccb-1-7-nc-s.jpg",
      "https://i.ibb.co/tPZ9V27f/491340593-1199103648320331-755803130140295918-n-jpg-stp-dst-jpg-s480x480-tt6-nc-cat-104-ccb-1-7-nc-s.jpg"
    ];
    const link = urls[Math.floor(Math.random() * urls.length)];

    const now = moment().tz('Asia/Dhaka');
    const date = now.format('MMMM Do YYYY');
    const time = now.format('h:mm:ss A');
    const uptime = process.uptime();
    const seconds = Math.floor(uptime % 60);
    const minutes = Math.floor((uptime / 60) % 60);
    const hours = Math.floor((uptime / (60 * 60)) % 24);
    const days = Math.floor(uptime / (60 * 60 * 24));
    const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;

    message.reply({
      body: `
╔═《✨𝗢𝗪𝗡𝗘𝗥 𝗜𝗡𝗙𝗢✨》═╗

⭓ 🤖 𝗕𝗼𝘁 𝗡𝗮𝗺𝗲   : ${global.GoatBot.config.nickNameBot} 』
⭓ ☄️ 𝗣𝗿𝗲𝗳𝗶𝘅      :『 ${global.GoatBot.config.prefix} 』
⭓ ⚡ 𝗥𝘂𝗻 𝗧𝗶𝗺𝗲   :『 ${uptimeString} 』
⭓ 🗓️ 𝗗𝗮𝘁𝗲       :『 ${date} 』
⭓ ⏰ 𝗧𝗶𝗺𝗲       :『 ${time} 』
⭓ ✉️ 𝗖𝗼𝗻𝘁𝗮𝗰𝘁   :『 ${messenger} 』

⭓ 👑 𝗢𝘄𝗻𝗲𝗿       :『 ${authorName} 』
⭓ 🎂 𝗔𝗴𝗲        :『 ${ownAge} 』
⭓ ❤️ 𝗦𝘁𝗮𝘁𝘂𝘀      :『 ${Status} 』
⭓ 📱 𝗪𝗵𝗮𝘁𝘀𝗔𝗽𝗽   :『 ${authorNumber} 』
⭓ 🌐 𝗙𝗮𝗰𝗲𝗯𝗼𝗼𝗸   :『 ${authorFB} 』

╔═《🌍 𝗢𝗪𝗡𝗘𝗥 𝗦𝗢𝗖𝗜𝗔𝗟𝗦》═╗
• 📺 YouTube : ❝ Channel Deleted ❞
• ✈️ Telegram : @RAKIBX
• 📷 Instagram : @rakib_x_404
• 🧿 CapCut : ❝ Use kori nah ❞
• 🎵 TikTok : ❝ Eita diye ki bal felmu? ❞
╚════════════════════╝`,

      attachment: await global.utils.getStreamFromURL(link)
    });
  },

  onChat: async function ({ event, message }) {
    if (event.body && event.body.toLowerCase() === "info") {
      this.onStart({ message });
    }
  }
};