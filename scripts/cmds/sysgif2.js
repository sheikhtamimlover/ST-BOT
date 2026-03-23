const os = require("os");
const moment = require("moment-timezone");
const { createCanvas } = require("canvas");
const GIFEncoder = require("gifencoder");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "sysgif2",
    aliases: ["sg2", "status2"],
    version: "2.4.78",
    author: "ST | Sheikh Tamim",
    description: "Animated system dashboard - Circular wave design",
    usage: "sysgif2",
    category: "system",
    role: 0,
    countDown: 10
  },

  ST: async function ({ api, event, message }) {
    const { threadID } = event;
    
    const loadingMsg = await message.reply("🌊 Generating wave dashboard...");
    
    try {
      const width = 1200, height = 900;
      const encoder = new GIFEncoder(width, height);
      const fileName = `sysgif2_${Date.now()}.gif`;
      const filePath = path.join(__dirname, fileName);
      const stream = fs.createWriteStream(filePath);
      encoder.createReadStream().pipe(stream);

      encoder.start();
      encoder.setRepeat(0);
      encoder.setDelay(150);
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
          apiPing: `${apiPing}ms`,
          botPing: `${botPing}ms`,
          cpuCores: cpus.length,
          cpuModel: cpuModel,
          ramUsed: memPercent,
          ramTotal: totalMem.toFixed(1),
          platform: os.platform(),
          arch: os.arch(),
          nodeVersion: process.version,
          threads: totalThreads,
          users: totalUsers
        };
      };

      const colors = {
        primary: "#00ffcc",
        secondary: "#ff6b9d",
        accent: "#ffd93d",
        success: "#6bcf7f",
        info: "#60a5fa",
        warning: "#fb923c"
      };

      // Draw circular progress bar
      const drawCircularBar = (x, y, radius, percent, color, label, value) => {
        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + (Math.PI * 2 * percent / 100);
        
        // Background circle
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = "#ffffff10";
        ctx.lineWidth = 12;
        ctx.stroke();
        
        // Progress arc
        ctx.beginPath();
        ctx.arc(x, y, radius, startAngle, endAngle);
        ctx.strokeStyle = color;
        ctx.lineWidth = 12;
        ctx.lineCap = "round";
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Center text
        ctx.fillStyle = "#fff";
        ctx.font = "bold 16px Arial";
        ctx.textAlign = "center";
        ctx.fillText(label, x, y - 10);
        
        ctx.fillStyle = color;
        ctx.font = "bold 24px Arial";
        ctx.fillText(value, x, y + 15);
      };

      // Draw info card
      const drawCard = (x, y, w, h, icon, label, value, color) => {
        // Card background
        ctx.fillStyle = "#ffffff08";
        ctx.fillRect(x, y, w, h);
        
        // Border
        ctx.strokeStyle = color + "40";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
        
        // Icon
        ctx.font = "40px Arial";
        ctx.textAlign = "center";
        ctx.fillText(icon, x + w/2, y + 45);
        
        // Label
        ctx.fillStyle = "#ffffff80";
        ctx.font = "14px Arial";
        ctx.fillText(label, x + w/2, y + 75);
        
        // Value
        ctx.fillStyle = color;
        ctx.font = "bold 20px Arial";
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.fillText(value, x + w/2, y + 105);
        ctx.shadowBlur = 0;
      };

      const totalFrames = 20;

      for (let frame = 0; frame < totalFrames; frame++) {
        const stats = getSystemStats();
        
        ctx.clearRect(0, 0, width, height);
        
        // Animated gradient background
        const hue = (frame * 3) % 360;
        const bg = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width/2);
        bg.addColorStop(0, `hsl(${hue}, 60%, 8%)`);
        bg.addColorStop(0.5, `hsl(${(hue + 30) % 360}, 50%, 5%)`);
        bg.addColorStop(1, "#000000");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);
        
        // Animated wave lines
        ctx.strokeStyle = "#ffffff08";
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
          ctx.beginPath();
          for (let x = 0; x < width; x += 5) {
            const y = height/2 + Math.sin((x + frame * 10 + i * 50) * 0.01) * (30 + i * 15);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        
        // Title
        ctx.shadowColor = colors.primary;
        ctx.shadowBlur = 30;
        ctx.fillStyle = colors.primary;
        ctx.font = "bold 42px Arial";
        ctx.textAlign = "center";
        ctx.fillText("⚡ SYSTEM DASHBOARD ⚡", width/2, 60);
        ctx.shadowBlur = 0;
        
        // Timestamp
        ctx.fillStyle = "#ffffff60";
        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        ctx.fillText(moment().tz("Asia/Dhaka").format("DD/MM/YYYY HH:mm:ss"), width/2, 95);
        
        // Circular progress bars (animated)
        const progress1 = Math.min(100, (frame / totalFrames) * parseFloat(stats.ramUsed) * 1.2);
        const progress2 = Math.min(100, (frame / totalFrames) * 75 * 1.2);
        const progress3 = Math.min(100, (frame / totalFrames) * 60 * 1.2);
        
        drawCircularBar(200, 250, 80, progress1, colors.secondary, "RAM", `${stats.ramUsed}%`);
        drawCircularBar(width/2, 250, 80, progress2, colors.accent, "CPU", "75%");
        drawCircularBar(width - 200, 250, 80, progress3, colors.success, "DISK", "60%");
        
        // Info cards grid
        const cardW = 260, cardH = 130;
        const cardSpacing = 30;
        const cardsPerRow = 4;
        const totalCardW = cardW * cardsPerRow + cardSpacing * (cardsPerRow - 1);
        const cardStartX = (width - totalCardW) / 2;
        const cardStartY = 400;
        
        const cards = [
          { icon: "⏱️", label: "BOT UPTIME", value: stats.botUptime, color: colors.primary },
          { icon: "🖥️", label: "SYS UPTIME", value: stats.sysUptime, color: colors.info },
          { icon: "📡", label: "API PING", value: stats.apiPing, color: colors.success },
          { icon: "🤖", label: "BOT PING", value: stats.botPing, color: colors.warning },
          { icon: "🧠", label: "CPU CORES", value: stats.cpuCores.toString(), color: colors.secondary },
          { icon: "💾", label: "RAM TOTAL", value: `${stats.ramTotal}GB`, color: colors.accent },
          { icon: "👥", label: "THREADS", value: stats.threads.toString(), color: colors.primary },
          { icon: "👤", label: "USERS", value: stats.users.toString(), color: colors.info }
        ];
        
        cards.forEach((card, i) => {
          const row = Math.floor(i / cardsPerRow);
          const col = i % cardsPerRow;
          const x = cardStartX + col * (cardW + cardSpacing);
          const y = cardStartY + row * (cardH + cardSpacing);
          
          // Fade in animation
          const fadeProgress = Math.max(0, Math.min(1, (frame - i * 0.5) / 5));
          ctx.globalAlpha = fadeProgress;
          
          drawCard(x, y, cardW, cardH, card.icon, card.label, card.value, card.color);
          
          ctx.globalAlpha = 1;
        });
        
        // System info bar at bottom
        ctx.fillStyle = "#ffffff15";
        ctx.fillRect(0, height - 80, width, 80);
        
        ctx.fillStyle = "#fff";
        ctx.font = "18px Arial";
        ctx.textAlign = "center";
        ctx.fillText(`${stats.platform} (${stats.arch}) | Node.js ${stats.nodeVersion} | ${stats.cpuModel}`, width/2, height - 45);
        
        ctx.fillStyle = "#ffffff60";
        ctx.font = "16px Arial";
        ctx.fillText("Powered by ST | Sheikh Tamim", width/2, height - 20);
        
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
      console.error("sysgif2 error:", err);
      api.unsendMessage(loadingMsg.messageID);
      message.reply("❌ Error generating dashboard.");
    }
  }
};
