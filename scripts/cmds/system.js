const os = require("os");
const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const Canvas = require("canvas");
const GIFEncoder = require("gifencoder");

const W = 1200, H = 700, G = 10;
const FB_ACCESS_TOKEN ="350685531728|62f8ce9f74b12f84c123cc23437a4a32";

const PAL = {
  bg0: "#091017",
  bg1: "#0f1823",
  glow: "#00eaff",
  accent1: "#00ffae",
  accent2: "#00b7ff",
  track: "#01271f",
  text: "#d8ffec",
  label: "#8cffe6"
};

const FONT = {
  title: "bold 50px Orbitron",
  label: "24px Orbitron",
  small: "26px Orbitron"
};

const BORDER = G * 4;

const rr = (c, x, y, w, h, r = 16) => {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
};

const dur = (s) => {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
};

const avatarCache = new Map();
async function getAvatar(uid, size = 256) {
  if (avatarCache.has(uid)) return avatarCache.get(uid);
  try {
    const url = `https://graph.facebook.com/${uid}/picture?height=${size}&width=${size}&redirect=false&access_token=${FB_ACCESS_TOKEN}`;
    const { data } = await axios.get(url);
    const imgURL = data?.data?.url;
    if (!imgURL) return null;
    const imgBuf = (await axios.get(imgURL, { responseType: "arraybuffer" })).data;
    const img = await Canvas.loadImage(imgBuf);
    avatarCache.set(uid, img);
    return img;
  } catch {
    return null;
  }
}

const COLORS = ["red", "blue", "yellow", "purple"];
const NAMED_RGB = {
  red: [255, 0, 0],
  blue: [0, 0, 255],
  yellow: [255, 255, 0],
  purple: [128, 0, 128]
};

const lerp = (a, b, t) => a + (b - a) * t;
const lerpRGB = (c1, c2, t) => c1.map((v, i) => Math.round(lerp(v, c2[i], t)));
const phaseColor = (p) => {
  const s = (p % 1) * COLORS.length;
  const i = Math.floor(s);
  const n = (i + 1) % COLORS.length;
  const t = s - i;
  return `rgb(${lerpRGB(NAMED_RGB[COLORS[i]], NAMED_RGB[COLORS[n]], t).join(",")})`;
};

async function drawFrame(ctx, uid, name, avImg, phase) {
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, PAL.bg0);
  bg.addColorStop(1, PAL.bg1);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.shadowColor = PAL.glow;
  ctx.shadowBlur = 40;
  ctx.lineWidth = G;
  ctx.strokeStyle = PAL.glow;
  rr(ctx, BORDER, BORDER, W - 2 * BORDER, H - 2 * BORDER, G * 3);
  ctx.stroke();
  ctx.shadowBlur = 0;

  const glow = phaseColor(phase);
  ctx.font = FONT.title;
  ctx.save();
  ctx.lineWidth = 5;
  ctx.strokeStyle = glow;
  ctx.shadowColor = glow;
  ctx.shadowBlur = 30;
  ctx.strokeText("⚡ SYSTEM STATUS", BORDER + G * 4, BORDER + G * 6);
  ctx.restore();

  const grad = ctx.createLinearGradient(
    BORDER + G * 4,
    0,
    BORDER + G * 4 + ctx.measureText("⚡ SYSTEM STATUS").width,
    0
  );
  grad.addColorStop(0, glow);
  grad.addColorStop(1, "#ffffff");
  ctx.fillStyle = grad;
  ctx.fillText("⚡ SYSTEM STATUS", BORDER + G * 4, BORDER + G * 6);

  const upS = process.uptime();
  const upPct = Math.min(upS / 864, 1) * 100;
  const memUsed = process.memoryUsage().rss / 1048576;
  const memTotal = os.totalmem() / 1048576;
  const memPct = (memUsed / memTotal) * 100;

  const barX = BORDER + G * 4, barW = G * 50, barH = G * 3;
  const b1 = BORDER + G * 11;
  const b2 = b1 + barH + G * 3;

  const bar = (y, p, c, l) => {
    ctx.fillStyle = PAL.track;
    rr(ctx, barX, y, barW, barH, G);
    ctx.fill();
    ctx.fillStyle = c;
    rr(ctx, barX, y, (barW * p) / 100, barH, G);
    ctx.fill();
    ctx.font = FONT.label;
    ctx.fillStyle = PAL.label;
    ctx.fillText(l, barX + barW + G * 3, y + barH - 3);
  };

  bar(b1, upPct, PAL.accent1, `Uptime ${upPct.toFixed(1)} %`);
  bar(b2, memPct, PAL.accent2, `RAM ${memPct.toFixed(1)} %`);

  ctx.font = "bold 40px Orbitron";
  ctx.fillStyle = PAL.text;
  ctx.fillText(`⏱ Uptime: ${dur(upS)}`, barX, b2 + G * 8);

  const avSize = G * 18;
  const avX = W - BORDER - G * 20 - avSize / 2;
  const avY = BORDER + G * 14 - avSize / 2;
  const ring = ctx.createLinearGradient(avX, avY, avX + avSize, avY + avSize);
  ring.addColorStop(0, "red");
  ring.addColorStop(0.5, "yellow");
  ring.addColorStop(1, "blue");
  ctx.beginPath();
  ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2 + 6, 0, Math.PI * 2);
  ctx.fillStyle = ring;
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2, 0, Math.PI * 2);
  ctx.clip();
  if (avImg) ctx.drawImage(avImg, avX, avY, avSize, avSize);
  else {
    ctx.fillStyle = "#233";
    ctx.fillRect(avX, avY, avSize, avSize);
  }
  ctx.restore();

  ctx.font = "bold 32px Orbitron";
  ctx.fillStyle = PAL.label;
  ctx.shadowColor = "#00ffe0";
  ctx.shadowBlur = 15;
  ctx.textAlign = "center";
  ctx.fillText(name, avX + avSize / 2, avY + avSize + G * 4);
  ctx.shadowBlur = 0;

  ctx.font = FONT.small;
  ctx.fillStyle = PAL.text;
  ctx.fillText(`ID: ${uid}`, avX + avSize / 2, avY + avSize + G * 7);
  ctx.textAlign = "start";

  const pY = H - BORDER - G * 22;
  const pW = W - 2 * BORDER - G * 8;
  rr(ctx, barX, pY, pW, G * 18, G * 2);
  ctx.fillStyle = "#0b1a25";
  ctx.fill();
  ctx.strokeStyle = PAL.glow;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = "26px Orbitron";
  ctx.fillStyle = PAL.text;
  const info = [
    `💾 ${memUsed.toFixed(1)} / ${memTotal.toFixed(0)} MB`,
    `🖥 ${os.platform()} · ${os.arch()}`,
    `⚙️ Node ${process.version.replace("v", "")}`,
    `🔧 ${os.cpus()[0].model}`
  ];
  info.forEach((t, i) => ctx.fillText(t, barX + G * 2, pY + G * 5 + i * G * 4));

  const sw = ctx.createLinearGradient(0, 0, W, H);
  const sh = (Date.now() % 4000) / 4000;
  sw.addColorStop(sh - 0.2, "rgba(255,255,255,0)");
  sw.addColorStop(sh, "rgba(255,255,255,.10)");
  sw.addColorStop(sh + 0.2, "rgba(255,255,255,0)");
  ctx.fillStyle = sw;
  ctx.globalCompositeOperation = "lighter";
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "source-over";
}

async function makeGif(uid, name) {
  const outDir = path.join(__dirname, "cache");
  await fs.ensureDir(outDir);
  const outPath = path.join(outDir, `uptime_${uid}.gif`);
  const enc = new GIFEncoder(W, H);
  enc.start();
  enc.setRepeat(0);
  enc.setDelay(160);
  enc.setQuality(20);
  const canvas = Canvas.createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  const avImg = await getAvatar(uid);
  for (let i = 0; i < 8; i++) {
    await drawFrame(ctx, uid, name, avImg, i / 8);
    enc.addFrame(ctx);
  }
  enc.finish();
  fs.writeFileSync(outPath, enc.out.getData());
  return outPath;
}

module.exports = {
  config: {
    name: "system",
    version: "2.4.78",
    author: "𝐀𝐒𝐈𝐅 | enhanced by ST",
    cooldown: 5,
    role: 0,
    shortDescription: "Animated uptime card GIF (accurate)",
    longDescription: "Shows uptime, RAM, platform, and system info in animated card",
    category: "system",
    guide: "{p}up"
  },
  ST: async ({ api, event }) => {
    try {
      const info = await api.getUserInfo(event.senderID);
      const name = info[event.senderID]?.name || "User";
      const gif = await makeGif(event.senderID, name);
      await api.sendMessage({
        body: "Here is the system status card:",
        attachment: fs.createReadStream(gif)
      }, event.threadID, () => fs.unlink(gif, () => {}));
    } catch (e) {
      console.error(e);
      api.sendMessage("❌ Couldn't generate animated card.", event.threadID);
    }
  }
};