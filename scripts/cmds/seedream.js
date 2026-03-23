const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { createWriteStream } = require('fs');
const stapi = new global.utils.STBotApis();

module.exports = {
  config: {
    name: "seedream",
    aliases: [],
    version: "2.4.78",
    author: "ST | Sheikh Tamim",
    countDown: 5,
    role: 0,
    shortDescription: "Generate/Edit images using SeeDream AI",
    longDescription: "Generate new images or edit existing images using SeeDream 4.5 model with text prompts",
    category: "Image Editor",
    guide: {
      en: `Use: {pn} <prompt> --n <number> --ar <aspectRatio>

      Example usage:
      Generate: /seedream a beautiful sunset over mountains --n 2 --ar 16:9
      Edit (reply to image): /seedream change the dress color --n 2 --ar 16:9

      Options:
      --n: Number of images (1-4, default: 1)
      --ar: Aspect ratio (1:1, 4:3, 3:4, 16:9, 9:16, default: 1:1)

      Note: Reply to an image to edit it, or use without reply to generate new images.`
    }
  },

  ST: async function ({ message, args, api, event, usersData }) {
    const userData = await usersData.get(event.senderID);
    const userName = userData ? userData.name : "Unknown User";

    let prompt = "";
    let numImages = "1";
    let aspectRatio = "1:1";

    // Parse arguments
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--n' && args[i + 1]) {
        numImages = args[i + 1];
        i++;
      } else if (args[i] === '--ar' && args[i + 1]) {
        aspectRatio = args[i + 1];
        i++;
      } else {
        prompt += `${args[i]} `;
      }
    }

    prompt = prompt.trim();

    // Validate prompt
    if (!prompt) {
      return message.reply("❌ Please provide a prompt for image generation/editing.");
    }

    // Check if replying to an image (optional)
    let hasInputImage = false;
    let attachments = [];
    
    if (event.messageReply && event.messageReply.attachments && event.messageReply.attachments.length > 0) {
      attachments = event.messageReply.attachments.filter(att => att.type === 'photo');
      hasInputImage = attachments.length > 0;
    }

    // Validate number of images
    const maxImages = parseInt(numImages);
    if (isNaN(maxImages) || maxImages < 1 || maxImages > 4) {
      return message.reply("❌ Number of images must be between 1 and 4.");
    }

    try {
      // Calculate dimensions based on aspect ratio
      const dimensionsMap = {
        "1:1": { width: 2048, height: 2048 },
        "4:3": { width: 2304, height: 1728 },
        "3:4": { width: 1728, height: 2304 },
        "16:9": { width: 2730, height: 1536 },
        "9:16": { width: 1536, height: 2730 }
      };

      const dimensions = dimensionsMap[aspectRatio] || { width: 2048, height: 2048 };

      const apiUrl = `${stapi.baseURL}/flux2/generate`;

      const payload = {
        model: "seedream-4.5",
        prompt: prompt,
        aspectRatio: aspectRatio,
        seedreamSize: "4K",
        seedreamWidth: dimensions.width,
        seedreamHeight: dimensions.height,
        maxImages: maxImages,
        sequentialGeneration: "disabled"
      };

      // Add input image only if available
      if (hasInputImage) {
        const imageUrl = attachments[0].url;
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const base64 = Buffer.from(response.data, 'binary').toString('base64');
        const inputImage = `data:image/jpeg;base64,${base64}`;
        payload.inputImages = [inputImage];
      }


      const apiResponse = await axios.post(apiUrl, payload);

      if (apiResponse.data.success && apiResponse.data.output) {
        const imageUrls = Array.isArray(apiResponse.data.output) 
          ? apiResponse.data.output 
          : [apiResponse.data.output];

        const attachments = [];

        // Download all generated images
        for (let i = 0; i < imageUrls.length; i++) {
          const fileName = `seedream_${Date.now()}_${i}.jpg`;
          const tempFilePath = path.join(__dirname, fileName);
          const writer = createWriteStream(tempFilePath);

          const imageResponse = await axios({
            url: imageUrls[i],
            method: 'GET',
            responseType: 'stream'
          });

          imageResponse.data.pipe(writer);

          await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
          });

          attachments.push(fs.createReadStream(tempFilePath));
        }

        const responseBody = `✨ ${userName}, your ${hasInputImage ? 'edited' : 'generated'} image(s) are ready!\n` +
          `🎨 Model: SeeDream 4.5\n` +
          `📐 Aspect Ratio: ${aspectRatio}\n` +
          `🖼️ Images Generated: ${imageUrls.length}`;

        await message.reply({
          body: responseBody,
          attachment: attachments
        });

        // Clean up temp files
        setTimeout(() => {
          for (let i = 0; i < imageUrls.length; i++) {
            const fileName = `seedream_${Date.now()}_${i}.jpg`;
            const tempFilePath = path.join(__dirname, fileName);
            try {
              fs.unlinkSync(tempFilePath);
            } catch (err) {
              console.error('Error deleting temp file:', err);
            }
          }
        }, 5000);

      } else {
        throw new Error("No output received from API");
      }

    } catch (error) {
      console.error("Error editing image:", error.response?.data || error.message);

      return message.reply(
        `❌ An error occurred while editing the image.\n` +
        `Error: ${error.response?.data?.error || error.message}`
      );
    }
  }
};