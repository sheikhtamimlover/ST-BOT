const { createCanvas } = require("canvas");
const GIFEncoder = require("gifencoder");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "slot3d",
    aliases: [],
    version: "2.4.78",
    author: "ST | Sheikh Tamim",
    description: "3-reel casino slot machine - all in GIF",
    usage: "slot3d [bet]",
    category: "game",
    role: 0,
    countDown: 5
  },

  ST: async function ({ api, event, message, args, usersData }) {
    const { threadID, senderID } = event;
    
    const betAmount = parseInt(args[0]) || 100;
    
    if (betAmount < 50 || betAmount > 50000) {
      return message.reply("❌ Bet range: 50 - 50,000 coins");
    }
    
    const userData = await usersData.get(senderID);
    const userMoney = userData.money || 0;
    
    if (userMoney < betAmount) {
      return message.reply(`❌ Insufficient! Balance: ${userMoney.toLocaleString()}`);
    }
    
    const userName = userData.name || "Player";
    
    const loadingMsg = await message.reply("🎰 Spinning...");
    
    try {
      const width = 1000, height = 700;
      const encoder = new GIFEncoder(width, height);
      const fileName = `slot3d_${Date.now()}.gif`;
      const filePath = path.join(__dirname, fileName);
      const stream = fs.createWriteStream(filePath);
      encoder.createReadStream().pipe(stream);

      encoder.start();
      encoder.setRepeat(0);
      encoder.setDelay(80);
      encoder.setQuality(10);

      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      const symbols = [
        { emoji: "🍒", value: 3, color: "#ff3366" },
        { emoji: "🍋", value: 5, color: "#ffeb3b" },
        { emoji: "🍊", value: 8, color: "#ff9800" },
        { emoji: "🔔", value: 15, color: "#ffd700" },
        { emoji: "💎", value: 25, color: "#00bcd4" },
        { emoji: "⭐", value: 50, color: "#ffeb3b" },
        { emoji: "7️⃣", value: 100, color: "#f44336" }
      ];

      const getRandomSymbol = () => symbols[Math.floor(Math.random() * symbols.length)];
      
      const isWin = Math.random() < 0.3;
      let finalReels, winAmount, isJackpot = false;
      
      if (isWin) {
        const winSymbol = symbols[Math.floor(Math.random() * symbols.length)];
        finalReels = [winSymbol, winSymbol, winSymbol];
        winAmount = betAmount * winSymbol.value;
        isJackpot = winSymbol.emoji === "7️⃣";
      } else {
        finalReels = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];
        while (finalReels[0].emoji === finalReels[1].emoji && finalReels[1].emoji === finalReels[2].emoji) {
          finalReels[2] = getRandomSymbol();
        }
        winAmount = -betAmount;
      }

      class Particle {
        constructor(x, y, color) {
          this.x = x;
          this.y = y;
          this.vx = (Math.random() - 0.5) * 10;
          this.vy = Math.random() * -12 - 3;
          this.life = 1;
          this.color = color;
          this.size = Math.random() * 5 + 2;
        }
        update() {
          this.x += this.vx;
          this.y += this.vy;
          this.vy += 0.4;
          this.life -= 0.02;
        }
        draw(ctx) {
          ctx.globalAlpha = this.life;
          ctx.fillStyle = this.color;
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      let particles = [];

      const drawReel = (x, y, w, h, symbol, offset, stopped) => {
        ctx.save();
        
        // 3D shadow
        ctx.shadowColor = "#000";
        ctx.shadowBlur = 15;
        ctx.shadowOffsetY = 8;
        
        // Reel background
        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, "#2a2a4a");
        grad.addColorStop(0.5, "#1a1a3a");
        grad.addColorStop(1, "#2a2a4a");
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, w, h);
        
        ctx.shadowBlur = 0;
        
        // Chrome border
        ctx.strokeStyle = "#8899aa";
        ctx.lineWidth = 5;
        ctx.strokeRect(x, y, w, h);
        
        // Glow
        ctx.strokeStyle = stopped ? "#00ff88" : "#0088ff";
        ctx.lineWidth = 2;
        ctx.shadowColor = stopped ? "#00ff88" : "#0088ff";
        ctx.shadowBlur = 12;
        ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
        ctx.shadowBlur = 0;
        
        ctx.restore();
        
        // Symbol
        ctx.save();
        ctx.beginPath();
        ctx.rect(x + 10, y + 10, w - 20, h - 20);
        ctx.clip();
        
        if (stopped) {
          ctx.shadowColor = symbol.color;
          ctx.shadowBlur = 20;
          ctx.font = "120px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(symbol.emoji, x + w/2, y + h/2);
        } else {
          ctx.globalAlpha = 0.4;
          for (let i = -1; i <= 1; i++) {
            ctx.font = "100px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(symbol.emoji, x + w/2, y + h/2 + i * 30 + offset);
          }
        }
        
        ctx.restore();
      };

      const totalFrames = 45;
      const stopFrames = [20, 27, 34];

      for (let frame = 0; frame < totalFrames; frame++) {
        ctx.clearRect(0, 0, width, height);
        
        // Background
        const bg = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width/2);
        bg.addColorStop(0, "#1a0033");
        bg.addColorStop(1, "#000000");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);
        
        // Animated rays
        ctx.save();
        ctx.globalAlpha = 0.08;
        for (let i = 0; i < 8; i++) {
          const angle = frame * 0.03 + i * Math.PI / 4;
          ctx.strokeStyle = ["#ff3366", "#00bcd4", "#ffeb3b", "#9c27b0"][i % 4];
          ctx.lineWidth = 80;
          ctx.beginPath();
          ctx.moveTo(width/2, height/2);
          ctx.lineTo(width/2 + Math.cos(angle) * 800, height/2 + Math.sin(angle) * 800);
          ctx.stroke();
        }
        ctx.restore();
        
        // Title
        ctx.shadowColor = "#ff3366";
        ctx.shadowBlur = 25;
        ctx.fillStyle = "#ff3366";
        ctx.font = "bold 48px Arial";
        ctx.textAlign = "center";
        ctx.fillText("🎰 CASINO SLOT 🎰", width/2, 70);
        ctx.shadowBlur = 0;
        
        // Player info
        ctx.fillStyle = "#fff";
        ctx.font = "26px Arial";
        ctx.fillText(`@${userName}`, width/2, 120);
        ctx.fillStyle = "#ffd700";
        ctx.font = "22px Arial";
        ctx.fillText(`BET: ${betAmount.toLocaleString()} COINS`, width/2, 150);
        
        // 3 Reels
        const reelW = 220, reelH = 280;
        const reelY = 220;
        const spacing = 40;
        const totalW = reelW * 3 + spacing * 2;
        const startX = (width - totalW) / 2;
        
        for (let i = 0; i < 3; i++) {
          const reelX = startX + i * (reelW + spacing);
          const stopped = frame >= stopFrames[i];
          const offset = stopped ? 0 : ((frame * 25) % 60) - 30;
          const currentSymbol = stopped ? finalReels[i] : symbols[frame % symbols.length];
          
          drawReel(reelX, reelY, reelW, reelH, currentSymbol, offset, stopped);
        }
        
        // Win/Loss display
        if (frame >= 40) {
          if (isWin) {
            // Particles
            if (frame === 40) {
              for (let i = 0; i < 100; i++) {
                particles.push(new Particle(
                  width/2 + (Math.random() - 0.5) * 400,
                  height - 100,
                  finalReels[0].color
                ));
              }
            }
            
            particles = particles.filter(p => p.life > 0);
            particles.forEach(p => {
              p.update();
              p.draw(ctx);
            });
            
            // Win banner
            ctx.fillStyle = "#000000dd";
            ctx.fillRect(0, height - 150, width, 120);
            
            const pulse = Math.sin(frame * 0.6) * 0.25 + 1;
            
            if (isJackpot) {
              ctx.shadowColor = "#ffd700";
              ctx.shadowBlur = 40;
              ctx.fillStyle = "#ffd700";
              ctx.font = `bold ${50 * pulse}px Arial`;
              ctx.textAlign = "center";
              ctx.fillText("💰 JACKPOT! 💰", width/2, height - 95);
            } else {
              ctx.shadowColor = "#00ff88";
              ctx.shadowBlur = 30;
              ctx.fillStyle = "#00ff88";
              ctx.font = `bold ${42 * pulse}px Arial`;
              ctx.textAlign = "center";
              ctx.fillText("🎉 WINNER! 🎉", width/2, height - 95);
            }
            
            ctx.shadowColor = "#ff3366";
            ctx.shadowBlur = 25;
            ctx.fillStyle = "#ff3366";
            ctx.font = `bold ${46 * pulse}px Arial`;
            ctx.fillText(`+${winAmount.toLocaleString()}`, width/2, height - 45);
            ctx.shadowBlur = 0;
            
          } else {
            // Loss
            ctx.fillStyle = "#00000099";
            ctx.fillRect(0, height - 120, width, 90);
            
            ctx.fillStyle = "#ff4757";
            ctx.font = "bold 36px Arial";
            ctx.textAlign = "center";
            ctx.fillText("😔 NO MATCH", width/2, height - 70);
            
            ctx.fillStyle = "#ff6b9d";
            ctx.font = "bold 32px Arial";
            ctx.fillText(`-${betAmount.toLocaleString()}`, width/2, height - 35);
          }
        }
        
        // Footer
        ctx.fillStyle = "#ffffff60";
        ctx.font = "18px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Powered by ST | Sheikh Tamim", width/2, height - 15);
        
        encoder.addFrame(ctx);
      }

      encoder.finish();

      stream.on("finish", async () => {
        await usersData.set(senderID, {
          money: userMoney + winAmount
        });
        
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
      console.error("slot3d error:", err);
      api.unsendMessage(loadingMsg.messageID);
      message.reply("❌ Error");
    }
  }
};
