const os = require("os");
const pidusage = require("pidusage");
const fs = require("fs");
const path = require("path");
const { createCanvas } = require("canvas");
const GIFEncoder = require("gifencoder");

const toTime = (sec) => {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
};

module.exports = {
  config: {
    name: "cpanel2",
    aliases: [],
    version: "2.4.78",
    author: "Tarek Shikdar x Maya | Updated by ST",
    shortDescription: "Animated rainbow dashboard with spark effect 🌈✨",
    longDescription: "Shows system stats with rainbow animation and moving spark particles.",
    category: "info",
  },

  ST: async function (ctx) {
    await module.exports.sendUptime(ctx);
  },

  onChat: async function (ctx) {
    const input = ctx.event.body?.toLowerCase().trim();
    const { config } = module.exports;
    const triggers = [config.name, ...(config.aliases || [])];
    if (!triggers.includes(input)) return;
    await module.exports.sendUptime(ctx);
  },

  sendUptime: async function ({ message }) {
    const now = new Date();
    const formattedDate = now.toLocaleString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const uptimeBotSec = process.uptime();
    const uptimeSysSec = os.uptime();

    const usage = await pidusage(process.pid);
    const cpuUsage = usage.cpu.toFixed(2);
    const totalRamGB = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
    const usedRamMB = (usage.memory / 1024 / 1024).toFixed(2);
    const ramPercent = ((usage.memory / os.totalmem()) * 100).toFixed(2);
    const cpuModel = os.cpus()[0].model;
    const cpuCores = os.cpus().length;

    const width = 800,
      height = 600;
    const encoder = new GIFEncoder(width, height);
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    const file = path.join(__dirname, "dashboard.gif");
    const stream = fs.createWriteStream(file);

    encoder.createReadStream().pipe(stream);
    encoder.start();
    encoder.setRepeat(0);
    encoder.setDelay(80);
    encoder.setQuality(10);

    const BG_COLOR = "#0e0e1a";
    const TEXT_COLOR = "#ffffff";

    // Rainbow color generator
    function rainbowColor(t) {
      const r = Math.floor(128 + 127 * Math.sin(t));
      const g = Math.floor(128 + 127 * Math.sin(t + 2));
      const b = Math.floor(128 + 127 * Math.sin(t + 4));
      return `rgb(${r},${g},${b})`;
    }

    // Generate spark particles
    const sparks = [];
    for (let i = 0; i < 50; i++) {
      sparks.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 2 + 1,
        s: Math.random() * 0.8 + 0.2,
        a: Math.random() * 2 * Math.PI,
      });
    }

    // Draw donut chart function
    const drawDonut = (x, y, radius, percent, color, label, value) => {
      const startAngle = 1.5 * Math.PI;
      const endAngle = startAngle + (percent / 100) * 2 * Math.PI;

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.lineWidth = 18;
      ctx.strokeStyle = "#2d2d3c";
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x, y, radius, startAngle, endAngle);
      ctx.lineWidth = 18;
      ctx.strokeStyle = color;
      ctx.shadowBlur = 15;
      ctx.shadowColor = color;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = TEXT_COLOR;
      ctx.font = "bold 20px Arial";
      ctx.fillText(`${percent}%`, x, y + 5);
      ctx.font = "16px Arial";
      ctx.fillStyle = "#aaa";
      ctx.fillText(label, x, y + radius + 30);
      ctx.fillText(value, x, y + radius + 50);
    };

    // Animation loop
    for (let frame = 0; frame < 80; frame++) {
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, width, height);

      // Draw spark particles
      sparks.forEach((s) => {
        s.x += Math.cos(s.a) * s.s;
        s.y += Math.sin(s.a) * s.s;
        if (s.x < 0) s.x = width;
        if (s.y < 0) s.y = height;
        if (s.x > width) s.x = 0;
        if (s.y > height) s.y = 0;

        const gradient = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 2);
        gradient.addColorStop(0, rainbowColor(frame / 5));
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 2, 0, 2 * Math.PI);
        ctx.fill();
      });

      // Rainbow title
      const rainbow = rainbowColor(frame / 5);
      ctx.font = "bold 32px Arial";
      ctx.fillStyle = rainbow;
      ctx.textAlign = "center";
      ctx.fillText("🌈 SYSTEM DASHBOARD", width / 2, 70);

      ctx.font = "18px Arial";
      ctx.fillStyle = TEXT_COLOR;
      ctx.fillText(`Date: ${formattedDate}`, width / 2, 110);

      // Animated rainbow rings
      const ringColor = rainbowColor(frame / 8);

      drawDonut(200, 320, 70, cpuUsage, ringColor, "CPU Usage", `${cpuModel.split("@")[0]} (${cpuCores} cores)`);
      drawDonut(400, 320, 70, ramPercent, ringColor, "Memory", `${usedRamMB}MB / ${totalRamGB}GB`);
      drawDonut(600, 320, 70, (uptimeBotSec / 86400 * 100).toFixed(2), ringColor, "Bot Uptime", toTime(uptimeBotSec));

      ctx.font = "18px Arial";
      ctx.fillStyle = TEXT_COLOR;
      ctx.textAlign = "left";
      ctx.fillText(`System Uptime: ${toTime(uptimeSysSec)}`, 150, 520);
      ctx.fillText(`PID: ${process.pid}`, 150, 550);
      ctx.fillText(`CPU: ${cpuUsage}%  |  RAM: ${ramPercent}%`, 150, 580);

      encoder.addFrame(ctx);
    }

    encoder.finish();

    stream.on("finish", async () => {
      await message.reply({
        body: "🌈✨ Animated Rainbow Dashboard with Spark Effect!",
        attachment: fs.createReadStream(file),
      });
    });
  },
};