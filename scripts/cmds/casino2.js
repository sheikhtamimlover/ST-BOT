const { createCanvas } = require("canvas");
const GIFEncoder = require("gifencoder");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "casino2",
    aliases: [],
    version: "2.4.78",
    author: "ST | Sheikh Tamim",
    description: "Professional 3-reel casino slot machine - Everything in GIF",
    usage: "casinoslot [bet]",
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
    
    const loadingMsg = await message.reply("🎰 Spinning the reels...");
    
    try {
      const width = 1200, height = 900;
      const encoder = new GIFEncoder(width, height);
      const fileName = `casinoslot_${Date.now()}.gif`;
      const filePath = path.join(__dirname, fileName);
      const stream = fs.createWriteStream(filePath);
      encoder.createReadStream().pipe(stream);

      encoder.start();
      encoder.setRepeat(0);
      encoder.setDelay(70);
      encoder.setQuality(10);

      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      // Casino symbols
      const symbols = [
        { emoji: "🍒", name: "Cherry", value: 3, color: "#ff3366" },
        { emoji: "🍋", name: "Lemon", value: 5, color: "#ffeb3b" },
        { emoji: "🍊", name: "Orange", value: 8, color: "#ff9800" },
        { emoji: "🔔", name: "Bell", value: 15, color: "#ffd700" },
        { emoji: "💎", name: "Diamond", value: 25, color: "#00bcd4" },
        { emoji: "⭐", name: "Star", value: 50, color: "#ffeb3b" },
        { emoji: "7️⃣", name: "Lucky 7", value: 100, color: "#f44336" }
      ];

      const getRandomSymbol = () => symbols[Math.floor(Math.random() * symbols.length)];
      
      // Determine win (30% chance)
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

      // Particle system
      class Particle {
        constructor(x, y, color, type = "star") {
          this.x = x;
          this.y = y;
          this.vx = (Math.random() - 0.5) * 15;
          this.vy = Math.random() * -18 - 5;
          this.life = 1;
          this.color = color;
          this.size = Math.random() * 8 + 3;
          this.rotation = Math.random() * Math.PI * 2;
          this.rotationSpeed = (Math.random() - 0.5) * 0.4;
          this.type = type;
        }
        
        update() {
          this.x += this.vx;
          this.y += this.vy;
          this.vy += 0.6;
          this.rotation += this.rotationSpeed;
          this.life -= 0.018;
        }
        
        draw(ctx) {
          ctx.save();
          ctx.globalAlpha = this.life;
          ctx.translate(this.x, this.y);
          ctx.rotate(this.rotation);
          
          if (this.type === "coin") {
            ctx.fillStyle = "#ffd700";
            ctx.beginPath();
            ctx.arc(0, 0, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#ff8c00";
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = "#ffeb3b";
            ctx.font = `${this.size}px Arial`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("$", 0, 0);
          } else {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
              const angle = (i * 4 * Math.PI) / 5;
              const r = i % 2 === 0 ? this.size : this.size / 2;
              const x = Math.cos(angle) * r;
              const y = Math.sin(angle) * r;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
          }
          
          ctx.restore();
        }
      }

      let particles = [];

      // Draw LED display
      const drawLED = (text, x, y, w, h, color = "#00ff88") => {
        ctx.fillStyle = "#0a0a1a";
        ctx.fillRect(x, y, w, h);
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.shadowColor = color;
        ctx.shadowBlur = 20;
        ctx.strokeRect(x, y, w, h);
        ctx.shadowBlur = 0;
        
        ctx.fillStyle = color;
        ctx.font = "bold 36px 'Courier New'";
        ctx.textAlign = "center";
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        ctx.fillText(text, x + w/2, y + h/2 + 10);
        ctx.shadowBlur = 0;
      };

      // Draw reel with 3D effect
      const drawReel = (x, y, w, h, symbol, offset, stopped, glowColor) => {
        ctx.save();
        
        // 3D shadow
        ctx.shadowColor = "#000";
        ctx.shadowBlur = 20;
        ctx.shadowOffsetY = 10;
        
        // Reel background with metallic gradient
        const grad = ctx.createLinearGradient(x, y, x + w, y + h);
        grad.addColorStop(0, "#3a3a5a");
        grad.addColorStop(0.3, "#1a1a3a");
        grad.addColorStop(0.7, "#1a1a3a");
        grad.addColorStop(1, "#3a3a5a");
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, w, h);
        
        ctx.shadowBlur = 0;
        
        // Chrome border
        const borderGrad = ctx.createLinearGradient(x, y, x, y + h);
        borderGrad.addColorStop(0, "#c0c0d0");
        borderGrad.addColorStop(0.5, "#606070");
        borderGrad.addColorStop(1, "#c0c0d0");
        ctx.strokeStyle = borderGrad;
        ctx.lineWidth = 8;
        ctx.strokeRect(x, y, w, h);
        
        // Inner glow
        ctx.strokeStyle = stopped ? glowColor : "#4488ff";
        ctx.lineWidth = 3;
        ctx.shadowColor = stopped ? glowColor : "#4488ff";
        ctx.shadowBlur = stopped ? 25 : 15;
        ctx.strokeRect(x + 5, y + 5, w - 10, h - 10);
        ctx.shadowBlur = 0;
        
        ctx.restore();
        
        // Symbol display
        ctx.save();
        ctx.beginPath();
        ctx.rect(x + 15, y + 15, w - 30, h - 30);
        ctx.clip();
        
        if (stopped) {
          ctx.shadowColor = symbol.color;
          ctx.shadowBlur = 30;
          ctx.font = "140px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(symbol.emoji, x + w/2, y + h/2);
        } else {
          ctx.globalAlpha = 0.5;
          for (let i = -2; i <= 2; i++) {
            const sym = symbols[(Math.floor(offset / 40) + i + symbols.length * 10) % symbols.length];
            ctx.font = "110px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(sym.emoji, x + w/2, y + h/2 + i * 50 + (offset % 40));
          }
        }
        
        ctx.restore();
      };

      const totalFrames = 50;
      const stopFrames = [22, 30, 38];

      for (let frame = 0; frame < totalFrames; frame++) {
        ctx.clearRect(0, 0, width, height);
        
        // Animated background
        const bgGrad = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width/2);
        bgGrad.addColorStop(0, "#1a0033");
        bgGrad.addColorStop(0.6, "#0d001a");
        bgGrad.addColorStop(1, "#000000");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);
        
        // Rotating light rays
        ctx.save();
        ctx.globalAlpha = 0.12;
        ctx.translate(width/2, height/2);
        ctx.rotate(frame * 0.04);
        for (let i = 0; i < 12; i++) {
          const angle = (i * Math.PI * 2) / 12;
          ctx.strokeStyle = ["#ff3366", "#00bcd4", "#ffeb3b", "#9c27b0"][i % 4];
          ctx.lineWidth = 60;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(angle) * 900, Math.sin(angle) * 900);
          ctx.stroke();
        }
        ctx.restore();
        
        // Casino machine frame
        ctx.fillStyle = "#2a1a3a";
        ctx.fillRect(50, 150, width - 100, 600);
        
        const frameGrad = ctx.createLinearGradient(50, 150, 50, 750);
        frameGrad.addColorStop(0, "#8a7a9a");
        frameGrad.addColorStop(0.5, "#4a3a5a");
        frameGrad.addColorStop(1, "#8a7a9a");
        ctx.strokeStyle = frameGrad;
        ctx.lineWidth = 15;
        ctx.strokeRect(50, 150, width - 100, 600);
        
        // Top LED banner
        ctx.shadowColor = "#ff3366";
        ctx.shadowBlur = 40;
        ctx.fillStyle = "#ff3366";
        ctx.font = "bold 52px Arial";
        ctx.textAlign = "center";
        ctx.fillText("🎰 CASINO ROYALE 🎰", width/2, 80);
        ctx.shadowBlur = 0;
        
        // Player info LED displays
        drawLED(`PLAYER: ${userName.toUpperCase()}`, 100, 180, 450, 60, "#00ffcc");
        drawLED(`BET: ${betAmount.toLocaleString()}`, width - 550, 180, 450, 60, "#ffd700");
        
        // Balance display
        ctx.fillStyle = "#ffffff";
        ctx.font = "24px Arial";
        ctx.textAlign = "center";
        ctx.fillText(`BALANCE: ${userMoney.toLocaleString()} COINS`, width/2, 270);
        
        // 3 Reels
        const reelW = 280, reelH = 350;
        const reelY = 320;
        const spacing = 50;
        const totalW = reelW * 3 + spacing * 2;
        const startX = (width - totalW) / 2;
        
        for (let i = 0; i < 3; i++) {
          const reelX = startX + i * (reelW + spacing);
          const stopped = frame >= stopFrames[i];
          const offset = stopped ? 0 : (frame * 30);
          const currentSymbol = stopped ? finalReels[i] : symbols[frame % symbols.length];
          
          drawReel(reelX, reelY, reelW, reelH, currentSymbol, offset, stopped, finalReels[i].color);
        }
        
        // Decorative side lights
        for (let i = 0; i < 6; i++) {
          const lightY = 320 + i * 60;
          const lightSize = 15;
          const lightColor = ["#ff3366", "#00bcd4", "#ffeb3b"][i % 3];
          const pulse = Math.sin(frame * 0.3 + i) * 0.5 + 0.5;
          
          // Left lights
          ctx.fillStyle = lightColor;
          ctx.shadowColor = lightColor;
          ctx.shadowBlur = 20 * pulse;
          ctx.beginPath();
          ctx.arc(120, lightY, lightSize, 0, Math.PI * 2);
          ctx.fill();
          
          // Right lights
          ctx.beginPath();
          ctx.arc(width - 120, lightY, lightSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
        
        // Result display
        if (frame >= 45) {
          if (isWin) {
            // Create particles
            if (frame === 45) {
              for (let i = 0; i < 120; i++) {
                particles.push(new Particle(
                  width/2 + (Math.random() - 0.5) * 500,
                  height - 100,
                  finalReels[0].color,
                  Math.random() < 0.4 ? "coin" : "star"
                ));
              }
            }
            
            particles = particles.filter(p => p.life > 0);
            particles.forEach(p => {
              p.update();
              p.draw(ctx);
            });
            
            // Win banner
            ctx.fillStyle = "#000000ee";
            ctx.fillRect(0, 700, width, 150);
            
            const pulse = Math.sin(frame * 0.7) * 0.3 + 1;
            
            if (isJackpot) {
              ctx.shadowColor = "#ffd700";
              ctx.shadowBlur = 50;
              ctx.fillStyle = "#ffd700";
              ctx.font = `bold ${60 * pulse}px Arial`;
              ctx.textAlign = "center";
              ctx.fillText("💰 JACKPOT WINNER! 💰", width/2, 755);
            } else {
              ctx.shadowColor = "#00ff88";
              ctx.shadowBlur = 40;
              ctx.fillStyle = "#00ff88";
              ctx.font = `bold ${50 * pulse}px Arial`;
              ctx.textAlign = "center";
              ctx.fillText("🎉 WINNER! 🎉", width/2, 755);
            }
            
            ctx.shadowColor = "#ff3366";
            ctx.shadowBlur = 35;
            ctx.fillStyle = "#ff3366";
            ctx.font = `bold ${54 * pulse}px Arial`;
            ctx.fillText(`+${winAmount.toLocaleString()} COINS`, width/2, 815);
            ctx.shadowBlur = 0;
            
            ctx.fillStyle = "#ffffff";
            ctx.font = "22px Arial";
            ctx.fillText(`NEW BALANCE: ${(userMoney + winAmount).toLocaleString()}`, width/2, 850);
            
          } else {
            // Loss banner
            ctx.fillStyle = "#000000dd";
            ctx.fillRect(0, 700, width, 150);
            
            ctx.fillStyle = "#ff4757";
            ctx.font = "bold 48px Arial";
            ctx.textAlign = "center";
            ctx.shadowColor = "#ff4757";
            ctx.shadowBlur = 30;
            ctx.fillText("😔 NO MATCH - TRY AGAIN", width/2, 755);
            ctx.shadowBlur = 0;
            
            ctx.fillStyle = "#ff6b9d";
            ctx.font = "bold 42px Arial";
            ctx.fillText(`-${betAmount.toLocaleString()} COINS`, width/2, 810);
            
            ctx.fillStyle = "#ffffff";
            ctx.font = "22px Arial";
            ctx.fillText(`NEW BALANCE: ${(userMoney + winAmount).toLocaleString()}`, width/2, 850);
          }
        }
        
        // Footer
        ctx.fillStyle = "#ffffff70";
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.fillText("🎰 Powered by ST | Sheikh Tamim 🎰", width/2, height - 20);
        
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
      console.error("casinoslot error:", err);
      api.unsendMessage(loadingMsg.messageID);
      message.reply("❌ Error generating slot machine.");
    }
  }
};
