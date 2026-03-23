const axios = require('axios');
const FormData = require('form-data');
const stapi = new global.utils.STBotApis();

module.exports = {
  config: {
    name: "midjourneyprompt",
    aliases: ["mjprompt", "mjp"],
    limit: 2,
    author: "ST | Sheikh Tamim",
    version: "2.4.78",
    countDown: 5,
    role: 0,
    description: "Get AI-generated prompts from an image using Midjourney",
    category: "ai",
    guide: {
      en: "Reply to an image with {pn} - Get AI descriptions\nExample: Reply to any image with 'mjprompt'"
    }
  },

  ST: async ({ event, message, api, usersData }) => {
    try {
      const userData = await usersData.get(event.senderID);
      const userName = userData ? userData.name : "User";

      // Check if replying to an image
      if (!event.messageReply || !event.messageReply.attachments || event.messageReply.attachments.length === 0) {
        return message.reply(
          `🔍 Midjourney Prompt Generator\n\n` +
          `Usage:\n` +
          `• Reply to an image with {pn} - Get AI descriptions\n\n` +
          `Example:\n` +
          `Reply to any image with 'mjprompt'`
        );
      }

      const attachment = event.messageReply.attachments[0];
      if (attachment.type !== "photo" && attachment.type !== "animated_image") {
        return message.reply(`❌ Please reply to an image (photo or GIF).`);
      }

      const processingMsg = await message.reply(`🔍 ${userName}\nAnalyzing image...\n\n⏳ Progress: 0%`);

      // Get image buffer
      let imageBuffer;
      try {
        const imageUrl = attachment.url;
        imageBuffer = await global.utils.getStreamFromURL(imageUrl);
      } catch (error) {
        await api.editMessage(
          `❌ Failed to process image: ${error.message}`,
          processingMsg.messageID
        );
        return;
      }

      // Submit describe task
      const formData = new FormData();
      formData.append('image', imageBuffer, {
        filename: 'image.png',
        contentType: 'image/png'
      });
      formData.append('botType', 'MID_JOURNEY');

      let taskId;
      try {
        const response = await axios.post(`${stapi.baseURL}/mj/describe`, formData, {
          headers: formData.getHeaders()
        });

        if (!response.data.success) {
          throw new Error(response.data.message || 'Task submission failed');
        }

        taskId = response.data.taskId;
      } catch (error) {
        await api.editMessage(
          `❌ Failed to submit task: ${error.message}`,
          processingMsg.messageID
        );
        return;
      }

      // Poll for progress
      let isCompleted = false;
      let lastProgress = 0;
      let progressData = null;
      let editCount = 0;

      while (!isCompleted) {
        await new Promise(resolve => setTimeout(resolve, 3000));

        try {
          const progressResponse = await axios.get(`${stapi.baseURL}/mj/progress/${taskId}`);
          progressData = progressResponse.data;

          const currentProgress = parseInt(progressData.progress) || 0;

          if (currentProgress !== lastProgress && currentProgress < 100) {
            lastProgress = currentProgress;
            editCount++;

            if (editCount <= 1 || (currentProgress >= 50 && editCount <= 3)) {
              await api.editMessage(
                `🔍 ${userName}\nAnalyzing image...\n\n⏳ Progress: ${progressData.progress}`,
                processingMsg.messageID
              );
            }
          }

          if (progressData.isCompleted) {
            isCompleted = true;
          }

          if (progressData.status === 'FAILURE' || progressData.error) {
            throw new Error(progressData.error || 'Analysis failed');
          }
        } catch (error) {
          if (error.response?.status === 404) {
            await api.editMessage(
              `❌ Task not found or expired`,
              processingMsg.messageID
            );
            return;
          }
          throw error;
        }
      }

      if (!progressData.task || !progressData.task.promptEn) {
        await api.editMessage(
          `❌ No description generated`,
          processingMsg.messageID
        );
        return;
      }

      await message.unsend(processingMsg.messageID);

      // Parse the prompts from promptEn
      const prompts = progressData.task.promptEn.split('\r\n').filter(p => p.trim());

      // Create response message with numbered prompts
      let responseMsg = `🔍 Image Analysis\n\n`;

      prompts.forEach((prompt, index) => {
        responseMsg += `${index + 1}. ${prompt.substring(0, 80)}${prompt.length > 80 ? '...' : ''}\n\n`;
      });

      responseMsg += `Reply: 1-${prompts.length}`;

      const resultMsg = await message.reply(responseMsg);

      // Store the prompts for onReply handler
      global.GoatBot.onReply.set(resultMsg.messageID, {
        commandName: module.exports.config.name,
        type: 'describe',
        taskId: taskId,
        prompts: prompts,
        buttons: progressData.task.buttons || [],
        messageID: resultMsg.messageID,
        author: event.senderID
      });

    } catch (error) {
      console.error('Error in mjprompt command:', error);
      await message.reply(`❌ Error: ${error.message}`);
    }
  },

  onReply: async function ({ message, event, Reply, api, usersData }) {
    const { author, type, prompts } = Reply;
    if (event.senderID !== author) return;

    const input = event.body.trim();

    // Handle describe prompt selection
    if (type === 'describe' && prompts) {
      if (!/^\d+$/.test(input)) {
        return message.reply(`❌ Please reply with a number between 1-${prompts.length} to select a prompt.`);
      }

      const promptNum = parseInt(input);
      if (promptNum < 1 || promptNum > prompts.length) {
        return message.reply(`❌ Invalid number. Please choose between 1-${prompts.length}.`);
      }

      const selectedPrompt = prompts[promptNum - 1];
      
      // Send the selected prompt to the user
      await message.reply(`✅ Selected Prompt ${promptNum}:\n\n${selectedPrompt}\n\nYou can now use this prompt with the 'mj' command to generate an image.`);
    }
  }
};