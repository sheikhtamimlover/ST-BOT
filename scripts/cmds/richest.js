const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");
const GIFEncoder = require("gif-encoder-2");

// --- Utility functions ---
function formatMoney(num) {
    if (num === null || num === undefined || num === 0) return "0.00$";
    const absNum = Math.abs(num);
    if (absNum < 1000) return absNum.toFixed(2) + "$";
    if (absNum >= 1e12) return (num / 1e12).toFixed(2) + "T$";
    if (absNum >= 1e9) return (num / 1e9).toFixed(2) + "B$";
    if (absNum >= 1e6) return (num / 1e6).toFixed(2) + "M$";
    if (absNum >= 1e3) return (num / 1e3).toFixed(2) + "K$";
    return absNum.toFixed(2) + "$";
}

async function getAvatar(api, userID) {
    try {
        const info = await api.getUserInfo(userID);
        const url = info[userID].thumbSrc;
        return await loadImage(url);
    } catch {
        return await loadImage('https://i.imgur.com/gK9u5iL.png');
    }
}

module.exports = {
  config: {
    name: "richest",
    version: "2.4.78",
    author: "Zihad Ahmed & Gemini | Updated by ST",
    role: 0,
    category: "group",
    description: "Top 3 Special Cards with Active Dot on Photo and Jil Jil Effect"
  },

  ST: async function ({ api, message, usersData }) {
    let processingMsg;
    try {
      processingMsg = await message.reply("⏳ Generating the Rich Leaderboard...");

      const allUsers = await usersData.getAll();
      const topUsers = allUsers.sort((a, b) => (b.money || 0) - (a.money || 0)).slice(0, 15);

      const avatarMap = new Map();
      await Promise.all(topUsers.map(async (user) => {
          const avatar = await getAvatar(api, user.userID);
          avatarMap.set(user.userID, avatar);
      }));

      const width = 1000, height = 1150;
      const gifPath = path.join(__dirname, "cache", `top_rich_${Date.now()}.gif`);
      await fs.ensureDir(path.dirname(gifPath));

      const encoder = new GIFEncoder(width, height);
      const gifStream = fs.createWriteStream(gifPath);
      encoder.createReadStream().pipe(gifStream);
      encoder.start();
      encoder.setRepeat(0);
      encoder.setDelay(80);
      encoder.setQuality(10);

      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      const particles = Array.from({ length: 60 }, () => ({
          x: Math.random() * width, y: Math.random() * height,
          size: Math.random() * 3 + 1, opacity: Math.random()
      }));

      for (let i = 0; i < 12; i++) {
        const rgbColor = `hsl(${(i * 30) % 360}, 100%, 65%)`;

        ctx.fillStyle = '#05050a';
        ctx.fillRect(0, 0, width, height);

        // Sparkle (Jil Jil) Effect
        particles.forEach(p => {
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.abs(Math.sin(i / 2 + p.opacity * 10))})`;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        });

        // Title
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 55px Arial';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 15; ctx.shadowColor = rgbColor;
        ctx.fillText("🏆 RICHEST USERS LEADERBOARD 🏆", width / 2, 80);
        ctx.shadowBlur = 0;

        // --- Top 3 Visual Cards ---
        const cardWidth = 280, cardHeight = 310, startY = 160;
        const positions = [
            { idx: 0, x: width/2 - 140, y: startY - 20, color: '#FFD700', label: '1ST' }, 
            { idx: 1, x: 50, y: startY + 20, color: '#C0C0C0', label: '2ND' },            
            { idx: 2, x: width - 330, y: startY + 20, color: '#CD7F32', label: '3RD' }    
        ];

        positions.forEach(pos => {
            const user = topUsers[pos.idx];
            if (!user) return;

            ctx.save();
            ctx.shadowBlur = 10; ctx.shadowColor = pos.color;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
            ctx.fillRect(pos.x, pos.y, cardWidth, cardHeight);
            ctx.strokeStyle = (pos.idx === 0) ? rgbColor : pos.color;
            ctx.lineWidth = 4; ctx.strokeRect(pos.x, pos.y, cardWidth, cardHeight);
            ctx.restore();

            // Avatar
            const av = avatarMap.get(user.userID);
            const avR = 65, avCX = pos.x + cardWidth/2, avCY = pos.y + 85;
            ctx.save();
            ctx.beginPath(); ctx.arc(avCX, avCY, avR, 0, Math.PI * 2); ctx.clip();
            if (av) ctx.drawImage(av, avCX - avR, avCY - avR, avR * 2, avR * 2);
            ctx.restore();

            // --- Active Dot ON Avatar ---
            ctx.beginPath();
            ctx.arc(avCX + 45, avCY + 45, 12, 0, Math.PI * 2);
            ctx.fillStyle = "#00FF00";
            ctx.fill();
            ctx.strokeStyle = "#05050a";
            ctx.lineWidth = 3;
            ctx.stroke();

            // Name & Money
            ctx.fillStyle = '#FFF'; ctx.font = 'bold 26px Arial';
            ctx.fillText(user.name.slice(0, 15), avCX, pos.y + 195);
            ctx.fillStyle = '#FFD700'; ctx.font = 'bold 30px Arial';
            ctx.fillText(formatMoney(user.money), avCX, pos.y + 245);
            ctx.fillStyle = pos.color; ctx.font = 'bold 22px Arial';
            ctx.fillText(pos.label, avCX, pos.y + 285);
        });

        // --- Rank 4 - 15 List ---
        let listY = 520;
        for (let j = 3; j < topUsers.length; j++) {
            const user = topUsers[j];
            ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
            ctx.fillRect(50, listY, width - 100, 48);

            ctx.textAlign = 'left'; ctx.fillStyle = rgbColor;
            ctx.font = 'bold 24px Arial'; ctx.fillText(`#${j + 1}`, 70, listY + 32);

            const av = avatarMap.get(user.userID);
            ctx.save();
            ctx.beginPath(); ctx.arc(135, listY + 24, 18, 0, Math.PI * 2); ctx.clip();
            if (av) ctx.drawImage(av, 117, listY + 6, 36, 36);
            ctx.restore();

            ctx.fillStyle = '#E5E7EB'; ctx.font = '22px Arial';
            ctx.fillText(user.name.slice(0, 25), 180, listY + 32);

            ctx.textAlign = 'right'; ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 26px Arial'; ctx.fillText(formatMoney(user.money), width - 70, listY + 32);
            listY += 52;
        }
        encoder.addFrame(ctx);
      }

      encoder.finish();
      await new Promise(res => gifStream.on("finish", res));
      if (processingMsg) api.unsendMessage(processingMsg.messageID);
      await message.reply({ attachment: fs.createReadStream(gifPath) });
      fs.unlinkSync(gifPath);

    } catch (err) {
      console.error(err);
      message.reply("❌ Error occurred!");
    }
  }
};