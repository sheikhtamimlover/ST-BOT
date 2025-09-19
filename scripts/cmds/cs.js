
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const availableCmdsUrl = "https://raw.githubusercontent.com/Blankid018/D1PT0/main/availableCmds.json"; //DIPTO API
const cmdUrlsJson = "https://raw.githubusercontent.com/Blankid018/D1PT0/main/cmdUrls.json"; //DIPTO API
const ITEMS_PER_PAGE = 20; // YOU CAN CUSTOMIZE BY YOUR OWN PER PAGE HOW MANY OUTPUT DO U WANT ENTER THE NUMBER

module.exports = {
  config: {
    name: "cs",
    aliases: ["cmdstore"],
    author: "ST | Sheikh Tamim",
    role: 2,
    version: "2.4.60",
    description: {
      en: "View, download and install commands from Dipto's store",
    },
    countDown: 3,
    category: "admin",
    guide: {
      en: "{pn} [page number]\nReply options:\n• Just number (1,2,3...) - Get command URL\n• p <number> (p 2) - Change page\n• add <number> (add 3) - Install command",
    },
  },

  ST: async function ({ api, event, args }) {
    try {
      const response = await axios.get(availableCmdsUrl);
      let cmds = response.data.cmdName;

      // Only goat commands, filter out mirai
      cmds = cmds.filter(cmd => cmd.cmd.endsWith("_goat"));

      let page = 1;
      if (args[0] && !isNaN(args[0])) {
        page = parseInt(args[0]);
      }

      const totalPages = Math.ceil(cmds.length / ITEMS_PER_PAGE);
      if (page < 1 || page > totalPages) {
        return api.sendMessage(
          `❌ Invalid page. Please enter between 1 and ${totalPages}.`,
          event.threadID,
          event.messageID
        );
      }

      const startIndex = (page - 1) * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      const cmdsToShow = cmds.slice(startIndex, endIndex);

      let msg = `╭───✦ CMD STORE ✦───╮\n│ Page ${page}/${totalPages} | Total: ${cmds.length} commands\n├────────────────────\n`;
      cmdsToShow.forEach((cmd, i) => {
        msg += `│ ${startIndex + i + 1}. ${cmd.cmd} | ${cmd.update} | ${cmd.author}\n`;
      });
      msg += `├────────────────────\n`;
      msg += `│ 💡 Reply Options:\n`;
      msg += `│ • Number (1,2,3...) - Get URL\n`;
      msg += `│ • p <number> - Change page\n`;
      msg += `│ • add <number> - Install command\n`;
      msg += `╰────────────────────`;

      api.sendMessage(
        msg,
        event.threadID,
        (err, info) => {
          if (err) return console.error(err);
          global.GoatBot.onReply.set(info.messageID, {
            commandName: "cs",
            type: "main_menu",
            author: event.senderID,
            cmds,
            page,
            totalPages,
            messageID: info.messageID
          });
        },
        event.messageID
      );
    } catch (e) {
      console.error(e);
      api.sendMessage("❌ Failed to load command store.", event.threadID, event.messageID);
    }
  },

  onReply: async function ({ api, event, Reply, message, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getLang }) {
    if (Reply.author != event.senderID) {
      return api.sendMessage("❌ This is not for you! 🐸", event.threadID, event.messageID);
    }

    const { loadScripts } = global.utils;
    const { configCommands } = global.GoatBot;
    const userInput = event.body.trim();

    try {
      if (Reply.type === "main_menu") {
        const { cmds, page, totalPages } = Reply;
        const startIndex = (page - 1) * ITEMS_PER_PAGE;
        const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, cmds.length);

        
        if (userInput.toLowerCase().startsWith('p ')) {
          const newPage = parseInt(userInput.split(' ')[1]);
          if (isNaN(newPage) || newPage < 1 || newPage > totalPages) {
            return api.sendMessage(`❌ Invalid page. Please enter between 1 and ${totalPages}.`, event.threadID, event.messageID);
          }

          
          const newStartIndex = (newPage - 1) * ITEMS_PER_PAGE;
          const newEndIndex = newStartIndex + ITEMS_PER_PAGE;
          const newCmdsToShow = cmds.slice(newStartIndex, newEndIndex);

          let msg = `╭───✦ CMD STORE ✦───╮\n│ Page ${newPage}/${totalPages} | Total: ${cmds.length} commands\n├────────────────────\n`;
          newCmdsToShow.forEach((cmd, i) => {
            msg += `│ ${newStartIndex + i + 1}. ${cmd.cmd} | ${cmd.update} | ${cmd.author}\n`;
          });
          msg += `├────────────────────\n`;
          msg += `│ 💡 Reply Options:\n`;
          msg += `│ • Number (1,2,3...) - Get URL\n`;
          msg += `│ • p <number> - Change page\n`;
          msg += `│ • add <number> - Install command\n`;
          msg += `╰────────────────────`;

         
          global.GoatBot.onReply.delete(Reply.messageID);
          try {
            await api.unsendMessage(Reply.messageID);
          } catch (error) {
            console.error('Error unsending message:', error);
          }

          const sentMsg = await api.sendMessage(msg, event.threadID);

          global.GoatBot.onReply.set(sentMsg.messageID, {
            commandName: "cs",
            type: "main_menu",
            author: event.senderID,
            cmds,
            page: newPage,
            totalPages,
            messageID: sentMsg.messageID
          });
          return;
        }

        
        if (userInput.toLowerCase().startsWith('add ')) {
          const cmdNumber = parseInt(userInput.split(' ')[1]);
          if (isNaN(cmdNumber) || cmdNumber < startIndex + 1 || cmdNumber > endIndex) {
            return api.sendMessage(`❌ Reply with add followed by a number between ${startIndex + 1} and ${endIndex}.`, event.threadID, event.messageID);
          }

          const selected = cmds[cmdNumber - 1];
          const response = await axios.get(cmdUrlsJson);
          const cmdUrl = response.data[selected.cmd];

          if (!cmdUrl) {
            return api.sendMessage("❌ Command URL not found.", event.threadID, event.messageID);
          }

          const originalCmdName = selected.cmd;
          const suggestedName = originalCmdName.replace("_goat", "");
          const filePath = path.join(__dirname, `${suggestedName}.js`);

         
          global.GoatBot.onReply.delete(Reply.messageID);
          try {
            await api.unsendMessage(Reply.messageID);
          } catch (error) {
            console.error('Error unsending message:', error);
          }

          if (fs.existsSync(filePath)) {
            const msg = `╭───✦ FILE EXISTS ✦───╮\n│ ⚠️ Command "${suggestedName}" already exists!\n├──────────────────────────\n│ Do you want to replace it?\n│ Reply 'yes' to replace\n│ Reply 'no' to set different name\n╰──────────────────────────`;

            const sentMsg = await api.sendMessage(msg, event.threadID);

            global.GoatBot.onReply.set(sentMsg.messageID, {
              commandName: "cs",
              type: "replace_confirm",
              author: event.senderID,
              messageID: sentMsg.messageID,
              cmdData: selected,
              cmdUrl: cmdUrl,
              suggestedName: suggestedName
            });
          } else {
            await this.performInstall(api, event, null, selected, cmdUrl, suggestedName, loadScripts, configCommands, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getLang, false);
          }
          return;
        }

        
        const cmdNumber = parseInt(userInput);
        if (!isNaN(cmdNumber)) {
          if (cmdNumber < startIndex + 1 || cmdNumber > endIndex) {
            return api.sendMessage(`❌ Reply with a number between ${startIndex + 1} and ${endIndex}.`, event.threadID, event.messageID);
          }

          const selected = cmds[cmdNumber - 1];
          const response = await axios.get(cmdUrlsJson);
          const cmdUrl = response.data[selected.cmd];

          if (!cmdUrl) {
            return api.sendMessage("❌ Command URL not found.", event.threadID, event.messageID);
          }

          
          global.GoatBot.onReply.delete(Reply.messageID);
          try {
            await api.unsendMessage(Reply.messageID);
          } catch (error) {
            console.error('Error unsending message:', error);
          }

          return api.sendMessage(`🔗 ${selected.cmd} URL:\n${cmdUrl}`, event.threadID);
        }

        
        return api.sendMessage("❌ Invalid input. Reply with:\n• Number (1,2,3...) for URL\n• p <number> to change page\n• add <number> to install", event.threadID, event.messageID);

      } else if (Reply.type === "replace_confirm") {
        const userResponse = event.body.toLowerCase().trim();
        const { cmdData, cmdUrl, suggestedName } = Reply;

        if (userResponse === "yes") {
          
          global.GoatBot.onReply.delete(Reply.messageID);
          try {
            await api.unsendMessage(Reply.messageID);
          } catch (error) {
            console.error('Error unsending message:', error);
          }
          
          await this.performInstall(api, event, null, cmdData, cmdUrl, suggestedName, loadScripts, configCommands, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getLang, true);
        } else if (userResponse === "no") {
          
          global.GoatBot.onReply.delete(Reply.messageID);
          try {
            await api.unsendMessage(Reply.messageID);
          } catch (error) {
            console.error('Error unsending message:', error);
          }

          const msg = `╭───✦ CUSTOM NAME ✦───╮\n│ Enter the command name you want:\n│ (without .js extension)\n╰────────────────────────`;

          const sentMsg = await api.sendMessage(msg, event.threadID);

          global.GoatBot.onReply.set(sentMsg.messageID, {
            commandName: "cs",
            type: "custom_name",
            author: event.senderID,
            messageID: sentMsg.messageID,
            cmdData: cmdData,
            cmdUrl: cmdUrl
          });
        } else {
          return api.sendMessage("❌ Please reply with 'yes' or 'no'.", event.threadID, event.messageID);
        }

      } else if (Reply.type === "custom_name") {
        const customName = event.body.trim();
        const { cmdData, cmdUrl } = Reply;

        if (!customName || customName.includes(" ") || customName.includes("/") || customName.includes("\\")) {
          return api.sendMessage("❌ Invalid name. Please enter a valid command name without spaces or special characters.", event.threadID, event.messageID);
        }

        
        global.GoatBot.onReply.delete(Reply.messageID);
        try {
          await api.unsendMessage(Reply.messageID);
        } catch (error) {
          console.error('Error unsending message:', error);
        }

        const filePath = path.join(__dirname, `${customName}.js`);
        if (fs.existsSync(filePath)) {
          const msg = `╭───✦ NAME EXISTS ✦───╮\n│ ⚠️ Command "${customName}" already exists!\n├──────────────────────────\n│ Do you want to replace it?\n│ Reply 'yes' to replace\n│ Reply 'no' to enter different name\n╰──────────────────────────`;

          const sentMsg = await api.sendMessage(msg, event.threadID);

          global.GoatBot.onReply.set(sentMsg.messageID, {
            commandName: "cs",
            type: "replace_confirm",
            author: event.senderID,
            messageID: sentMsg.messageID,
            cmdData: cmdData,
            cmdUrl: cmdUrl,
            suggestedName: customName
          });
        } else {
          await this.performInstall(api, event, null, cmdData, cmdUrl, customName, loadScripts, configCommands, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getLang, false);
        }
      }
    } catch (error) {
      console.error("CS onReply error:", error);
      api.sendMessage("❌ An error occurred while processing your request.", event.threadID, event.messageID);
    }
  },

  async performInstall(api, event, messageID, cmdData, cmdUrl, fileName, loadScripts, configCommands, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getLang, isReplace) {
    try {
      const response = await axios.get(cmdUrl);
      let rawCode = response.data;

      
      const originalCmdName = cmdData.cmd.replace("_goat", "");
      if (fileName !== originalCmdName) {
        
        rawCode = rawCode.replace(
          /name:\s*["']([^"']+)["']/,
          `name: "${fileName}"`
        );
      }

      
      const filePath = path.join(__dirname, `${fileName}.js`);
      fs.writeFileSync(filePath, rawCode);

      const infoLoad = loadScripts("cmds", fileName, console.log, configCommands, api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getLang);

      if (infoLoad.status === "success") {
        const successMsg = `╭───✦ SUCCESS ✦───╮\n│ ✅ Command "${fileName}" ${isReplace ? 'replaced and ' : ''}installed successfully!\n│ 🔄 Command loaded and ready to use\n│ 📁 File: ${fileName}.js\n│ 👤 Author: ${cmdData.author}\n│ 📅 Updated: ${cmdData.update}\n╰──────────────────────`;
        api.sendMessage(successMsg, event.threadID);
      } else {
        const errorMsg = `╭───✦ ERROR ✦───╮\n│ ❌ Failed to install command "${fileName}"\n│ 💥 Error: ${infoLoad.error.message}\n╰────────────────────────`;
        api.sendMessage(errorMsg, event.threadID);
        console.error("Install error:", infoLoad.error);
      }
    } catch (error) {
      const errorMsg = `╭───✦ ERROR ✦───╮\n│ ❌ Failed to download/install command\n│ 💥 Error: ${error.message}\n╰────────────────────────`;
      api.sendMessage(errorMsg, event.threadID);
      console.error("Download/Install error:", error);
    }
  }
};
