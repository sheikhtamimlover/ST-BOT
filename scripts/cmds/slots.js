const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");
const GIFEncoder = require("gif-encoder-2");
const twemoji = require("twemoji");
const fetch = require("node-fetch");

// --- Game Configuration ---
const symbols = ["🍒", "🍋", "🍊", "🍉", "⭐", "🔔", "💎", "7️⃣"];
const payouts = {
  "7️⃣7️⃣7️⃣": 200,
  "💎💎💎": 100,
  "🔔🔔🔔": 50,
  "⭐⭐⭐": 30,
  "🍉🍉🍉": 20,
  "🍊🍊🍊": 15,
  "🍋🍋🍋": 10,
  "🍒🍒🍒": 6,
  "🍒🍒": 3,
  "🍋🍋": 3,
  "🍊🍊": 3,
  "🍉🍉": 3,
  "⭐⭐": 3,
  "🔔🔔": 3,
  "💎💎": 5,
  "7️⃣7️⃣": 10,
};

// --- Weighted Reels ---
function generateWeightedReelStrip() {
  const weights = {
    "🍒": 10,
    "🍋": 9,
    "🍊": 8,
    "🍉": 7,
    "⭐": 6,
    "🔔": 5,
    "💎": 4,
    "7️⃣": 3,
  };
  const weightedStrip = [];
  for (const [symbol, weight] of Object.entries(weights)) {
    for (let i = 0; i < weight; i++) weightedStrip.push(symbol);
  }
  // Shuffle
  for (let i = weightedStrip.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [weightedStrip[i], weightedStrip[j]] = [weightedStrip[j], weightedStrip[i]];
  }
  return weightedStrip;
}
const weightedReelStrips = [
  generateWeightedReelStrip(),
  generateWeightedReelStrip(),
  generateWeightedReelStrip(),
];

// --- FIXED: Colored Emoji Loader using Twemoji CDN ---
const emojiCache = {};

async function preloadEmojis() {
  // Use Twemoji's CDN to get colored PNG images
  for (const emoji of symbols) {
    if (emojiCache[emoji]) continue;

    try {
      // Convert emoji to code point (Twemoji format)
      const codePoint = twemoji.convert.toCodePoint(emoji);

      // Construct URL for Twemoji PNG (72x72 size for good quality)
      const emojiUrl = `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/${codePoint}.png`;

      // Fetch the emoji image
      const response = await fetch(emojiUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch emoji: ${response.statusText}`);
      }

      // Convert to buffer and load into canvas
      const buffer = await response.buffer();
      const img = await loadImage(buffer);
      emojiCache[emoji] = img;

      console.log(`Loaded emoji: ${emoji} from ${emojiUrl}`);
    } catch (error) {
      console.warn(`Failed to load emoji ${emoji}: ${error.message}`);
      // Create a colored fallback using canvas
      const tempCanvas = createCanvas(72, 72);
      const tempCtx = tempCanvas.getContext("2d");

      // Set different colors for different emojis as fallback
      const colors = {
        "🍒": "#FF0000", "🍋": "#FFFF00", "🍊": "#FFA500", "🍉": "#008000",
        "⭐": "#FFD700", "🔔": "#FFD700", "💎": "#4169E1", "7️⃣": "#FFFFFF"
      };

      tempCtx.fillStyle = colors[emoji] || "#FFFFFF";
      tempCtx.font = "bold 50px Arial";
      tempCtx.textAlign = "center";
      tempCtx.textBaseline = "middle";
      tempCtx.fillText(emoji, 36, 36);

      emojiCache[emoji] = await loadImage(tempCanvas.toBuffer());
    }
  }
}

function drawEmoji(ctx, x, y, emoji, size = 70) {
  const img = emojiCache[emoji];
  if (!img) {
    // Fallback: draw colored text if image not available
    const colors = {
      "🍒": "#FF0000", "🍋": "#FFFF00", "🍊": "#FFA500", "🍉": "#008000",
      "⭐": "#FFD700", "🔔": "#FFD700", "💎": "#4169E1", "7️⃣": "#FFFFFF"
    };

    ctx.font = `bold ${Math.floor(size * 0.9)}px Arial`;
    ctx.textAlign = "center";
    ctx.fillStyle = colors[emoji] || "#FFFFFF";
    ctx.fillText(emoji, x, y + Math.floor(size * 0.3));
    return;
  }
  ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
}

// --- Shorten Number Helper ---
const units = ["", "K", "M", "B", "T", "Q", "S", "O", "N", "D"];

function shortenNumber(num) {
  if (typeof num !== "number") num = Number(num) || 0;
  if (num < 1000) return String(num);
  let unitIndex = 0;
  let n = num;
  while (n >= 1000 && unitIndex < units.length - 1) {
    n /= 1000;
    unitIndex++;
  }
  return n.toFixed(2).replace(/\.?0+$/, "") + units[unitIndex];
}

// --- Game Functions ---
function getResult() {
  const reel1 = weightedReelStrips[0][Math.floor(Math.random() * weightedReelStrips[0].length)];
  let reel2, reel3;
  const rand = Math.random();
  if (rand < 0.59) {
    // ~59% chance of at least partial match (higher perceived win rate)
    reel2 = reel1;
    reel3 = Math.random() < 0.2 ? reel1 : symbols[Math.floor(Math.random() * symbols.length)];
  } else {
    // loss path
    reel2 = weightedReelStrips[1][Math.floor(Math.random() * weightedReelStrips[1].length)];
    reel3 = weightedReelStrips[2][Math.floor(Math.random() * weightedReelStrips[2].length)];
  }
  return [reel1, reel2, reel3];
}

function calculateWinnings(result, bet) {
  const joined = result.join("");
  if (payouts[joined]) {
    return { amount: bet * payouts[joined], winType: "JACKPOT" };
  }
  // check doubles (two-in-a-row)
  const two01 = result[0] + result[1];
  const two12 = result[1] + result[2];
  if (payouts[two01]) return { amount: bet * payouts[two01], winType: "DOUBLE" };
  if (payouts[two12]) return { amount: bet * payouts[two12], winType: "DOUBLE" };
  return { amount: 0, winType: "LOSS" };
}

// --- Module Export ---
module.exports = {
  config: {
    name: "slots",
    aliases: ["slots"],
    version: "2.4.78", 
    author: "TawsiN | Updated by ST",
    role: 0,
    shortDescription: { en: "Play the slot machine" },
    longDescription: { en: "Slot machine game with animated GIF + colored Twemoji rendering." },
    category: "economy",
    guide: { en: "{pn} <bet_amount>" },
  },
  ST: async function ({ api, event, message, usersData, args }) {
    const betAmount = parseInt(args[0]);
    if (isNaN(betAmount) || betAmount <= 0) {
      return message.reply("Please enter a valid bet amount.");
    }
    const senderID = event.senderID;

    // defensive usersData
    if (!usersData || typeof usersData.get !== "function" || typeof usersData.set !== "function") {
      return message.reply("Internal error: user data store not available.");
    }

    let userData = await usersData.get(senderID);
    if (!userData) {
      // initialize if missing
      userData = { money: 500, name: null, data: {} };
    }

    if (typeof userData.money !== "number" || userData.money < betAmount) {
      return message.reply("You don't have enough money to place that bet.");
    }

    const processingMessage = await message.reply("🎰 Slot machine creating, please wait...");

    try {
      // Preload colored emoji images
      await preloadEmojis();

      // deduct bet
      userData.money -= betAmount;
      await usersData.set(senderID, { ...userData });

      // generate result & calculate winnings
      const result = getResult();
      const { amount: winnings, winType } = calculateWinnings(result, betAmount);

      if (winnings > 0) {
        userData.money += winnings;
        await usersData.set(senderID, { ...userData });
      }

      // prepare gif path
      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const gifPath = path.join(cacheDir, `slot_${senderID}_${Date.now()}.gif`);

      // GIF / Canvas setup
      const canvasWidth = 600;
      const canvasHeight = 400;
      const encoder = new GIFEncoder(canvasWidth, canvasHeight);
      const gifStream = fs.createWriteStream(gifPath);
      encoder.createReadStream().pipe(gifStream);

      encoder.start();
      encoder.setRepeat(0); // 0 = repeat, -1 = no-repeat
      encoder.setDelay(100); // ms per frame
      encoder.setQuality(15);

      const canvas = createCanvas(canvasWidth, canvasHeight);
      const ctx = canvas.getContext("2d");

      const reelWidth = 100;
      const reelHeight = 100;
      const reelPositionsX = [150, 300, 450];
      const reelWindowY = 190;
      const frameCount = 30;
      const spinDurationBase = 10; // when each reel stops relative to base

      // Render frames
      for (let i = 0; i < frameCount; i++) {
        // background gradient
        const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
        gradient.addColorStop(0, "#1a1a2e");
        gradient.addColorStop(1, "#16213e");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // panel
        ctx.fillStyle = "#222242";
        ctx.fillRect(80, 110, 440, 160);
        ctx.strokeStyle = "#ffcc00";
        ctx.lineWidth = 5;
        ctx.strokeRect(80, 110, 440, 160);

        // title
        ctx.fillStyle = "#ffcc00";
        ctx.shadowColor = "rgba(255, 204, 0, 0.6)";
        ctx.shadowBlur = 10;
        ctx.font = "bold 44px Arial";
        ctx.textAlign = "center";
        ctx.fillText("SLOT MACHINE", canvasWidth / 2, 60);
        ctx.shadowBlur = 0;
        ctx.textAlign = "left";

        // draw reels
        for (let r = 0; r < 3; r++) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(reelPositionsX[r] - reelWidth / 2, reelWindowY - reelHeight / 2, reelWidth, reelHeight);
          ctx.clip();

          const stopFrame = spinDurationBase + r * 6; // stagger stops
          if (i < stopFrame) {
            // spinning: draw a column of random symbols to simulate motion
            const spinOffset = (i * 20 + r * 10) % 120;
            for (let s = -1; s < 2; s++) {
              const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
              drawEmoji(ctx, reelPositionsX[r], reelWindowY + spinOffset + s * 100 - 50, randomSymbol, 70);
            }
          } else {
            // stopped: draw final result symbol
            if (winType !== "LOSS") {
              ctx.shadowColor = "#ffcc00";
              ctx.shadowBlur = 15;
            }
            drawEmoji(ctx, reelPositionsX[r], reelWindowY, result[r], 70);
            ctx.shadowBlur = 0;
          }
          ctx.restore();

          // reel border
          ctx.strokeStyle = "#444466";
          ctx.lineWidth = 2;
          ctx.strokeRect(reelPositionsX[r] - reelWidth / 2, reelWindowY - reelHeight / 2, reelWidth, reelHeight);
        }

        // final frame text (only on last frames)
        if (i >= frameCount - 2) {
          ctx.fillStyle = winnings > 0 ? "#4ade80" : "#ef4444";
          ctx.font = "bold 28px Arial";
          ctx.textAlign = "center";

          if (winType === "JACKPOT") {
            ctx.fillText(`JACKPOT! ${result.join(" ")}`, canvasWidth / 2, 320);
          } else if (winType === "DOUBLE") {
            ctx.fillText(`DOUBLE! ${result.join(" ")}`, canvasWidth / 2, 320);
          } else {
            ctx.fillText("NO WIN", canvasWidth / 2, 320);
            ctx.fillStyle = "#ef4444";
            ctx.font = "bold 22px Arial";
            ctx.fillText(`You lost: $${shortenNumber(betAmount)}`, canvasWidth / 2, 355);
          }

          if (winnings > 0) {
            ctx.fillStyle = "#ffcc00";
            ctx.font = "bold 22px Arial";
            ctx.fillText(`You won: $${shortenNumber(winnings)}`, canvasWidth / 2, 355);
          }

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 18px Arial";
          ctx.fillText(`Bet: $${shortenNumber(betAmount)} | Balance: $${shortenNumber(userData.money)}`, canvasWidth / 2, 385);
        }

        encoder.addFrame(ctx);
      }

      // hold last frame a bit longer
      for (let hold = 0; hold < 12; hold++) encoder.addFrame(ctx);

      encoder.finish();

      // wait for stream to finish writing
      await new Promise((resolve, reject) => {
        gifStream.on("finish", resolve);
        gifStream.on("error", reject);
      });

      // Build text message
      let resultMessage = "🎰 Slot Result 🎰\n";
      resultMessage += `Bet: $${shortenNumber(betAmount)}\n`;
      resultMessage += `Result: ${result.join(" ")}\n`;

      if (winType === "JACKPOT") {
        resultMessage += `JACKPOT! Three ${result[0]} symbols!\n`;
      } else if (winType === "DOUBLE") {
        resultMessage += `DOUBLE! Two matching symbols!\n`;
      } else {
        resultMessage += `No winning combination.\n`;
        resultMessage += `You lost: $${shortenNumber(betAmount)}\n`;
      }

      if (winnings > 0) {
        resultMessage += `You won: $${shortenNumber(winnings)}!\n`;
      }

      resultMessage += `New balance: $${shortenNumber(userData.money)}`;

      // send reply with gif attachment
      await message.reply({
        body: resultMessage,
        attachment: fs.createReadStream(gifPath),
      });

      // cleanup
      try {
        await fs.unlink(gifPath);
      } catch (e) {
        // ignore
      }

      // unsend processing message if API supports it
      try {
        if (processingMessage && processingMessage.messageID && typeof message.unsend === "function") {
          message.unsend(processingMessage.messageID).catch(() => {});
        }
      } catch (e) {
        // ignore
      }
    } catch (error) {
      console.error("Slot machine error:", error);
      try {
        if (processingMessage && typeof message.unsend === "function") {
          message.unsend(processingMessage.messageID).catch(() => {});
        }
      } catch (e) {}
      return message.reply("Sorry, the slot machine encountered an error. Please try again later.");
    }
  },
};