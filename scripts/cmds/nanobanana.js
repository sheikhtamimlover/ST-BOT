const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const { createWriteStream } = require('fs');
const stapi = new global.utils.STBotApis();

module.exports = {
  config: {
    name: "nanobanana",
    aliases: ["nano"],
    version: "2.4.78",
    author: "ST | Sheikh Tamim",
    countDown: 5,
    role: 0,
    shortDescription: "Generate images using NanoBanana Pro",
    longDescription: "Generate images with NanoBanana Pro, supports multiple image inputs",
    category: "Image Generator",
    guide: {
      en: `{pn} <prompt> --r <resolution> --ar <aspectRatio> --m <model>

      Example usage:
      /nano <prompt> --r 2K --ar 4:3 --m 1
      
      Models:
      1: nano-banana-pro (default)
      2: nano-banana
      3: gen4-image-turbo

      Resolution:
      1K, 2K, 4K

      Aspect Ratios:
      1:1, 4:3, 3:4, 16:9, 9:16, 21:9, 9:21
      
      You can also reply to images (up to 10) to use them as input.`
    }
  },

  ST: async function ({ message, args, api, event, usersData }) {
    const userData = await usersData.get(event.senderID);
    const userName = userData ? userData.name : "Unknown User";

    let prompt = "";
    let resolution = "2K";
    let aspectRatio = "4:3";
    let model = "1";

    // Parse arguments
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--r' && args[i + 1]) {
        resolution = args[i + 1].toUpperCase();
        i++;
      } else if (args[i] === '--ar' && args[i + 1]) {
        aspectRatio = args[i + 1];
        i++;
      } else if (args[i] === '--m' && args[i + 1]) {
        model = args[i + 1];
        i++;
      } else {
        prompt += `${args[i]} `;
      }
    }

    prompt = prompt.trim();

    // Map model numbers to model names
    const modelMap = {
      "1": "nano-banana-pro",
      "2": "nano-banana",
      "3": "gen4-image-turbo"
    };

    const selectedModel = modelMap[model] || "nano-banana-pro";

    const modelNames = {
      "nano-banana-pro": "NanoBanana Pro",
      "nano-banana": "NanoBanana",
      "gen4-image-turbo": "Gen4 Image Turbo"
    };

    // Validate inputs
    if (!prompt) {
      return message.reply("Please provide a prompt for image generation.");
    }

    // Handle image attachments from reply
    let inputImages = [];
    if (event.messageReply && event.messageReply.attachments) {
      const attachments = event.messageReply.attachments.filter(att => att.type === 'photo');
      
      if (attachments.length > 0) {
        if (attachments.length > 10) {
          return message.reply("Maximum 10 images allowed.");
        }

        const processMessage = await message.reply(`📸 ${userName}, processing ${attachments.length} image(s)...`);
        
        try {
          // Download images to temp files
          for (let i = 0; i < attachments.length; i++) {
            const imageUrl = attachments[i].url;
            const fileName = `temp_${Date.now()}_${i}.jpg`;
            const tempFilePath = path.join(__dirname, fileName);
            
            const response = await axios({
              url: imageUrl,
              method: 'GET',
              responseType: 'stream'
            });

            const writer = createWriteStream(tempFilePath);
            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
              writer.on('finish', resolve);
              writer.on('error', reject);
            });

            inputImages.push(tempFilePath);
          }
          
          await api.unsendMessage(processMessage.messageID);
        } catch (error) {
          console.error("Error processing images:", error);
          return message.reply("Failed to process input images.");
        }
      }
    }

    if (inputImages.length === 0) {
      return message.reply("Please reply to images (1-10) to use as input for generation.");
    }

    const processMessage = await message.reply(
      `🚀 ${userName}, generating your image using ${modelNames[selectedModel]}...\n` +
      `📐 Aspect Ratio: ${aspectRatio}\n` +
      `📏 Resolution: ${resolution}\n` +
      `📸 Input Images: ${inputImages.length}`
    );

    try {
      const apiUrl = `${stapi.baseURL}/douedit/upload-images`;
      
      // Create form data
      const formData = new FormData();
      
      // Append images
      for (const imagePath of inputImages) {
        formData.append('images', fs.createReadStream(imagePath));
      }
      
      // Append other fields
      formData.append('prompt', prompt);
      formData.append('model', selectedModel);
      formData.append('resolution', resolution);
      formData.append('aspectRatio', aspectRatio);
      formData.append('outputFormat', 'png');
      formData.append('safetyFilterLevel', 'block_only_high');

      const response = await axios.post(apiUrl, formData, {
        headers: {
          ...formData.getHeaders()
        },
      });

      // Clean up temp files
      for (const imagePath of inputImages) {
        try {
          fs.unlinkSync(imagePath);
        } catch (err) {
          console.error('Error deleting temp file:', err);
        }
      }

      if (response.data.success && response.data.data && response.data.data.imageUrl) {
        const imageUrl = response.data.data.imageUrl;

        // Download the generated image
        const fileName = `nano_${Date.now()}.png`;
        const tempFilePath = path.join(__dirname, fileName);
        const writer = createWriteStream(tempFilePath);

        const imageResponse = await axios({
          url: imageUrl,
          method: 'GET',
          responseType: 'stream'
        });

        imageResponse.data.pipe(writer);

        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });

        // Unsend the process message
        try {
          await api.unsendMessage(processMessage.messageID);
        } catch (deleteError) {
          console.error('Error deleting initial message:', deleteError);
        }

        // Send the result
        const responseBody = `✨ ${userName}, your image is ready!\n` +
          `🎨 Model: ${modelNames[selectedModel]}\n` +
          `📐 Ratio: ${aspectRatio}\n` +
          `📏 Resolution: ${resolution}`;

        await message.reply({
          body: responseBody,
          attachment: fs.createReadStream(tempFilePath)
        });

        // Clean up the temp file
        setTimeout(() => {
          try {
            fs.unlinkSync(tempFilePath);
          } catch (err) {
            console.error('Error deleting temp file:', err);
          }
        }, 5000);

      } else {
        throw new Error("No output received from API");
      }

    } catch (error) {
      console.error("Error generating image:", error.response?.data || error.message);

      // Clean up temp files on error
      for (const imagePath of inputImages) {
        try {
          fs.unlinkSync(imagePath);
        } catch (err) {
          console.error('Error deleting temp file:', err);
        }
      }

      // Unsend the process message
      try {
        await api.unsendMessage(processMessage.messageID);
      } catch (deleteError) {
        console.error('Error deleting initial message:', deleteError);
      }

      return message.reply(
        `❌ ${userName}, an error occurred while generating the image.\n` +
        `Error: ${error.response?.data?.error || error.message}`
      );
    }
  }
};