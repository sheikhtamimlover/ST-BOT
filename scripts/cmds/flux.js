const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { createWriteStream } = require('fs');
const stapi = new global.utils.STBotApis();

module.exports = {
  config: {
    name: "flux",
    aliases: [],
    version: "2.4.78",
    author: "ST | Sheikh Tamim",
    countDown: 5,
    role: 0,
    shortDescription: "Generate images using Flux 2 API",
    longDescription: "Generate images with Flux 2 models, supports image inputs including Flux 2 Max",
    category: "Image Generator",
    guide: {
      en: "{pn} <prompt> --m <model> --ar <aspectRatio> --r <resolution>\n" +
      "Example usage:\n" +
      "/flux2 <prompt> --m 4 --ar 1:1 --r 2\n\n" +
      "Models (1-4):\n" +
      "1: Flux 2 Pro (default)\n" +
      "2: Flux 2 Dev\n" +
      "3: Flux 2 Flex\n" +
      "4: Flux 2 Max\n\n" + // Added Max
      "Aspect Ratios:\n" +
      "1:1, 4:3, 3:4, 16:9, 9:16, 21:9, 9:21\n\n" +
      "Resolution (MP):\n" +
      "0.25, 0.5, 1, 2\n\n" +
      "You can also reply to images (up to 4) to use them as input."
    }
  },

  ST: async function ({ message, args, api, event, usersData }) {
    const userData = await usersData.get(event.senderID);
    const userName = userData ? userData.name : "Unknown User";

    let prompt = "";
    let model = "1";           
    let aspectRatio = "1:1";   
    let resolution = "1";      

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--m' && args[i + 1]) {
        model = args[i + 1];
        i++;
      } else if (args[i] === '--ar' && args[i + 1]) {
        aspectRatio = args[i + 1];
        i++;
      } else if (args[i] === '--r' && args[i + 1]) {
        resolution = args[i + 1];
        i++;
      } else {
        prompt += `${args[i]} `;
      }
    }

    prompt = prompt.trim();

    const modelMap = {
      "1": "flux-2-pro",
      "2": "flux-2-dev",
      "3": "flux-2-flex",
      "4": "flux-2-max" // Added Max Map
    };

    const selectedModel = modelMap[model] || "flux-2-pro";

    const resolutionMap = {
      "0.25": "0.25 MP",
      "0.5": "0.5 MP",
      "1": "1 MP",
      "2": "2 MP"
    };

    const selectedResolution = resolutionMap[resolution] || "1 MP";

    if (!prompt) {
      return message.reply("Please provide a prompt for image generation.");
    }

    if (!modelMap[model]) {
      return message.reply("Invalid model. Use 1 (Pro), 2 (Dev), 3 (Flex), or 4 (Max).");
    }

    let inputImages = [];
    if (event.messageReply && event.messageReply.attachments) {
      const attachments = event.messageReply.attachments.filter(att => att.type === 'photo');

      if (attachments.length > 0) {
        const processMessage = await message.reply(`📸 Processing ${attachments.length} image(s)...`);

        try {
          for (let i = 0; i < Math.min(attachments.length, 4); i++) {
            const imageUrl = attachments[i].url;
            const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            const base64 = Buffer.from(response.data, 'binary').toString('base64');
            inputImages.push(`data:image/jpeg;base64,${base64}`);
          }
          await api.unsendMessage(processMessage.messageID);
        } catch (error) {
          console.error("Error processing images:", error);
          return message.reply("Failed to process input images.");
        }
      }
    }

    const modelNames = {
      "flux-2-pro": "Flux 2 Pro",
      "flux-2-dev": "Flux 2 Dev",
      "flux-2-flex": "Flux 2 Flex",
      "flux-2-max": "Flux 2 Max" // Added Name
    };

    const processMessage = await message.reply(
      `🚀 ${userName} generating your image using ${modelNames[selectedModel]}...`
    );

    try {
      const apiUrl = `${stapi.baseURL}/flux2/generate`;

      let payload = {
        model: selectedModel,
        prompt: prompt,
        outputFormat: "jpg",
        outputQuality: 80
      };

      if (inputImages.length > 0) {
        payload.inputImages = inputImages;
        // Keep requested ratio for Max model if images are provided, or match_input for others
        payload.aspectRatio = selectedModel === "flux-2-max" ? aspectRatio : "match_input_image";
      } else {
        payload.aspectRatio = aspectRatio;
      }

      // Logic per model
      if (selectedModel === "flux-2-pro") {
        payload.resolution = selectedResolution;
        payload.safetyTolerance = 2;
        payload.promptUpsampling = false;
      } else if (selectedModel === "flux-2-dev") {
        payload.goFast = true;
      } else if (selectedModel === "flux-2-flex") {
        payload.resolution = selectedResolution;
        payload.safetyTolerance = 2;
        payload.steps = 30;
        payload.guidance = 4.5;
        payload.promptUpsampling = false;
      } else if (selectedModel === "flux-2-max") {
        // Flux 2 Max specific payload keys
        payload.resolution = selectedResolution;
        payload.safetyTolerance = 2;
      }

      const response = await axios.post(apiUrl, payload);

      if (response.data.success && response.data.output) {
        const imageUrl = Array.isArray(response.data.output) 
          ? response.data.output[0] 
          : response.data.output;

        const fileName = `flux2_${Date.now()}.jpg`;
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

        try {
          await api.unsendMessage(processMessage.messageID);
        } catch (deleteError) {
          console.error('Error deleting initial message:', deleteError);
        }

        const responseBody = `✨ ${userName}, your image is ready!\n` +
          `🎨 Model: ${modelNames[selectedModel]}\n` +
          `📐 Ratio: ${payload.aspectRatio}\n` +
          `📏 Resolution: ${selectedResolution}`;

        await message.reply({
          body: responseBody,
          attachment: fs.createReadStream(tempFilePath)
        });

        setTimeout(() => {
          try {
            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
          } catch (err) {
            console.error('Error deleting temp file:', err);
          }
        }, 5000);

      } else {
        throw new Error("No output received from API");
      }

    } catch (error) {
      console.error("Error generating image:", error.response?.data || error.message);
      try {
        await api.unsendMessage(processMessage.messageID);
      } catch (deleteError) {}
      return message.reply(
        `❌ An error occurred while generating the image.\n` +
        `Error: ${error.response?.data?.error || error.message}`
      );
    }
  }
};