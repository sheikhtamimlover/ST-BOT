const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const stbotApi = new global.utils.STBotApis();

module.exports = {
  config: {
    name: "sthandlers",
    aliases: ["cs", "sth"],
    version: "2.4.66",
    author: "ST | Sheikh Tamim",
    countDown: 5,
    role: 0,
    description: "Command Store - Browse, upload and install commands/events/apis",
    category: "utility",
    guide: {
      en: "   {pn} - Show main menu\n"
        + "   {pn} <filename> - Install from store\n"
        + "   {pn} <filename> <code> - Upload command code\n"
        + "   {pn} -e <filename> <code> - Upload event code\n"
        + "   {pn} -p <filename> - Upload command from path\n"
        + "   {pn} -ep <filename> - Upload event from path"
    }
  },

  ST: async function({ message, args, event, usersData, api, threadModel, userModel, dashBoardModel, globalModel, threadsData, globalData, dashBoardData, getLang }) {
    const { senderID, threadID, isGroup } = event;

    // Get user name
    let userName = "User";
    try {
      const userData = await usersData.get(senderID);
      userName = userData?.name || "User";
    } catch (err) {
      // If user data fetch fails, use default name
      userName = "User";
    }

    // Handle upload from path
    if (args[0] === "-p" || args[0] === "-ep") {
      if (!args[1]) {
        return message.reply("❌ Please provide a filename");
      }

      const type = args[0] === "-p" ? "command" : "event";
      const folder = type === "command" ? "cmds" : "events";
      const filename = args[1].endsWith('.js') ? args[1] : args[1] + '.js';
      const filePath = path.join(__dirname, folder === "cmds" ? "." : `../events`, filename);

      if (!fs.existsSync(filePath)) {
        return message.reply(`❌ File not found: ${filename}`);
      }

      const code = fs.readFileSync(filePath, "utf-8");

      try {
        const response = await axios.post(`${stbotApi.baseURL}/api/upload`, {
          type: type,
          filename: filename.replace('.js', ''),
          code: code,
          author: userName,
          sendId: senderID,
          threadId: isGroup ? threadID : ""
        });

        return message.reply(
          `✅ Your ${type} has been uploaded!\n\n` +
          `📁 File: ${filename}\n` +
          `⏳ Status: Pending\n\n` +
          `👤 Owner ST | Sheikh Tamim will review and add it if the ${type} is okay.`
        );
      } catch (err) {
        return message.reply(`❌ Upload failed: ${err.message}`);
      }
    }

    // Handle upload with code
    if (args[0] === "-e") {
      const type = "event";

      if (!args[1]) {
        return message.reply(`❌ Please provide filename and code for ${type}`);
      }

      const filename = args[1];
      const code = event.body.slice(event.body.indexOf(filename) + filename.length + 1).trim();

      if (!code) {
        return message.reply(`❌ Please provide code for the ${type}`);
      }

      try {
        const response = await axios.post(`${stbotApi.baseURL}/api/upload`, {
          type: type,
          filename: filename.replace('.js', ''),
          code: code,
          author: userName,
          sendId: senderID,
          threadId: isGroup ? threadID : ""
        });

        return message.reply(
          `✅ Your ${type} has been uploaded!\n\n` +
          `📁 File: ${filename}\n` +
          `⏳ Status: Pending\n\n` +
          `👤 Owner ST | Sheikh Tamim will review and add it if the ${type} is okay.`
        );
      } catch (err) {
        return message.reply(`❌ Upload failed: ${err.message}`);
      }
    }

    // Handle command upload with code (default)
    if (args[0] && args[1] && !args[0].startsWith('-')) {
      const filename = args[0];
      const code = event.body.slice(event.body.indexOf(filename) + filename.length + 1).trim();

      if (!code) {
        return message.reply("❌ Please provide code for the command");
      }

      try {
        const response = await axios.post(`${stbotApi.baseURL}/api/upload`, {
          type: "command",
          filename: filename.replace('.js', ''),
          code: code,
          author: userName,
          sendId: senderID,
          threadId: isGroup ? threadID : ""
        });

        return message.reply(
          `✅ Your command has been uploaded!\n\n` +
          `📁 File: ${filename}\n` +
          `⏳ Status: Pending\n\n` +
          `👤 Owner ST | Sheikh Tamim will review and add it if the command is okay.`
        );
      } catch (err) {
        return message.reply(`❌ Upload failed: ${err.message}`);
      }
    }

    // Handle install from store
    if (args[0] && !args[0].startsWith('-')) {
      const filename = args[0];

      try {
        const response = await axios.get(`${stbotApi.baseURL}/api/files`);
        const files = response.data.files || [];

        const file = files.find(f => 
          f.filename === filename || 
          f.filename === filename.replace('.js', '') ||
          f.filename + '.js' === filename
        );

        if (!file) {
          return message.reply(`❌ File not found in store: ${filename}`);
        }

        if (file.status !== 'approved') {
          return message.reply(`❌ This file is not yet approved`);
        }

        const folder = file.type === 'command' ? 'cmds' : file.type === 'event' ? 'events' : 'api';
        const finalFilename = file.filename.endsWith('.js') ? file.filename : file.filename + '.js';
        const savePath = path.join(__dirname, folder === 'cmds' ? '.' : `../${folder}`, finalFilename);

        // Check if file already exists
        if (fs.existsSync(savePath)) {
          const existingFile = require(savePath);
          const existingName = existingFile?.config?.name || finalFilename.replace('.js', '');

          return message.reply(
            `⚠️ ${file.type === 'command' ? 'Command' : file.type === 'event' ? 'Event' : 'API'} file already exists!\n\n` +
            `📁 File: ${finalFilename}\n` +
            `📝 Name: ${existingName}\n\n` +
            `React to this message to replace it\n` +
            `OR\n` +
            `Reply with a new name to install with different name`,
            (err, info) => {
              global.GoatBot.onReaction.set(info.messageID, {
                commandName: module.exports.config.name,
                messageID: info.messageID,
                author: senderID,
                type: "installReplace",
                data: {
                  file: file,
                  savePath: savePath,
                  finalFilename: finalFilename,
                  folder: folder
                }
              });

              global.GoatBot.onReply.set(info.messageID, {
                commandName: module.exports.config.name,
                messageID: info.messageID,
                author: senderID,
                type: "installRename",
                data: {
                  file: file,
                  folder: folder
                }
              });
            }
          );
        }

        // Download and install
        const codeResponse = await axios.get(file.rawUrl);
        const code = codeResponse.data;

        fs.writeFileSync(savePath, code);

        // Auto-load the command/event
        const { loadScripts } = global.utils;
        const { configCommands } = global.GoatBot;
        const { log } = global.utils;

        const scriptType = file.type === 'command' ? 'cmds' : 'events';
        const infoLoad = loadScripts(
          scriptType,
          finalFilename.replace('.js', ''),
          log,
          configCommands,
          api,
          threadModel,
          userModel,
          dashBoardModel,
          globalModel,
          threadsData,
          usersData,
          dashBoardData,
          globalData,
          getLang
        );

        if (infoLoad.status === "success") {
          return message.reply(
            `✅ Successfully installed and loaded!\n\n` +
            `📁 File: ${finalFilename}\n` +
            `📂 Type: ${file.type}\n` +
            `📝 Name: ${infoLoad.name}\n` +
            `👤 Author: ${file.author}\n` +
            `📅 Added: ${file.uploadDate}\n\n` +
            `The ${file.type} is now active!`
          );
        } else {
          return message.reply(
            `✅ Installed but failed to load\n\n` +
            `📁 File: ${finalFilename}\n` +
            `❌ Error: ${infoLoad.error.name}: ${infoLoad.error.message}\n\n` +
            `Use !cmd load ${finalFilename.replace('.js', '')} to try loading manually`
          );
        }
      } catch (err) {
        return message.reply(`❌ Installation failed: ${err.message}`);
      }
    }

    // Show main menu
    const menuMessage = `╭─────────────────────◊\n` +
      `│  📦 COMMAND STORE MENU\n` +
      `├─────────────────────◊\n` +
      `│ 1. Commands\n` +
      `│ 2. Events\n` +
      `│ 3. APIs\n` +
      `├─────────────────────◊\n` +
      `│ 💡 Reply with number to browse\n` +
      `╰─────────────────────◊\n` +
      `        💫 ST Command Store`;

    const sentMessage = await message.reply(menuMessage);

    if (sentMessage) {
      global.GoatBot.onReply.set(sentMessage.messageID, {
        commandName: module.exports.config.name,
        messageID: sentMessage.messageID,
        author: senderID,
        stage: 1
      });
    }
  },

  onReaction: async function({ Reaction, message, event, api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getLang }) {
    const { author, type, data, messageID } = Reaction;

    if (event.userID != author) {
      return;
    }

    if (type === "installReplace") {
      const { file, savePath, finalFilename, folder } = data;

      try {
        // Download and install
        const codeResponse = await axios.get(file.rawUrl);
        const code = codeResponse.data;

        fs.writeFileSync(savePath, code);

        // Auto-load the command/event
        const { loadScripts } = global.utils;
        const { configCommands } = global.GoatBot;
        const { log } = global.utils;

        const scriptType = file.type === 'command' ? 'cmds' : 'events';
        const infoLoad = loadScripts(
          scriptType,
          finalFilename.replace('.js', ''),
          log,
          configCommands,
          api,
          threadModel,
          userModel,
          dashBoardModel,
          globalModel,
          threadsData,
          usersData,
          dashBoardData,
          globalData,
          getLang
        );

        message.unsend(messageID);

        if (infoLoad.status === "success") {
          return message.reply(
            `✅ Successfully replaced and loaded!\n\n` +
            `📁 File: ${finalFilename}\n` +
            `📂 Type: ${file.type}\n` +
            `📝 Name: ${infoLoad.name}\n` +
            `👤 Author: ${file.author}\n` +
            `📅 Added: ${file.uploadDate}\n\n` +
            `The ${file.type} is now active!`
          );
        } else {
          return message.reply(
            `✅ Replaced but failed to load\n\n` +
            `📁 File: ${finalFilename}\n` +
            `❌ Error: ${infoLoad.error.name}: ${infoLoad.error.message}\n\n` +
            `Use !cmd load ${finalFilename.replace('.js', '')} to try loading manually`
          );
        }
      } catch (err) {
        message.unsend(messageID);
        return message.reply(`❌ Installation failed: ${err.message}`);
      }
    }
  },

  onReply: async function({ Reply, message, event, args, api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getLang }) {
    if (Reply.author != event.senderID) {
      return message.reply("❌ This is not for you!");
    }

    const choice = parseInt(event.body.trim());

    try {
      // Handle rename during installation
      if (Reply.type === "installRename") {
        const { file, folder } = Reply.data;
        const newName = event.body.trim();

        if (!newName || newName.length === 0) {
          return message.reply("❌ Please provide a valid name");
        }

        const newFilename = newName.endsWith('.js') ? newName : newName + '.js';
        const newSavePath = path.join(__dirname, folder === 'cmds' ? '.' : `../${folder}`, newFilename);

        // Check if new filename already exists
        if (fs.existsSync(newSavePath)) {
          return message.reply(`❌ File ${newFilename} already exists! Please choose another name.`);
        }

        global.GoatBot.onReply.delete(Reply.messageID);
        await api.unsendMessage(Reply.messageID);

        try {
          // Download the code
          const codeResponse = await axios.get(file.rawUrl);
          let code = codeResponse.data;

          // Update the command/event name in the code
          const nameWithoutExt = newFilename.replace('.js', '');
          code = code.replace(/name:\s*["']([^"']+)["']/g, `name: "${nameWithoutExt}"`);

          // Write the file
          fs.writeFileSync(newSavePath, code);

          // Auto-load the command/event
          const { loadScripts } = global.utils;
          const { configCommands } = global.GoatBot;
          const { log } = global.utils;

          const scriptType = file.type === 'command' ? 'cmds' : 'events';
          const infoLoad = loadScripts(
            scriptType,
            nameWithoutExt,
            log,
            configCommands,
            api,
            threadModel,
            userModel,
            dashBoardModel,
            globalModel,
            threadsData,
            usersData,
            dashBoardData,
            globalData,
            getLang
          );

          if (infoLoad.status === "success") {
            return message.reply(
              `✅ Successfully installed with new name!\n\n` +
              `📁 File: ${newFilename}\n` +
              `📂 Type: ${file.type}\n` +
              `📝 Name: ${nameWithoutExt}\n` +
              `👤 Original Author: ${file.author}\n` +
              `📅 Added: ${file.uploadDate}\n\n` +
              `The ${file.type} is now active!`
            );
          } else {
            return message.reply(
              `✅ Installed but failed to load\n\n` +
              `📁 File: ${newFilename}\n` +
              `❌ Error: ${infoLoad.error.name}: ${infoLoad.error.message}\n\n` +
              `Use !cmd load ${nameWithoutExt} to try loading manually`
            );
          }
        } catch (err) {
          return message.reply(`❌ Installation failed: ${err.message}`);
        }
      }

      if (Reply.stage === 1) {
        // User selected type (1=commands, 2=events, 3=apis)
        if (isNaN(choice) || choice < 1 || choice > 3) {
          return message.reply("❌ Invalid choice. Please reply with 1, 2, or 3");
        }

        const types = ["command", "event", "api"];
        const selectedType = types[choice - 1];

        // Fetch files from API
        const response = await axios.get(`${stbotApi.baseURL}/api/files`);
        const allFiles = response.data.files || [];

        // Filter by type and approved status
        const files = allFiles.filter(f => f.type === selectedType && f.status === 'approved');

        if (files.length === 0) {
          return message.reply(`❌ No ${selectedType}s found in store`);
        }

        // Group by category
        const categories = {};
        files.forEach(file => {
          const category = file.category || 'uncategorized';
          if (!categories[category]) categories[category] = [];
          categories[category].push(file);
        });

        const categoryNames = Object.keys(categories).sort();

        let categoryMessage = `╭─────────────────────◊\n`;
        categoryMessage += `│  📂 ${selectedType.toUpperCase()} CATEGORIES\n`;
        categoryMessage += `├─────────────────────◊\n`;

        categoryNames.forEach((category, index) => {
          const count = categories[category].length;
          categoryMessage += `│ ${index + 1}. ${category.charAt(0).toUpperCase() + category.slice(1)}\n`;
          categoryMessage += `│    └─ ${count} ${selectedType}${count > 1 ? 's' : ''}\n`;
        });

        categoryMessage += `├─────────────────────◊\n`;
        categoryMessage += `│ 💡 Reply with category number\n`;
        categoryMessage += `│ 💡 Type 0 to go back\n`;
        categoryMessage += `╰─────────────────────◊\n`;
        categoryMessage += `   Total: ${files.length} ${selectedType}s`;

        global.GoatBot.onReply.delete(Reply.messageID);
        await api.unsendMessage(Reply.messageID);

        const sentMessage = await message.reply(categoryMessage);

        if (sentMessage) {
          global.GoatBot.onReply.set(sentMessage.messageID, {
            commandName: module.exports.config.name,
            messageID: sentMessage.messageID,
            author: event.senderID,
            stage: 2,
            selectedType: selectedType,
            categories: categoryNames,
            categoriesData: categories
          });
        }
      } else if (Reply.stage === 2) {
        // User selected category or go back
        if (choice === 0) {
          const menuMessage = `╭─────────────────────◊\n` +
            `│  📦 COMMAND STORE MENU\n` +
            `├─────────────────────◊\n` +
            `│ 1. Commands\n` +
            `│ 2. Events\n` +
            `│ 3. APIs\n` +
            `├─────────────────────◊\n` +
            `│ 💡 Reply with number to browse\n` +
            `╰─────────────────────◊\n` +
            `        💫 ST Command Store`;

          global.GoatBot.onReply.delete(Reply.messageID);
          await api.unsendMessage(Reply.messageID);

          const sentMessage = await message.reply(menuMessage);

          if (sentMessage) {
            global.GoatBot.onReply.set(sentMessage.messageID, {
              commandName: module.exports.config.name,
              messageID: sentMessage.messageID,
              author: event.senderID,
              stage: 1
            });
          }
          return;
        }

        if (isNaN(choice) || choice < 1 || choice > Reply.categories.length) {
          return message.reply(`❌ Invalid choice. Please reply with a number between 1 and ${Reply.categories.length}, or 0 to go back`);
        }

        const selectedCategory = Reply.categories[choice - 1];
        const files = Reply.categoriesData[selectedCategory].sort((a, b) => a.filename.localeCompare(b.filename));

        let filesMessage = `╭─────────────────────◊\n`;
        filesMessage += `│  📁 ${selectedCategory.toUpperCase()} ${Reply.selectedType.toUpperCase()}S\n`;
        filesMessage += `├─────────────────────◊\n`;

        files.forEach((file, index) => {
          filesMessage += `│ ${index + 1}. ${file.filename}\n`;
          filesMessage += `│    👤 ${file.author}\n`;
          filesMessage += `│    📅 ${file.uploadDate}\n`;
        });

        filesMessage += `├─────────────────────◊\n`;
        filesMessage += `│ 💡 Reply with number to:\n`;
        filesMessage += `│    - View details\n`;
        filesMessage += `│    - Add "add <number>" to install\n`;
        filesMessage += `│    - Add "url <number>" for raw URL\n`;
        filesMessage += `│ 💡 Type 0 to go back\n`;
        filesMessage += `╰─────────────────────◊\n`;
        filesMessage += `   Total: ${files.length} ${Reply.selectedType}s`;

        global.GoatBot.onReply.delete(Reply.messageID);
        await api.unsendMessage(Reply.messageID);

        const sentMessage = await message.reply(filesMessage);

        if (sentMessage) {
          global.GoatBot.onReply.set(sentMessage.messageID, {
            commandName: module.exports.config.name,
            messageID: sentMessage.messageID,
            author: event.senderID,
            stage: 3,
            selectedType: Reply.selectedType,
            selectedCategory: selectedCategory,
            files: files,
            parentCategories: Reply.categories,
            parentCategoriesData: Reply.categoriesData
          });
        }
      } else if (Reply.stage === 3) {
        // User selected file or action
        const input = event.body.trim().toLowerCase();

        if (input === '0') {
          // Go back to categories
          const categoryNames = Reply.parentCategories;
          const categories = Reply.parentCategoriesData;

          let categoryMessage = `╭─────────────────────◊\n`;
          categoryMessage += `│  📂 ${Reply.selectedType.toUpperCase()} CATEGORIES\n`;
          categoryMessage += `├─────────────────────◊\n`;

          categoryNames.forEach((category, index) => {
            const count = categories[category].length;
            categoryMessage += `│ ${index + 1}. ${category.charAt(0).toUpperCase() + category.slice(1)}\n`;
            categoryMessage += `│    └─ ${count} ${Reply.selectedType}${count > 1 ? 's' : ''}\n`;
          });

          categoryMessage += `├─────────────────────◊\n`;
          categoryMessage += `│ 💡 Reply with category number\n`;
          categoryMessage += `│ 💡 Type 0 to go back\n`;
          categoryMessage += `╰─────────────────────◊\n`;

          global.GoatBot.onReply.delete(Reply.messageID);
          await api.unsendMessage(Reply.messageID);

          const sentMessage = await message.reply(categoryMessage);

          if (sentMessage) {
            global.GoatBot.onReply.set(sentMessage.messageID, {
              commandName: module.exports.config.name,
              messageID: sentMessage.messageID,
              author: event.senderID,
              stage: 2,
              selectedType: Reply.selectedType,
              categories: categoryNames,
              categoriesData: categories
            });
          }
          return;
        }

        // Handle "add <number>" command
        if (input.startsWith('add ')) {
          const fileIndex = parseInt(input.split(' ')[1]) - 1;

          if (isNaN(fileIndex) || fileIndex < 0 || fileIndex >= Reply.files.length) {
            return message.reply(`❌ Invalid file number`);
          }

          const file = Reply.files[fileIndex];

          global.GoatBot.onReply.delete(Reply.messageID);
          await api.unsendMessage(Reply.messageID);

          const folder = file.type === 'command' ? 'cmds' : file.type === 'event' ? 'events' : 'api';
          const finalFilename = file.filename.endsWith('.js') ? file.filename : file.filename + '.js';
          const savePath = path.join(__dirname, folder === 'cmds' ? '.' : `../${folder}`, finalFilename);

          // Check if file already exists
          if (fs.existsSync(savePath)) {
            const existingFile = require(savePath);
            const existingName = existingFile?.config?.name || finalFilename.replace('.js', '');

            return message.reply(
              `⚠️ ${file.type === 'command' ? 'Command' : file.type === 'event' ? 'Event' : 'API'} file already exists!\n\n` +
              `📁 File: ${finalFilename}\n` +
              `📝 Name: ${existingName}\n\n` +
              `React to this message to replace it\n` +
              `OR\n` +
              `Reply with a new name to install with different name`,
              (err, info) => {
                global.GoatBot.onReaction.set(info.messageID, {
                  commandName: module.exports.config.name,
                  messageID: info.messageID,
                  author: event.senderID,
                  type: "installReplace",
                  data: {
                    file: file,
                    savePath: savePath,
                    finalFilename: finalFilename,
                    folder: folder
                  }
                });

                global.GoatBot.onReply.set(info.messageID, {
                  commandName: module.exports.config.name,
                  messageID: info.messageID,
                  author: event.senderID,
                  type: "installRename",
                  data: {
                    file: file,
                    folder: folder
                  }
                });
              }
            );
          }

          // Download and install
          try {
            const codeResponse = await axios.get(file.rawUrl);
            const code = codeResponse.data;

            fs.writeFileSync(savePath, code);

            // Auto-load the command/event
            const { loadScripts } = global.utils;
            const { configCommands } = global.GoatBot;
            const { log } = global.utils;

            const scriptType = file.type === 'command' ? 'cmds' : 'events';
            const infoLoad = loadScripts(
              scriptType,
              finalFilename.replace('.js', ''),
              log,
              configCommands,
              api,
              threadModel,
              userModel,
              dashBoardModel,
              globalModel,
              threadsData,
              usersData,
              dashBoardData,
              globalData,
              getLang
            );

            if (infoLoad.status === "success") {
              return message.reply(
                `✅ Successfully installed and loaded!\n\n` +
                `📁 File: ${finalFilename}\n` +
                `📂 Type: ${file.type}\n` +
                `📝 Name: ${infoLoad.name}\n` +
                `👤 Author: ${file.author}\n` +
                `📅 Added: ${file.uploadDate}\n\n` +
                `The ${file.type} is now active!`
              );
            } else {
              return message.reply(
                `✅ Installed but failed to load\n\n` +
                `📁 File: ${finalFilename}\n` +
                `❌ Error: ${infoLoad.error.name}: ${infoLoad.error.message}\n\n` +
                `Use !cmd load ${finalFilename.replace('.js', '')} to try loading manually`
              );
            }
          } catch (err) {
            return message.reply(`❌ Installation failed: ${err.message}`);
          }
        }

        // Handle "url <number>" command
        if (input.startsWith('url ')) {
          const fileIndex = parseInt(input.split(' ')[1]) - 1;

          if (isNaN(fileIndex) || fileIndex < 0 || fileIndex >= Reply.files.length) {
            return message.reply(`❌ Invalid file number`);
          }

          const file = Reply.files[fileIndex];

          global.GoatBot.onReply.delete(Reply.messageID);
          await api.unsendMessage(Reply.messageID);

          return message.reply(
            `📁 File: ${file.filename}\n` +
            `🔗 Raw URL:\n${file.rawUrl}`
          );
        }

        // Show file details
        if (!isNaN(choice) && choice >= 1 && choice <= Reply.files.length) {
          const file = Reply.files[choice - 1];

          global.GoatBot.onReply.delete(Reply.messageID);
          await api.unsendMessage(Reply.messageID);

          return message.reply(
            `╭─────────────────────◊\n` +
            `│  📄 FILE DETAILS\n` +
            `├─────────────────────◊\n` +
            `│ 📁 Name: ${file.filename}\n` +
            `│ 📂 Type: ${file.type}\n` +
            `│ 📂 Category: ${file.category}\n` +
            `│ 👤 Author: ${file.author}\n` +
            `│ 📅 Upload Date: ${file.uploadDate}\n` +
            `│ ✅ Status: ${file.status}\n` +
            `├─────────────────────◊\n` +
            `│ 🔗 Raw URL:\n` +
            `│ ${file.rawUrl}\n` +
            `╰─────────────────────◊\n` +
            `\n💡 Use "!cs ${file.filename}" to install`
          );
        }

        return message.reply(`❌ Invalid input. Reply with:\n- Number for details\n- "add <number>" to install\n- "url <number>" for URL\n- 0 to go back`);
      }
    } catch (err) {
      console.error('CS Command error:', err);
      message.reply(`❌ Error: ${err.message}`);
    }
  }
};