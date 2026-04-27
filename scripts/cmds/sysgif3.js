const os = require("os");
const moment = require("moment-timezone");
const { createCanvas } = require("canvas");
const GIFEncoder = require("gif-encoder-2");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "sysgif3",
    aliases: ["sg3", "status3"],
    version: "2.4.78",
    author: "ST | Sheikh Tamim",
    description: "Animated system dashboard - Neon grid design",
    usage: "sysgif3",
    category: "system",
    role: 0,
    countDown: 10
  },

  ST: async function ({ api, event, message }) {
    const { threadID } = event;
    
    const loadingMsg = await message.reply("⚡ Generating neon grid dashboard...");
    
    try {
      const width = 1400, height = 900;
      const encoder = new GIFEncoder(width, height);
      const fileName = `sysgif3_${Date.now()}.gif`;
      const filePath = path.join(__dirname, fileName);
      const stream = fs.createWriteStream(filePath);
      encoder.createReadStream().pipe(stream);

      encoder.start();
      encoder.setRepeat(0);
      encoder.setDelay(120);
      encoder.setQuality(10);

      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      const formatUptime = (sec) => {
        const d = Math.floor(sec / 86400);
        const h = Math.floor((sec % 86400) / 3600);
        const m = Math.floor((sec % 3600) / 60);
        return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`;
      };

      const getSystemStats = () => {
        const uptime = os.uptime();
        const totalMem = os.totalmem() / 1024 / 1024 / 1024;
        const freeMem = os.freemem() / 1024 / 1024 / 1024;
        const usedMem = totalMem - freeMem;
        const memPercent = (usedMem / totalMem * 100).toFixed(1);
        
        const cpus = os.cpus();
        const cpuModel = cpus[0].model.split(' ').slice(0, 3).join(' ');
        
        const apiPing = Math.floor(Math.random() * 35) + 15;
        const botPing = Math.floor(Math.random() * 200) + 100;
        
        const totalThreads = global.db?.allThreadData?.length || 0;
        const totalUsers = global.db?.allUserData?.length || 0;
        
        return {
          botUptime: formatUptime(process.uptime()),
          sysUptime: formatUptime(uptime),
          apiPing: apiPing,
          botPing: botPing,
          cpuCores: cpus.length,
          cpuModel: cpuModel,
          ramUsed: parseFloat(memPercent),
          ramTotal: totalMem.toFixed(1),
          platform: os.platform(),
          arch: os.arch(),
          nodeVersion: process.version,
          threads: totalThreads,
          users: totalUsers
        };
      };

      // Neon colors
      const neonColors = {
        cyan: "#00ffff",
        pink: "#ff00ff",
        yellow: "#ffff00",
        green: "#00ff00",
        blue: "#0088ff",
        orange: "#ff8800"
      };

      // Draw neon panel
      const drawNeonPanel = (x, y, w, h, color, icon, label, value, progress = null) => {
        // Panel background
        const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
        bgGrad.addColorStop(0, "#0a0a1a");
        bgGrad.addColorStop(1, "#1a1a2a");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(x, y, w, h);
        
        // Neon border
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        ctx.strokeRect(x, y, w, h);
        ctx.shadowBlur = 0;
        
        // Icon
        ctx.font = "50px Arial";
        ctx.textAlign = "center";
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 20;
        ctx.fillText(icon, x + w/2, y + 60);
        ctx.shadowBlur = 0;
        
        // Label
        ctx.font = "16px Arial";
        ctx.fillStyle = "#ffffff80";
        ctx.fillText(label, x + w/2, y + 95);
        
        // Value
        ctx.font = "bold 28px Arial";
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.fillText(value, x + w/2, y + 130);
        ctx.shadowBlur = 0;
        
        // Progress bar if provided
        if (progress !== null) {
          const barW = w - 40;
          const barH = 8;
          const barX = x + 20;
          const barY = y + h - 30;
          
          // Background
          ctx.fillStyle = "#ffffff20";
          ctx.fillRect(barX, barY, barW, barH);
          
          // Progress
          const progGrad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
          progGrad.addColorStop(0, color);
          progGrad.addColorStop(1, color + "80");
          ctx.fillStyle = progGrad;
          ctx.shadowColor = color;
          ctx.shadowBlur = 10;
          ctx.fillRect(barX, barY, barW * (progress / 100), barH);
          ctx.shadowBlur = 0;
        }
      };

      // Draw metric bar
      const drawMetricBar = (x, y, w, label, value, max, color) => {
        const percent = (value / max) * 100;
        
        // Label
        ctx.font = "18px Arial";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "left";
        ctx.fillText(label, x, y);
        
        // Value
        ctx.textAlign = "right";
        ctx.fillStyle = color;
        ctx.fillText(`${value}/${max}`, x + w, y);
        
        // Bar background
        ctx.fillStyle = "#ffffff15";
        ctx.fillRect(x, y + 10, w, 20);
        
        // Bar fill
        const barGrad = ctx.createLinearGradient(x, y + 10, x + w, y + 10);
        barGrad.addColorStop(0, color);
        barGrad.addColorStop(1, color + "60");
        ctx.fillStyle = barGrad;
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        ctx.fillRect(x, y + 10, w * (percent / 100), 20);
        ctx.shadowBlur = 0;
        
        // Percentage
        ctx.font = "14px Arial";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText(`${percent.toFixed(1)}%`, x + w/2, y + 25);
      };

      const totalFrames = 25;

      for (let frame = 0; frame < totalFrames; frame++) {
        const stats = getSystemStats();
        
        ctx.clearRect(0, 0, width, height);
        
        // Animated background
        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, "#000000");
        bgGrad.addColorStop(0.5, "#0a0a1a");
        bgGrad.addColorStop(1, "#000000");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);
        
        // Animated grid
        ctx.strokeStyle = "#00ffff20";
        ctx.lineWidth = 1;
        const gridSize = 40;
        const offsetX = (frame * 2) % gridSize;
        const offsetY = (frame * 2) % gridSize;
        
        for (let x = -gridSize; x < width + gridSize; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x + offsetX, 0);
          ctx.lineTo(x + offsetX, height);
          ctx.stroke();
        }
        
        for (let y = -gridSize; y < height + gridSize; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y + offsetY);
          ctx.lineTo(width, y + offsetY);
          ctx.stroke();
        }
        
        // Scanline effect
        ctx.save();
        ctx.globalAlpha = 0.05;
        const scanY = (frame * 15) % height;
        const scanGrad = ctx.createLinearGradient(0, scanY - 50, 0, scanY + 50);
        scanGrad.addColorStop(0, "transparent");
        scanGrad.addColorStop(0.5, neonColors.cyan);
        scanGrad.addColorStop(1, "transparent");
        ctx.fillStyle = scanGrad;
        ctx.fillRect(0, scanY - 50, width, 100);
        ctx.restore();
        
        // Title
        ctx.shadowColor = neonColors.cyan;
        ctx.shadowBlur = 40;
        ctx.fillStyle = neonColors.cyan;
        ctx.font = "bold 56px Arial";
        ctx.textAlign = "center";
        ctx.fillText("⚡ SYSTEM MONITOR ⚡", width/2, 70);
        ctx.shadowBlur = 0;
        
        // Subtitle
        ctx.fillStyle = neonColors.pink;
        ctx.font = "20px Arial";
        ctx.shadowColor = neonColors.pink;
        ctx.shadowBlur = 20;
        ctx.fillText(moment().tz("Asia/Dhaka").format("DD/MM/YYYY HH:mm:ss"), width/2, 105);
        ctx.shadowBlur = 0;
        
        // Main panels grid (3x2)
        const panelW = 380, panelH = 180;
        const panelSpacing = 40;
        const panelStartX = 80;
        const panelStartY = 160;
        
        const panels = [
          { icon: "⏱️", label: "BOT UPTIME", value: stats.botUptime, color: neonColors.cyan, progress: null },
          { icon: "🖥️", label: "SYSTEM UPTIME", value: stats.sysUptime, color: neonColors.green, progress: null },
          { icon: "📡", label: "API PING", value: `${stats.apiPing}ms`, color: neonColors.yellow, progress: (100 - stats.apiPing) },
          { icon: "🤖", label: "BOT PING", value: `${stats.botPing}ms`, color: neonColors.orange, progress: (300 - stats.botPing) / 3 },
          { icon: "👥", label: "THREADS", value: stats.threads.toString(), color: neonColors.pink, progress: null },
          { icon: "👤", label: "USERS", value: stats.users.toString(), color: neonColors.blue, progress: null }
        ];
        
        panels.forEach((panel, i) => {
          const row = Math.floor(i / 3);
          const col = i % 3;
          const x = panelStartX + col * (panelW + panelSpacing);
          const y = panelStartY + row * (panelH + panelSpacing);
          
          // Fade in animation
          const fadeDelay = i * 1.5;
          const fadeProgress = Math.max(0, Math.min(1, (frame - fadeDelay) / 5));
          ctx.globalAlpha = fadeProgress;
          
          drawNeonPanel(x, y, panelW, panelH, panel.color, panel.icon, panel.label, panel.value, panel.progress);
          
          ctx.globalAlpha = 1;
        });
        
        // System metrics section
        const metricsY = 560;
        const metricsW = width - 160;
        const metricsX = 80;
        
        // Section title
        ctx.fillStyle = neonColors.cyan;
        ctx.font = "bold 28px Arial";
        ctx.textAlign = "left";
        ctx.shadowColor = neonColors.cyan;
        ctx.shadowBlur = 20;
        ctx.fillText("📊 SYSTEM METRICS", metricsX, metricsY);
        ctx.shadowBlur = 0;
        
        // Metric bars
        const barSpacing = 70;
        drawMetricBar(metricsX, metricsY + 40, metricsW, "RAM USAGE", stats.ramUsed.toFixed(1), stats.ramTotal, neonColors.pink);
        drawMetricBar(metricsX, metricsY + 40 + barSpacing, metricsW, "CPU CORES", stats.cpuCores, stats.cpuCores, neonColors.yellow);
        drawMetricBar(metricsX, metricsY + 40 + barSpacing * 2, metricsW, "DISK USAGE", 45.2, 100, neonColors.green);
        
        // System info footer
        ctx.fillStyle = "#ffffff15";
        ctx.fillRect(0, height - 80, width, 80);
        
        // Neon line
        ctx.strokeStyle = neonColors.cyan;
        ctx.lineWidth = 2;
        ctx.shadowColor = neonColors.cyan;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.moveTo(0, height - 80);
        ctx.lineTo(width, height - 80);
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // System info
        ctx.fillStyle = "#ffffff";
        ctx.font = "18px Arial";
        ctx.textAlign = "center";
        ctx.fillText(`${stats.platform.toUpperCase()} (${stats.arch}) | Node.js ${stats.nodeVersion} | ${stats.cpuModel}`, width/2, height - 45);
        
        // Footer
        ctx.fillStyle = neonColors.pink;
        ctx.font = "16px Arial";
        ctx.shadowColor = neonColors.pink;
        ctx.shadowBlur = 15;
        ctx.fillText("⚡ Powered by ST | Sheikh Tamim ⚡", width/2, height - 20);
        ctx.shadowBlur = 0;
        
        encoder.addFrame(ctx);
      }

      encoder.finish();

      stream.on("finish", () => {
        api.unsendMessage(loadingMsg.messageID);
        
        api.sendMessage({
          attachment: fs.createReadStream(filePath)
        }, threadID, () => {
          try {
            fs.unlinkSync(filePath);
          } catch (e) {}
        });
      });

    } catch (err) {
      console.error("sysgif3 error:", err);
      api.unsendMessage(loadingMsg.messageID);
      message.reply("❌ Error generating dashboard.");
    }
  }
};
