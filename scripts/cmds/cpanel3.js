const os = require("os");
const moment = require("moment-timezone");
const { createCanvas } = require("canvas");
const GIFEncoder = require("gifencoder");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "cpanel3",
    version: "2.4.78",
    author: "ST | Sheikh Tamim",
    description: "Clean Red Neon Animated Dashboard",
    category: "system",
    role: 0
  },

  ST: async function ({ api, event }) {
    try {
      const width = 900, height = 600;
      const encoder = new GIFEncoder(width, height);

      const filePath = path.join(__dirname, `cpanel_${Date.now()}.gif`);
      const stream = fs.createWriteStream(filePath);

      encoder.createReadStream().pipe(stream);

      encoder.start();
      encoder.setRepeat(0);
      encoder.setDelay(90);
      encoder.setQuality(10);

      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      const format = (sec) => {
        const d = Math.floor(sec / 86400);
        const h = Math.floor((sec % 86400) / 3600);
        const m = Math.floor((sec % 3600) / 60);
        return `${d}d ${h}h ${m}m`;
      };

      const stats = () => {
        const total = os.totalmem() / 1024 / 1024 / 1024;
        const free = os.freemem() / 1024 / 1024 / 1024;
        const used = total - free;

        return [
          ["BOT UPTIME", format(process.uptime())],
          ["CORES", os.cpus().length],
          ["NODE", process.version],
          ["CPU", (os.loadavg()[0]).toFixed(1) + "%"],
          ["DISK", "66.5%"],
          ["TOTAL DISK", "3116 GB"],
          ["SYS UPTIME", format(os.uptime())],
          ["RAM", ((used / total) * 100).toFixed(1) + "%"],
          ["TOTAL RAM", total.toFixed(1) + " GB"]
        ];
      };

      const drawHex = (x, y, label, value, frame, i, isCenter = false) => {
        const r = isCenter ? 95 : 75;

        // smooth subtle movement
        const offsetX = Math.sin(frame * 0.05 + i) * 4;
        const offsetY = Math.cos(frame * 0.05 + i) * 4;

        // very slow rotation
        const rot = Math.sin(frame * 0.02 + i) * 0.05;

        ctx.save();
        ctx.translate(x + offsetX, y + offsetY);
        ctx.rotate(rot);

        ctx.beginPath();
        for (let j = 0; j < 6; j++) {
          const ang = Math.PI / 3 * j;
          const px = r * Math.cos(ang);
          const py = r * Math.sin(ang);
          j === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();

        // red glow
        ctx.strokeStyle = "#ff4d4d";
        ctx.shadowColor = "#ff4d4d";
        ctx.shadowBlur = 20;
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = "rgba(20,20,30,0.85)";
        ctx.fill();

        ctx.restore();

        // TEXT
        ctx.textAlign = "center";

        if (isCenter) {
          ctx.fillStyle = "#ff4d4d";
          ctx.font = "bold 28px Arial";
          ctx.fillText("OWNER", x, y - 10);

          ctx.fillStyle = "#ffffff";
          ctx.font = "18px Arial";
          ctx.fillText("ITS ASIF", x, y + 20);
        } else {
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 20px Arial";
          ctx.fillText(value, x, y);

          ctx.fillStyle = "#aaaaaa";
          ctx.font = "14px Arial";
          ctx.fillText(label, x, y + 25);
        }
      };

      const cx = width / 2;
      const cy = height / 2;

      const gap = 140;

      const positions = [
        [cx, cy - gap],
        [cx + gap, cy - gap / 2],
        [cx + gap, cy + gap / 2],
        [cx, cy + gap],
        [cx - gap, cy + gap / 2],
        [cx - gap, cy - gap / 2],
        [cx - gap * 1.6, cy],
        [cx + gap * 1.6, cy],
        [cx, cy]
      ];

      for (let frame = 0; frame < 30; frame++) {
        const data = stats();

        // background (dark space)
        ctx.fillStyle = "#05070f";
        ctx.fillRect(0, 0, width, height);

        // tiny stars
        ctx.fillStyle = "#ffffff";
        for (let i = 0; i < 40; i++) {
          ctx.globalAlpha = Math.random();
          ctx.fillRect(Math.random() * width, Math.random() * height, 1, 1);
        }
        ctx.globalAlpha = 1;

        // header
        ctx.fillStyle = "#aaaaaa";
        ctx.font = "14px Arial";
        ctx.textAlign = "left";
        ctx.fillText(`OS: ${os.platform()} (${os.arch()})`, 20, 25);

        ctx.textAlign = "right";
        ctx.fillText(moment().tz("Asia/Dhaka").format("DD/MM/YYYY HH:mm:ss"), width - 20, 25);

        // draw hex
        for (let i = 0; i < 8; i++) {
          drawHex(positions[i][0], positions[i][1], data[i][0], data[i][1], frame, i);
        }

        // center hex
        drawHex(positions[8][0], positions[8][1], "", "", frame, 0, true);

        encoder.addFrame(ctx);
      }

      encoder.finish();

      stream.on("finish", () => {
        api.sendMessage({
          body: "",
          attachment: fs.createReadStream(filePath)
        }, event.threadID, () => fs.unlinkSync(filePath));
      });

    } catch (err) {
      console.error(err);
      api.sendMessage("❌ Error generating dashboard.", event.threadID);
    }
  }
};