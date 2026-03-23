const { createCanvas } = require("canvas");
const GIFEncoder = require("gifencoder");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "megaspin",
    aliases: [],
    version: "2.4.78",
    author: "ST | Sheikh Tamim",
    description: "Professional 5-reel slot machine with casino-style design",
    usage: "megaspin [bet]",
    category: "game",
    role: 0,
    countDown: 5
  },

  ST: async function ({ api, event, message, args, usersData }) {
    const { threadID, senderID } = event;
    
    const betAmount = parseInt(args[0]) || 100;
    
    if (betAmount < 50) {
      return message.reply("❌ Minimum bet is 50 coins!");
    }
    
    if (betAmount > 50000) {
      return message.reply("❌ Maximum bet is 50,000 coins!");
    }
    
    const userData = await usersData.get(senderID);
    const userMoney = userData.money || 0;
    
    if (userMoney < betAmount) {
      return message.reply(`❌ Insufficient balance!\n💰 Balance: ${userMoney.toLocaleString()}\n🎰 Bet: ${betAmount.toLocaleString()}`);
    }
    
    const userName = userData.name || "Player";
    
    const loadingMsg = await message.reply("🎰 MEGA SPIN LOADING...\n✨ Preparing the reels...");
    
    try {
      const width = 1400, height = 900;
      const encoder = new GIFEncoder(width, height);
      const fileName = `megaspin_${Date.now()}.gif`;
      const filePath = path.join(__dirname, fileName);
      const stream = fs.createWriteStream(filePath);
      encoder.createReadStream().pipe(stream);

      encoder.start();
      encoder.setRepeat(0);
      encoder.setDelay(80);
      encoder.setQuality(10);

      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      // Casino symbols with proper values
      const symbols = [
        { emoji: "🍒", name: "Cherry", value: 2, color: "#ff3366", rarity: 0.25 },
        { emoji: "🍋", name: "Lemon", value: 3, color: "#ffeb3b", rarity: 0.20 },
        { emoji: "🍊", name: "Orange", value: 4, color: "#ff9800", rarity: 0.18 },
        { emoji: "🍇", name: "Grape", value: 5, color: "#9c27b0", rarity: 0.15 },
        { emoji: "🔔", name: "Bell", value: 10, color: "#ffd700", rarity: 0.10 },
        { emoji: "💎", name: "Diamond", value: 20, color: "#00bcd4", rarity: 0.07 },
        { emoji: "⭐", name: "Star", value: 50, color: "#ffeb3b", rarity: 0.04 },
        { emoji: "7️⃣", name: "Lucky 7", value: 100, color: "#f44336", rarity: 0.01 }
      ];

      // Weighted random selection
      const getRandomSymbol = () => {
        const rand = Math.random();
        let cumulative = 0;
        for (const symbol of symbols) {
          cumulative += symbol.rarity;
          if (rand <= cumulative) return symbol;
        }
        return symbols[0];
      };

      // Determine result (25% win rate)
      const isWin = Math.random() < 0.25;
      let finalReels = [];
      let winType = "";
      let multiplier = 0;
      
      if (isWin) {
        const winChance = Math.random();
        if (winChance < 0.6) {
          // 3 of a kind (60% of wins)
          const winSymbol = getRandomSymbol();
          finalReels = [
            getRandomSymbol(),
            winSymbol,
            winSymbol,
            winSymbol,
            getRandomSymbol()
          ];
          multiplier = winSymbol.value;
          winType = `${winSymbol.name} x3`;
        } else if (winChance < 0.9) {
          // 4 of a kind (30% of wins)
          const winSymbol = getRandomSymbol();
          finalReels = [
            winSymbol,
            winSymbol,
            winSymbol,
            winSymbol,
            getRandomSymbol()
          ];
          multiplier = winSymbol.value * 3;
          winType = `${winSymbol.name} x4`;
        } else {
          // 5 of a kind MEGA WIN! (10% of wins)
          const winSymbol = symbols[Math.floor(Math.random() * 5) + 3]; // Higher value symbols
          finalReels = [winSymbol, winSymbol, winSymbol, winSymbol, winSymbol];
          multiplier = winSymbol.value * 10;
          winType = `MEGA ${winSymbol.name} x5`;
        }
      } else {
        // Losing combination
        finalReels = [
          getRandomSymbol(),
          getRandomSymbol(),
          getRandomSymbol(),
          getRandomSymbol(),
          getRandomSymbol()
        ];
        // Ensure no 3+ matches
        for (let i = 0; i < 3; i++) {
          if (finalReels[i].emoji === finalReels[i+1].emoji && 
              finalReels[i+1].emoji === finalReels[i+2].emoji) {
            finalReels[i+2] = getRandomSymbol();
          }
        }
      }

      const winAmount = isWin ? betAmount * multiplier : -betAmount;

      // Particle class
      class Particle {
        constructor(x, y, color, type = "confetti") {
          this.x = x;
          this.y = y;
          this.vx = (Math.random() - 0.5) * 12;
          this.vy = Math.random() * -15 - 5;
          this.life = 1;
          this.color = color;
          this.size = Math.random() * 6 + 3;
          this.rotation = Math.random() * Math.PI * 2;
          this.rotationSpeed = (Math.random() - 0.5) * 0.3;
          this.type = type;
        }
        
        update() {
          this.x += this.vx;
          this.y += this.vy;
          this.vy += 0.5;
          this.rotation += this.rotationSpeed;
          this.life -= 0.015;
        }
        
        draw(ctx) {
          ctx.save();
          ctx.globalAlpha = this.life;
          ctx.translate(this.x, this.y);
          ctx.rotate(this.rotation);
          
          if (this.type === "coin") {
            // Draw coin
            ctx.fillStyle = "#ffd700";
            ctx.beginPath();
            ctx.arc(0, 0, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#ff8c00";
            ctx.lineWidth = 2;
            ctx.stroke();
          } else {
            // Draw confetti
            ctx.fillStyle = this.color;
            ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
          }
          
          ctx.restore();
        }
      }

      let particles = [];
      const colors = ["#ff3366", "#ffeb3b", "#00bcd4", "#9c27b0", "#4caf50"];

      // Draw functions
      const drawNeonText = (text, x, y, size, color, glow = 30) => {
        ctx.shadowColor = color;
        ctx.shadowBlur = glow;
        ctx.fillStyle = color;
        ctx.font = `bold ${size}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, x, y);
        ctx.shadowBlur = 0;
      };

      const drawLEDDisplay = (text, x, y, w, h) => {
        // LED background
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(x, y, w, h);
        
        // LED border
        ctx.strokeStyle = "#00d9ff";
        ctx.lineWidth = 4;
        ctx.shadowColor = "#00d9ff";
        ctx.shadowBlur = 20;
        ctx.strokeRect(x, y, w, h);
        ctx.shadowBlur = 0;
        
        // LED text
        ctx.fillStyle = "#00ff88";
        ctx.font = "bold 48px 'Courier New'";
        ctx.textAlign = "center";
        ctx.shadowColor = "#00ff88";
        ctx.shadowBlur = 15;
        ctx.fillText(text, x + w/2, y + h/2 + 5);
        ctx.shadowBlur = 0;
      };

      const drawReel = (x, y, w, h, symbols, offset, frame, reelIndex, stopped) => {
        // Reel frame with 3D effect
        ctx.save();
        
        // Shadow for depth
        ctx.shadowColor = "#000000";
        ctx.shadowBlur = 20;
        ctx.shadowOffsetY = 10;
        
        // Reel background
        const gradient = ctx.createLinearGradient(x, y, x, y + h);
        gradient.addColorStop(0, "#2a2a4a");
        gradient.addColorStop(0.5, "#1a1a3a");
        gradient.addColorStop(1, "#2a2a4a");
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, w, h);
        
        ctx.shadowBlur = 0;
        
        // Chrome border
        ctx.strokeStyle = "#8899aa";
        ctx.lineWidth = 6;
        ctx.strokeRect(x, y, w, h);
        
        // Inner glow
        ctx.strokeStyle = stopped ? "#00ff88" : "#0088ff";
        ctx.lineWidth = 3;
        ctx.shadowColor = stopped ? "#00ff88" : "#0088ff";
        ctx.shadowBlur = 15;
        ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
        ctx.shadowBlur = 0;
        
        ctx.restore();
        
        // Draw symbols
        ctx.save();
        ctx.beginPath();
        ctx.rect(x + 10, y + 10, w - 20, h - 20);
        ctx.clip();
        
        const symbolHeight = (h - 20) / 3;
        
        for (let i = -1; i <= 3; i++) {
          const symbolY = y + 10 + symbolHeight * 1.5 + (i * symbolHeight) + offset;
          const symbolIndex = (Math.floor((frame * 3 + reelIndex * 100 + i) / 3) + symbols.length * 100) % symbols.length;
          const symbol = symbols[symbolIndex];
          
          // Symbol glow
          if (!stopped || i === 0) {
            ctx.shadowColor = symbol.color;
            ctx.shadowBlur = stopped ? 25 : 10;
          }
          
          // Draw emoji
          ctx.font = `${stopped && i === 0 ? 90 : 80}px Arial`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(symbol.emoji, x + w/2, symbolY);
        }
        
        ctx.shadowBlur = 0;
        ctx.restore();
      };

      const totalFrames = 50;
      const reelStopFrames = [25, 30, 35, 40, 45];

      // Animation loop
      for (let frame = 0; frame < totalFrames; frame++) {
        ctx.clearRect(0, 0, width, height);
        
        // Animated background
        const bgGradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width);
        bgGradient.addColorStop(0, "#1a0033");
        bgGradient.addColorStop(0.5, "#0d001a");
        bgGradient.addColorStop(1, "#000000");
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, height);
        
        // Animated light beams
        ctx.save();
        ctx.globalAlpha = 0.1;
        for (let i = 0; i < 5; i++) {
          const angle = (frame * 0.02 + i * Math.PI * 2 / 5);
          ctx.strokeStyle = colors[i];
          ctx.lineWidth = 100;
          ctx.beginPath();
          ctx.moveTo(width/2, height/2);
          ctx.lineTo(
            width/2 + Math.cos(angle) * width,
            height/2 + Math.sin(angle) * height
          );
          ctx.stroke();
        }
        ctx.restore();
        
        // LED Display at top
        drawLEDDisplay("MEGA SPIN WINNER!", width/2 - 350, 50, 700, 80);
        
        // Side decorations
        const sideIcons = ["💰", "🍀", "💎", "⭐"];
        for (let i = 0; i < 4; i++) {
          const yPos = 200 + i * 150;
          // Left side
          ctx.font = "60px Arial";
          ctx.textAlign = "center";
          ctx.fillText(sideIcons[i], 80, yPos);
          // Right side
          ctx.fillText(sideIcons[i], width - 80, yPos);
        }
        
        // Player info
        ctx.fillStyle = "#ffffff";
        ctx.font = "28px Arial";
        ctx.textAlign = "center";
        ctx.fillText(`@${userName}`, width/2, 160);
        ctx.font = "24px Arial";
        ctx.fillStyle = "#ffd700";
        ctx.fillText(`BET: ${betAmount.toLocaleString()} COINS`, width/2, 195);
        
        // Draw 5 reels
        const reelWidth = 180;
        const reelHeight = 450;
        const reelY = 250;
        const spacing = 20;
        const totalReelWidth = reelWidth * 5 + spacing * 4;
        const startX = (width - totalReelWidth) / 2;
        
        for (let i = 0; i < 5; i++) {
          const reelX = startX + i * (reelWidth + spacing);
          const stopped = frame >= reelStopFrames[i];
          const spinSpeed = stopped ? 0 : 30;
          const offset = stopped ? 0 : ((frame * spinSpeed) % 100) - 50;
          
          const currentSymbols = stopped ? 
            [finalReels[i], finalReels[i], finalReels[i]] : 
            symbols;
          
          drawReel(reelX, reelY, reelWidth, reelHeight, currentSymbols, offset, frame, i, stopped);
        }
        
        // Win animation
        if (frame >= 47 && isWin) {
          // Create particles
          if (frame === 47) {
            for (let i = 0; i < 150; i++) {
              particles.push(new Particle(
                width/2 + (Math.random() - 0.5) * 600,
                height - 150,
                colors[Math.floor(Math.random() * colors.length)],
                Math.random() < 0.5 ? "coin" : "confetti"
              ));
            }
          }
          
          // Update particles
          particles = particles.filter(p => p.life > 0);
          particles.forEach(p => {
            p.update();
            p.draw(ctx);
          });
          
          // Win banner
          const bannerY = height - 180;
          ctx.fillStyle = "#000000cc";
          ctx.fillRect(0, bannerY - 60, width, 120);
          
          const pulse = Math.sin(frame * 0.5) * 0.2 + 1;
          drawNeonText("🎉 CONGRATULATIONS! 🎉", width/2, bannerY - 20, 42 * pulse, "#00ff88", 40);
          drawNeonText(winType.toUpperCase(), width/2, bannerY + 25, 36, "#ffd700", 30);
          drawNeonText(`WIN: ${winAmount.toLocaleString()} COINS`, width/2, bannerY + 65, 48 * pulse, "#ff3366", 35);
        }
        
        // Footer
        ctx.fillStyle = "#ffffff80";
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.fillText("🎰 Powered by ST | Sheikh Tamim 🎰", width/2, height - 30);
        
        encoder.addFrame(ctx);
      }

      encoder.finish();

      stream.on("finish", async () => {
        await usersData.set(senderID, {
          money: userMoney + winAmount
        });
        
        const newBalance = userMoney + winAmount;
        const resultEmoji = isWin ? "🎉" : "😔";
        
        api.unsendMessage(loadingMsg.messageID);
        
        api.sendMessage({
          body: `🎰 MEGA SPIN CASINO 🎰\n${"═".repeat(35)}\n\n👤 Player: @${userName}\n💰 Bet: ${betAmount.toLocaleString()} coins\n\n🎲 Result: ${finalReels.map(r => r.emoji).join(" | ")}\n\n${resultEmoji} ${isWin ? `${winType}\n💵 Won: +${winAmount.toLocaleString()} coins!` : `No match\n💸 Lost: ${betAmount.toLocaleString()} coins`}\n\n💰 New Balance: ${newBalance.toLocaleString()} coins\n${"═".repeat(35)}\n✨ Spin again: megaspin [amount]`,
          attachment: fs.createReadStream(filePath)
        }, threadID, () => {
          try {
            fs.unlinkSync(filePath);
          } catch (e) {}
        });
      });

    } catch (err) {
      console.error("megaspin error:", err);
      api.unsendMessage(loadingMsg.messageID);
      message.reply("❌ Error generating slot machine.");
    }
  }
};
