const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const stapi = new global.utils.STBotApis();

module.exports = {
  config: {
    name: "niji",
    aliases: ["nijijourney"],
    author: "ST | Sheikh Tamim",
    version: "2.4.78",
    countDown: 5,
    role: 0,
    description: "Generate anime-style images using Niji Journey AI",
    category: "ai",
    guide: {
      en: "{pn} <prompt> - Generate anime image\n{pn} reply to image with prompt - Use image reference\nExample: {pn} Anime girl with cherry blossoms"
    }
  },

  ST: async ({ event, message, args, api, usersData }) => {
    try {
      if (args.length === 0 && !event.messageReply) {
        return message.reply(
          `🎨 Niji Journey Image Generator\n\n` +
          `Usage:\n` +
          `• {pn} <prompt> - Generate anime image\n` +
          `• Reply to image with {pn} <prompt> - Use image reference\n\n` +
          `Example:\n` +
          `{pn} Anime girl with cherry blossoms`
        );
      }

      const prompt = args.join(' ');
      const userData = await usersData.get(event.senderID);
      const userName = userData ? userData.name : "User";

      let imageBuffer = null;

      // Check if replying to an image
      if (event.messageReply && event.messageReply.attachments && event.messageReply.attachments.length > 0) {
        const attachment = event.messageReply.attachments[0];
        if (attachment.type === "photo" || attachment.type === "animated_image") {
          try {
            const imageUrl = attachment.url;
            imageBuffer = await global.utils.getStreamFromURL(imageUrl);
          } catch (error) {
            return message.reply(`❌ Failed to process image: ${error.message}`);
          }
        }
      }

      const processingMsg = await message.reply(`🎨 ${userName}\nGenerating: ${prompt}\n\n⏳ Progress: 0%`);

      // Submit task
      const formData = new FormData();
      formData.append('prompt', prompt);
      formData.append('botType', 'NIJI_JOURNEY');

      if (imageBuffer) {
        formData.append('images', imageBuffer, {
          filename: 'reference.webp',
          contentType: 'image/webp'
        });
      }

      let taskId;
      try {
        const response = await axios.post(`${stapi.baseURL}/mj/imagine`, formData, {
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

      // Poll for progress with smart editing
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

            if (editCount === 0 || (currentProgress >= 50 && editCount === 1) || (currentProgress >= 90 && editCount === 2)) {
              editCount++;
              await api.editMessage(
                `🎨 ${userName}\nGenerating: ${prompt}\n\n⏳ Progress: ${progressData.progress}`,
                processingMsg.messageID
              );
            }
          }

          if (progressData.isCompleted) {
            isCompleted = true;
          }

          if (progressData.status === 'FAILURE' || progressData.error) {
            throw new Error(progressData.error || 'Generation failed');
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

      if (!progressData.task || !progressData.task.imageUrl) {
        await api.editMessage(
          `❌ No image generated`,
          processingMsg.messageID
        );
        return;
      }

      // Download image
      const imageUrl = progressData.task.imageUrl;
      const tmpDir = path.join(__dirname, '..', '..', 'tmp');
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }

      const webpPath = path.join(tmpDir, `niji_${taskId}.webp`);

      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      fs.writeFileSync(webpPath, Buffer.from(imageResponse.data));

      await message.unsend(processingMsg.messageID);

      const buttonMap = new Map();
      let actionLine = '';

      if (progressData.task.buttons && progressData.task.buttons.length > 0) {
        const uButtons = progressData.task.buttons.filter(btn => btn.label && btn.label.startsWith('U'));
        const vButtons = progressData.task.buttons.filter(btn => btn.label && btn.label.startsWith('V'));
        const refreshButton = progressData.task.buttons.find(btn => btn.emoji === '🔄');

        uButtons.forEach(btn => {
          buttonMap.set(btn.label, { customId: btn.customId, label: btn.label });
        });

        vButtons.forEach(btn => {
          buttonMap.set(btn.label, { customId: btn.customId, label: btn.label });
        });

        if (refreshButton) {
          buttonMap.set('🔄', { customId: refreshButton.customId, label: 'Regenerate' });
        }

        const uLabels = uButtons.map(btn => btn.label).join(' ');
        const vLabels = vButtons.map(btn => btn.label).join(' ');
        const parts = [uLabels, refreshButton ? '🔄' : '', vLabels].filter(p => p);

        if (parts.length > 0) {
          actionLine = `\n\n${parts.join(' ')}`;
        }
      }

      const resultMsg = await message.reply({
        body: actionLine,
        attachment: fs.createReadStream(webpPath)
      });

      global.GoatBot.onReply.set(resultMsg.messageID, {
        commandName: module.exports.config.name,
        taskId: taskId,
        prompt: prompt,
        buttons: progressData.task.buttons || [],
        buttonMap: buttonMap,
        messageID: resultMsg.messageID,
        author: event.senderID,
        isInitial: true
      });

      // Clean up
      if (fs.existsSync(webpPath)) {
        fs.unlinkSync(webpPath);
      }

    } catch (error) {
      console.error('Error in niji command:', error);
      await message.reply(`❌ Error: ${error.message}`);
    }
  },

  onReply: async function ({ message, event, Reply, api, usersData }) {
    const { author, taskId, prompt, buttonMap, isInitial } = Reply;
    if (event.senderID !== author) return;

    const input = event.body.trim();
    let selectedButton;

    if (isInitial) {
      selectedButton = buttonMap.get(input);

      if (!selectedButton) {
        const availableActions = Array.from(buttonMap.keys()).join(' ');
        return message.reply(`❌ Invalid selection.\n\nAvailable: ${availableActions}`);
      }
    } else {
      if (!/^\d+$/.test(input)) {
        return message.reply(`❌ Please reply with a number to select an action.`);
      }

      const btnNum = parseInt(input);
      selectedButton = buttonMap.get(btnNum);

      if (!selectedButton) {
        const availableActions = Array.from(buttonMap.entries()).map(([key, val]) => `${key}. ${val.label}`);
        return message.reply(`❌ Invalid selection.\n\nAvailable actions:\n${availableActions.join('\n')}`);
      }
    }

    const userData = await usersData.get(event.senderID);
    const userName = userData ? userData.name : "User";

    // Determine action type and next display format
    let actionName = 'Processing';
    let isUpscale = false;

    if (selectedButton.customId.includes('upsample')) {
      actionName = 'Upscaling';
      isUpscale = true;
    } else if (selectedButton.customId.includes('variation')) {
      actionName = 'Creating variation';
    } else if (selectedButton.customId.includes('reroll')) {
      actionName = 'Regenerating';
    }

    const processingMsg = await message.reply(`⏳ ${userName}\n${actionName}...\n\nProgress: 0%`);

    try {
      // Send action request
      const actionResponse = await axios.post(`${stapi.baseURL}/mj/action`, {
        taskId: taskId,
        customId: selectedButton.customId
      });

      if (!actionResponse.data.success) {
        await api.editMessage(
          `❌ Action failed`,
          processingMsg.messageID
        );
        return;
      }

      const newTaskId = actionResponse.data.taskId;

      // Poll for new task
      let isCompleted = false;
      let lastProgress = 0;
      let progressData = null;
      let editCount = 0;

      while (!isCompleted) {
        await new Promise(resolve => setTimeout(resolve, 3000));

        const progressResponse = await axios.get(`${stapi.baseURL}/mj/progress/${newTaskId}`);
        progressData = progressResponse.data;

        const currentProgress = parseInt(progressData.progress) || 0;

        if (currentProgress !== lastProgress && currentProgress < 100) {
          lastProgress = currentProgress;

          if (editCount === 0 || (currentProgress >= 50 && editCount === 1) || (currentProgress >= 90 && editCount === 2)) {
            editCount++;
            await api.editMessage(
              `⏳ ${userName}\n${actionName}...\n\nProgress: ${progressData.progress}`,
              processingMsg.messageID
            );
          }
        }

        if (progressData.isCompleted) {
          isCompleted = true;
        }

        if (progressData.status === 'FAILURE' || progressData.error) {
          throw new Error(progressData.error || 'Action failed');
        }
      }

      const imageUrl = progressData.task.imageUrl;
      const tmpDir = path.join(__dirname, '..', '..', 'tmp');
      const webpPath = path.join(tmpDir, `niji_${newTaskId}.webp`);

      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      fs.writeFileSync(webpPath, Buffer.from(imageResponse.data));

      await message.unsend(processingMsg.messageID);

      const newButtonMap = new Map();
      let displayBody = '';
      let nextIsInitial = true;

      if (progressData.task.buttons && progressData.task.buttons.length > 0) {
        if (isUpscale) {
          let btnIndex = 0;
          const actionLines = [];

          progressData.task.buttons.forEach(btn => {
            const btnId = btnIndex + 1;
            let displayLabel = '';

            if (btn.emoji && btn.label) {
              displayLabel = `${btn.emoji} ${btn.label}`;
            } else if (btn.label) {
              displayLabel = btn.label;
            } else {
              displayLabel = btn.emoji || `Action ${btnId}`;
            }

            newButtonMap.set(btnId, { customId: btn.customId, label: displayLabel });
            actionLines.push(`${btnId}. ${displayLabel}`);
            btnIndex++;
          });

          if (actionLines.length > 0) {
            displayBody = `\n\n✨ Available Actions:\n${actionLines.join('\n')}\n\n💡 Reply with a number to select`;
          }
          nextIsInitial = false;
        } else {
          const uButtons = progressData.task.buttons.filter(btn => btn.label && btn.label.startsWith('U'));
          const vButtons = progressData.task.buttons.filter(btn => btn.label && btn.label.startsWith('V'));
          const refreshButton = progressData.task.buttons.find(btn => btn.emoji === '🔄');

          uButtons.forEach(btn => {
            newButtonMap.set(btn.label, { customId: btn.customId, label: btn.label });
          });

          vButtons.forEach(btn => {
            newButtonMap.set(btn.label, { customId: btn.customId, label: btn.label });
          });

          if (refreshButton) {
            newButtonMap.set('🔄', { customId: refreshButton.customId, label: 'Regenerate' });
          }

          const uLabels = uButtons.map(btn => btn.label).join(' ');
          const vLabels = vButtons.map(btn => btn.label).join(' ');
          const parts = [uLabels, refreshButton ? '🔄' : '', vLabels].filter(p => p);

          if (parts.length > 0) {
            displayBody = `\n\n${parts.join(' ')}`;
          }
          nextIsInitial = true;
        }
      }

      const resultMsg = await message.reply({
        body: displayBody,
        attachment: fs.createReadStream(webpPath)
      });

      global.GoatBot.onReply.set(resultMsg.messageID, {
        commandName: module.exports.config.name,
        taskId: newTaskId,
        prompt: prompt,
        buttons: progressData.task.buttons || [],
        buttonMap: newButtonMap,
        messageID: resultMsg.messageID,
        author: event.senderID,
        isInitial: nextIsInitial
      });

      // Clean up
      if (fs.existsSync(webpPath)) {
        fs.unlinkSync(webpPath);
      }

    } catch (error) {
      console.error('Error in niji action:', error);
      await message.reply(`❌ Error: ${error.message}`);
    }
  }
};