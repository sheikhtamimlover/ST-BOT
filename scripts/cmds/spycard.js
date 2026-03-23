const fs = require("fs-extra");
const path = require("path");
const Canvas = require("canvas");
const moment = require("moment");
const GIFEncoder = require("gifencoder");

// Units & shortenNumber function
const units = ["", "K", "M", "B", "T", "Q", "S", "O", "N", "D"];
function shortenNumber(num) {
  if (num < 1000) return num.toString();
  let unitIndex = 0;
  let n = num;
  while (n >= 1000 && unitIndex < units.length - 1) {
    n /= 1000;
    unitIndex++;
  }
  if (units[unitIndex] === "D") {
    const shortNum = Math.floor(num).toString().slice(0, 4);
    return shortNum + "..D";
  }
  return n.toFixed(2).replace(/\.?0+$/, "") + units[unitIndex];
}

function getLevelInfo(exp) {
  let level = 1;
  let expNeed = 100;
  while (exp >= expNeed) {
    exp -= expNeed;
    level++;
    expNeed = level * 100 + 70;
  }
  return { level, curExp: exp, expNeed };
}

module.exports = {
  config: {
    name: "spycard",
    version: "2.4.78",
    author: " Asif | Updated by ST",
    countDown: 3,
    role: 0,
    shortDescription: { en: "Show animated rank card" },
    longDescription: { en: "Starry night style animated rank card with glowing multi-color border" },
    category: "profile",
    guide: { en: "{pn} (reply or mention optional)" }
  },

  ST: async function ({ api, event, usersData }) {
    try {
      // Target UID
      let uid;
      if (Object.keys(event.mentions).length > 0) {
        uid = Object.keys(event.mentions)[0];
      } else if (event.type === "message_reply") {
        uid = event.messageReply.senderID;
      } else {
        uid = event.senderID;
      }

      // User info
      const info = (await api.getUserInfo(uid))[uid] || {};
      let name = info.name || "Unknown";

      // Group nickname
      let nickname = null;
      try {
        const threadInfo = await api.getThreadInfo(event.threadID);
        if (threadInfo?.nicknames && threadInfo.nicknames[uid]) {
          nickname = threadInfo.nicknames[uid];
        }
      } catch {}
      nickname = nickname || info.alternateName || "None";

      const gender = info.gender === 2 ? "Boy ♂️" : "Girl ♀️";
      const now = moment().format("YYYY-MM-DD hh:mm A");

      // Database
      const userData = await usersData.get(uid) || {};
      const exp = userData.exp || 0;
      const money = userData.money || 0;
      const username = info.vanity || userData.username || `user.${uid.slice(-4)}`;

      // Level
      const { level, curExp, expNeed: maxExp } = getLevelInfo(exp);

      // Rank
      const allUsers = await usersData.getAll();
      const sortedExp = [...allUsers].sort((a, b) => (b.exp || 0) - (a.exp || 0));
      const rank = sortedExp.findIndex(u => u.userID == uid) + 1 || 0;
      const sortedMoney = [...allUsers].sort((a, b) => (b.money || 0) - (a.money || 0));
      const moneyRank = sortedMoney.findIndex(u => u.userID == uid) + 1 || 0;

      // GIF
      const W = 1200, H = 600;
      const FRAMES = 6;
      const FPS = 20;

      const tmp = path.join(__dirname, `rank-${uid}.gif`);
      const enc = new GIFEncoder(W, H);
      enc.start();
      enc.setRepeat(0);
      enc.setDelay(1000 / FPS);
      enc.setQuality(15);

      let avatar = null;
      try {
        avatar = await Canvas.loadImage(
          `https://graph.facebook.com/${uid}/picture?height=512&width=512&access_token=350685531728|62f8ce9f74b12f84c123cc23437a4a32`
        );
      } catch {}

      for (let f = 0; f < FRAMES; f++) {
        const cv = Canvas.createCanvas(W, H);
        const ctx = cv.getContext("2d");

        // BG Gradient
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, "#2e0854");
        bg.addColorStop(0.4, "#5a0e82");
        bg.addColorStop(0.7, "#22035c");
        bg.addColorStop(1, "#1a1a70");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        // Stars
        for (let i = 0; i < 40; i++) {
          const x = Math.random() * W;
          const y = Math.random() * H;
          const r = Math.random() * 1.5 + 0.3;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.8 + 0.2})`;
          ctx.fill();
        }

        // Border Glow
        const phase = f / FRAMES;
        const borderGrad = ctx.createLinearGradient(0, 0, W, H);
        borderGrad.addColorStop(0, `hsl(${(phase + 0) * 360}, 100%, 60%)`);
        borderGrad.addColorStop(0.33, `hsl(${(phase + 0.33) * 360}, 100%, 60%)`);
        borderGrad.addColorStop(0.66, `hsl(${(phase + 0.66) * 360}, 100%, 60%)`);
        borderGrad.addColorStop(1, `hsl(${(phase + 1) * 360}, 100%, 60%)`);
        ctx.strokeStyle = borderGrad;
        ctx.lineWidth = 18;
        ctx.strokeRect(0, 0, W, H);

        // Profile ring
        const cX = W / 2, cY = 160;
        ctx.strokeStyle = `hsl(${(f / FRAMES) * 360},100%,65%)`;
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(cX, cY, 110, 0, Math.PI * 2);
        ctx.stroke();

        // Avatar
        ctx.save();
        ctx.beginPath();
        ctx.arc(cX, cY, 100, 0, Math.PI * 2);
        ctx.clip();
        if (avatar) ctx.drawImage(avatar, cX - 100, 60, 200, 200);
        else {
          ctx.fillStyle = "#333";
          ctx.fill();
        }
        ctx.restore();

        // Name
        ctx.font = "bold 48px Sans";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText(name, cX, 320);

        // Left info
        ctx.font = "bold 30px Sans";
        ctx.fillStyle = "#aaccff";
        ctx.textAlign = "left";
        let y = 380, gap = 46;
        ctx.fillText(`UID:  ${uid}`, 80, y); y += gap;
        ctx.fillText(`Nickname:  ${nickname}`, 80, y); y += gap;
        ctx.fillText(`Gender:  ${gender}`, 80, y); y += gap;
        ctx.fillText(`Username:  ${username}`, 80, y); y += gap;
        ctx.fillText(`Level: ${level}`, 80, y);

        // Right info
        ctx.textAlign = "right";
        y = 380;
        const rX = W - 80;
        ctx.fillStyle = "#ffd280";
        ctx.fillText(`EXP: ${shortenNumber(curExp)} / ${shortenNumber(maxExp)}`, rX, y); y += gap;
        ctx.fillText(`Rank: #${rank}`, rX, y); y += gap;
        ctx.fillText(`Money: ${shortenNumber(money)}`, rX, y); y += gap;
        ctx.fillText(`Money Rank: #${moneyRank}`, rX, y); y += gap;
        ctx.fillText(`Bot Friend: ${info.isFriend ? " Yes" : " No"}`, rX, y); y += gap;

        // Time
        ctx.font = "24px Sans";
        ctx.fillStyle = "#99ccff";
        ctx.textAlign = "center";
        ctx.fillText(`Updated: ${now}`, cX, H - 30);

        enc.addFrame(ctx);
      }

      enc.finish();
      fs.writeFileSync(tmp, enc.out.getData());

      // ------ body message logic: reply vs normal ------
      const bodyMessage = (event.type === "message_reply")
        ? `Spy card for ${name}.`
        : `Your spy card here.`;

      api.sendMessage({
        body: bodyMessage,
        attachment: fs.createReadStream(tmp)
      }, event.threadID, () => fs.unlinkSync(tmp));
    } catch (e) {
      api.sendMessage("⚠️ Error: " + e.message, event.threadID, event.messageID);
    }
  }
};