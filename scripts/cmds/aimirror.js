
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const FormData = require("form-data");
const stapi = new global.utils.STBotApis();

module.exports = {
  config: {
    name: "aimirror",
    version: "2.4.78",
    author: "ST | Sheikh Tamim",
    countDown: 5,
    role: 0,
    description: {
      en: "Transform images using AI Mirror models"
    },
    category: "image",
    guide: {
      en: "Reply to an image with:"
        + "\n   {pn} - Use default model"
        + "\n   {pn} <model_id> - Use specific model by ID"
        + "\n   {pn} <serial_no> - Use model by serial number"
        + "\n   {pn} models - Show all models (paginated)"
        + "\n   {pn} models <page> - Show specific page"
        + "\n   {pn} -s <keyword> - Search models"
        + "\n   {pn} -sn <serial_no> - Use model from list/search by serial number"
    }
  },

  ST: async function({ message, event, args, api, usersData }) {
    const { senderID, messageReply, threadID, messageID } = event;
    const userName = await usersData.getName(senderID);

    // Handle models list
    if (args[0] === "models") {
      try {
        const response = await axios.get(`${stapi.baseURL}/aimirror/models`);
        const allModels = response.data.models;

        if (!allModels || allModels.length === 0) {
          return message.reply("❌ No models available");
        }

        const page = parseInt(args[1]) || 1;
        const perPage = 50;
        const totalPages = Math.ceil(allModels.length / perPage);

        if (page < 1 || page > totalPages) {
          return message.reply(`❌ Invalid page. Available pages: 1-${totalPages}`);
        }

        const startIdx = (page - 1) * perPage;
        const endIdx = startIdx + perPage;
        const pageModels = allModels.slice(startIdx, endIdx);

        let modelList = `📋 AI Mirror Models (Page ${page}/${totalPages})\n\n`;
        pageModels.forEach((model, idx) => {
          const serialNo = startIdx + idx + 1;
          modelList += `${serialNo}. ${model.name}\n`;
        });

        modelList += `\n📄 Total: ${allModels.length} models`;
        modelList += `\n💡 Use: ${global.GoatBot.config.prefix}aimirror -sn <serial_no>`;

        return message.reply(modelList, (err, info) => {
          if (!err) {
            global.GoatBot.onReply.set(info.messageID, {
              commandName: module.exports.config.name,
              messageID: info.messageID,
              author: senderID,
              type: "modelList",
              models: allModels
            });
          }
        });
      } catch (err) {
        return message.reply(`❌ Error fetching models: ${err.message}`);
      }
    }

    // Handle search
    if (args[0] === "-s") {
      const keyword = args.slice(1).join(" ");
      if (!keyword) {
        return message.reply("❌ Please provide a search keyword");
      }

      try {
        const response = await axios.get(`${stapi.baseURL}/aimirror/models`, {
          params: { search: keyword }
        });
        const searchResults = response.data.models;

        if (!searchResults || searchResults.length === 0) {
          return message.reply(`❌ No models found for "${keyword}"`);
        }

        let resultList = `🔍 Search Results for "${keyword}"\n\n`;
        searchResults.forEach((model, idx) => {
          resultList += `${idx + 1}. ${model.name}\n`;
        });

        resultList += `\n📄 Found: ${searchResults.length} models`;
        resultList += `\n💡 Use: ${global.GoatBot.config.prefix}aimirror -sn <serial_no>`;

        return message.reply(resultList, (err, info) => {
          if (!err) {
            global.GoatBot.onReply.set(info.messageID, {
              commandName: module.exports.config.name,
              messageID: info.messageID,
              author: senderID,
              type: "searchResults",
              searchResults: searchResults
            });
          }
        });
      } catch (err) {
        return message.reply(`❌ Error searching models: ${err.message}`);
      }
    }

    // Handle serial number selection with -sn
    if (args[0] === "-sn") {
      return message.reply("❌ Please use models list or search first, then use -sn <serial_no>");
    }

    // Handle image transformation
    if (!messageReply || !messageReply.attachments || messageReply.attachments.length === 0) {
      return message.reply("❌ Please reply to an image with this command");
    }

    const attachment = messageReply.attachments[0];
    if (attachment.type !== "photo") {
      return message.reply("❌ Please reply to a photo/image");
    }

    let modelId = 103; // Default model
    if (args[0] && !isNaN(args[0])) {
      modelId = parseInt(args[0]);
    }

    try {
      const startTime = Date.now();
      const processMsgID = await message.reply(`⏳ ${userName}, your aimirror is processing...`);

      // Download image
      const imageUrl = attachment.url;
      const imagePath = path.join(__dirname, `temp_${Date.now()}.jpg`);
      const imageResponse = await axios.get(imageUrl, { responseType: "arraybuffer" });
      fs.writeFileSync(imagePath, Buffer.from(imageResponse.data));

      // Create form data
      const form = new FormData();
      form.append("image", fs.createReadStream(imagePath));
      form.append("model_id", modelId.toString());

      // Send to API
      const response = await axios.post(
        `${stapi.baseURL}/aimirror`,
        form,
        {
          headers: {
            ...form.getHeaders()
          },
          maxBodyLength: Infinity
        }
      );

      // Clean up temp file
      fs.unlinkSync(imagePath);

      if (!response.data.success || !response.data.images || response.data.images.length === 0) {
        await message.unsend(processMsgID.messageID);
        return message.reply("❌ Failed to generate images");
      }

      const processTime = ((Date.now() - startTime) / 1000).toFixed(2);

      // Download all generated images
      const attachments = [];
      for (let i = 0; i < response.data.images.length; i++) {
        const imgUrl = response.data.images[i];
        const imgPath = path.join(__dirname, `aimirror_${Date.now()}_${i}.jpg`);
        const imgData = await axios.get(imgUrl, { responseType: "arraybuffer" });
        fs.writeFileSync(imgPath, Buffer.from(imgData.data));
        attachments.push(fs.createReadStream(imgPath));
      }

      // Unsend process message
      await message.unsend(processMsgID.messageID);

      // Send result
      await message.reply({
        body: `✅ ${userName}\n🎨 Model ID: ${modelId}\n⏱️ Process time: ${processTime}s\n📸 Generated ${response.data.images.length} images`,
        attachment: attachments
      });

      // Clean up generated images
      for (let i = 0; i < response.data.images.length; i++) {
        const imgPath = path.join(__dirname, `aimirror_${Date.now()}_${i}.jpg`);
        if (fs.existsSync(imgPath)) {
          fs.unlinkSync(imgPath);
        }
      }

    } catch (err) {
      return message.reply(`❌ Error: ${err.message}`);
    }
  },

  onReply: async function({ message, event, Reply, args, usersData }) {
    const { author, type, models, searchResults } = Reply;
    if (author !== event.senderID) return;

    const userName = await usersData.getName(event.senderID);
    const input = args.join(" ").trim();

    // Check if using -sn command
    let serialNo;
    if (input.startsWith("-sn ")) {
      serialNo = parseInt(input.split(" ")[1]);
    } else {
      serialNo = parseInt(input);
    }

    if (isNaN(serialNo)) {
      return message.reply(`❌ Please provide a valid serial number\n💡 Example: -sn 5 or just 5`);
    }

    // Handle model selection from main list
    if (type === "modelList") {
      if (serialNo < 1 || serialNo > models.length) {
        return message.reply(`❌ Invalid serial number. Choose 1-${models.length}`);
      }

      const selectedModel = models[serialNo - 1];

      // Check if replying to an image
      if (!event.messageReply || !event.messageReply.attachments || event.messageReply.attachments.length === 0) {
        return message.reply(
          `✅ Selected: ${selectedModel.name}\n` +
          `🆔 ID: ${selectedModel.id}\n\n` +
          `💡 Reply to an image with: ${global.GoatBot.config.prefix}aimirror ${selectedModel.id}`
        );
      }

      const attachment = event.messageReply.attachments[0];
      if (attachment.type !== "photo") {
        return message.reply("❌ Please reply to a photo/image");
      }

      await this.processImage(message, event, selectedModel, userName);
    }

    // Handle search result selection
    if (type === "searchResults") {
      if (serialNo < 1 || serialNo > searchResults.length) {
        return message.reply(`❌ Invalid serial number. Choose 1-${searchResults.length}`);
      }

      const selectedModel = searchResults[serialNo - 1];

      // Check if replying to an image
      if (!event.messageReply || !event.messageReply.attachments || event.messageReply.attachments.length === 0) {
        return message.reply(
          `✅ Selected: ${selectedModel.name}\n` +
          `🆔 ID: ${selectedModel.id}\n\n` +
          `💡 Reply to an image with: ${global.GoatBot.config.prefix}aimirror ${selectedModel.id}`
        );
      }

      const attachment = event.messageReply.attachments[0];
      if (attachment.type !== "photo") {
        return message.reply("❌ Please reply to a photo/image");
      }

      await this.processImage(message, event, selectedModel, userName);
    }
  },

  async processImage(message, event, selectedModel, userName) {
    try {
      const startTime = Date.now();
      const processMsgID = await message.reply(`⏳ ${userName}, your aimirror is processing...`);

      // Download image
      const imageUrl = event.messageReply.attachments[0].url;
      const imagePath = path.join(__dirname, `temp_${Date.now()}.jpg`);
      const imageResponse = await axios.get(imageUrl, { responseType: "arraybuffer" });
      fs.writeFileSync(imagePath, Buffer.from(imageResponse.data));

      // Create form data
      const form = new FormData();
      form.append("image", fs.createReadStream(imagePath));
      form.append("model_id", selectedModel.id.toString());

      // Send to API
      const response = await axios.post(
        `${stapi.baseURL}/aimirror`,
        form,
        {
          headers: {
            ...form.getHeaders()
          },
          maxBodyLength: Infinity
        }
      );

      // Clean up temp file
      fs.unlinkSync(imagePath);

      if (!response.data.success || !response.data.images || response.data.images.length === 0) {
        await message.unsend(processMsgID.messageID);
        return message.reply("❌ Failed to generate images");
      }

      const processTime = ((Date.now() - startTime) / 1000).toFixed(2);

      // Download all generated images
      const attachments = [];
      for (let i = 0; i < response.data.images.length; i++) {
        const imgUrl = response.data.images[i];
        const imgPath = path.join(__dirname, `aimirror_${Date.now()}_${i}.jpg`);
        const imgData = await axios.get(imgUrl, { responseType: "arraybuffer" });
        fs.writeFileSync(imgPath, Buffer.from(imgData.data));
        attachments.push(fs.createReadStream(imgPath));
      }

      // Unsend process message
      await message.unsend(processMsgID.messageID);

      // Send result
      await message.reply({
        body: `✅ ${userName}\n🎨 Model: ${selectedModel.name}\n🆔 ID: ${selectedModel.id}\n⏱️ Process time: ${processTime}s\n📸 Generated ${response.data.images.length} images`,
        attachment: attachments
      });

      // Clean up generated images
      for (let i = 0; i < response.data.images.length; i++) {
        const imgPath = path.join(__dirname, `aimirror_${Date.now()}_${i}.jpg`);
        if (fs.existsSync(imgPath)) {
          fs.unlinkSync(imgPath);
        }
      }

    } catch (err) {
      return message.reply(`❌ Error: ${err.message}`);
    }
  }
};