
const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const stbotApi = new global.utils.STBotApis();

module.exports = {
  config: {
    name: "stai",
    version: "2.4.69",
    author: "ST | Sheikh Tamim",
    countDown: 5,
    role: 0,
    description: {
      en: "ST AI - Your coding assistant for creating and fixing commands",
      vi: "ST AI - Trợ lý lập trình để tạo và sửa lệnh"
    },
    category: "ai",
    guide: {
      en: "   {pn} <prompt> - Chat with ST AI"
        + "\n   {pn} -c <description> - Create new command"
        + "\n   {pn} -c <filename> <issue> - Fix command file"
        + "\n   {pn} -e <description> - Create new event"
        + "\n   {pn} -e <filename> <issue> - Fix event file"
        + "\n   {pn} clear - Clear conversation history"
        + "\n\nExample:"
        + "\n   {pn} how to use onReply?"
        + "\n   {pn} -c a weather command"
        + "\n   {pn} -c help.js fix pagination error"
        + "\n   {pn} -e welcome message with image",
      vi: "   {pn} <prompt> - Trò chuyện với ST AI"
        + "\n   {pn} -c <mô tả> - Tạo lệnh mới"
        + "\n   {pn} -e <mô tả> - Tạo sự kiện mới"
        + "\n   {pn} clear - Xóa lịch sử trò chuyện"
    }
  },

  ST: async function({ message, args, event, api, getLang }) {
    const { senderID, threadID } = event;


    async function callSTAI(prompt, userId) {
      try {
        const response = await axios.post(`${stbotApi.baseURL}/api/chat`, {
          prompt: prompt,
          userId: userId
        }, {
          headers: {
            "Content-Type": "application/json",
            "x-api-key": stbotApi.chatApiKey
          }
        });
        return response.data.data.response;
      } catch (err) {
        throw new Error(`ST AI API Error: ${err.response?.data?.error || err.message}`);
      }
    }


    async function clearHistory(userId) {
      try {
        await axios.post(`${stbotApi.baseURL}/api/clear`, {
          userId: userId
        }, {
          headers: {
            "Content-Type": "application/json",
            "x-api-key": stbotApi.chatApiKey
          }
        });
      } catch (err) {
        throw new Error(`Clear history error: ${err.message}`);
      }
    }

    if (!args[0]) {
      return message.reply(
        "👋 Hi! I'm ST AI, created by Sheikh Tamim for ST BOT project.\n\n" +
        "💬 Chat: !stai <question>\n" +
        "🔧 Create Command: !stai -c <description>\n" +
        "🔧 Fix Command: !stai -c <filename> <issue>\n" +
        "⚡ Create Event: !stai -e <description>\n" +
        "⚡ Fix Event: !stai -e <filename> <issue>\n" +
        "🗑️ Clear: !stai clear\n\n" +
        "📱 Owner: @sheikh.tamim_lover (Instagram)"
      );
    }


    if (args[0].toLowerCase() === "clear") {
      try {
        await clearHistory(senderID);
        return message.reply("✅ Conversation history cleared!");
      } catch (err) {
        return message.reply(`❌ ${err.message}`);
      }
    }

  
    if (args[0] === "-c") {
      const input = args.slice(1).join(" ");
      if (!input) {
        return message.reply("⚠️ Usage:\n!stai -c <description> - Create command\n!stai -c <filename> <issue> - Fix command");
      }

      const firstArg = args[1];
      const isFile = firstArg?.endsWith('.js') || fs.existsSync(path.join(process.cwd(), "scripts/cmds", firstArg?.endsWith('.js') ? firstArg : `${firstArg}.js`));

      if (isFile) {
        const fileName = firstArg.endsWith('.js') ? firstArg : `${firstArg}.js`;
        const issue = args.slice(2).join(" ") || "review and fix any issues";
        const filePath = path.join(process.cwd(), "scripts/cmds", fileName);
        
        if (!fs.existsSync(filePath)) {
          return message.reply(`❌ Command file not found: ${fileName}`);
        }

        try {
          const fileContent = fs.readFileSync(filePath, "utf8");
          const prompt = `Fix this command file:\n\nISSUE: ${issue}\n\nCODE:\n${fileContent}\n\nProvide ONLY the complete fixed code, no explanations.`;
          
          const processingMsg = await message.reply("🔧 ST AI is analyzing and fixing the command...");
          
          const response = await callSTAI(prompt, senderID);
          
          let fixedCode = response;
          const codeMatch = response.match(/```(?:javascript|js)?\n([\s\S]+?)```/);
          if (codeMatch) {
            fixedCode = codeMatch[1].trim();
          }

          fs.writeFileSync(filePath, fixedCode);

          const { loadScripts } = global.utils;
          const commandName = fileName.replace('.js', '');
          
          try {
            const { configCommands } = global.GoatBot;
            const result = loadScripts('cmds', commandName, global.utils.log, configCommands, api, 
              global.threadModel, global.userModel, global.dashBoardModel, global.globalModel,
              global.threadsData, global.usersData, global.dashBoardData, global.globalData, getLang);
            
            message.unsend(processingMsg.messageID);
            
            if (result.status === "success") {
              message.reply(`✅ Fixed and reloaded command ${fileName}!`);
            } else {
              message.reply(`✅ Command fixed and saved!\n⚠️ Reload failed: ${result.error?.message}\n\n💡 Use: !cmd load ${commandName}`);
            }
          } catch (loadErr) {
            message.unsend(processingMsg.messageID);
            message.reply(`✅ Command fixed and saved!\n\n💡 Use: !cmd load ${commandName}`);
          }

        } catch (err) {
          return message.reply(`❌ Error: ${err.message}\n\n🆘 Contact @sheikh.tamim_lover`);
        }
      } else {
        const description = input;
        
        try {
          const prompt = `Create a new command based on this description: ${description}\n\nProvide ONLY the complete command code following the project structure. No explanations.`;
          
          const processingMsg = await message.reply("✨ ST AI is creating your command...");
          
          const response = await callSTAI(prompt, senderID);
          
          let code = response;
          const codeMatch = response.match(/```(?:javascript|js)?\n([\s\S]+?)```/);
          if (codeMatch) {
            code = codeMatch[1].trim();
          }

          const nameMatch = code.match(/name:\s*["']([^"']+)["']/);
          const commandName = nameMatch ? nameMatch[1] : `stai_${Date.now()}`;
          
          const filePath = path.join(process.cwd(), "scripts/cmds", `${commandName}.js`);
          
          if (fs.existsSync(filePath)) {
            message.unsend(processingMsg.messageID);
            return message.reply(`⚠️ Command "${commandName}" already exists!`);
          }

          fs.writeFileSync(filePath, code);

          try {
            const { loadScripts } = global.utils;
            const { configCommands } = global.GoatBot;
            const result = loadScripts('cmds', commandName, global.utils.log, configCommands, api,
              global.threadModel, global.userModel, global.dashBoardModel, global.globalModel,
              global.threadsData, global.usersData, global.dashBoardData, global.globalData, getLang);
            
            if (result.status === "success") {
              const guideMatch = code.match(/guide:\s*{[^}]*en:\s*["']([^"']+)["']/);
              const guide = guideMatch ? guideMatch[1].replace(/{pn}/g, '!' + commandName) : `Use: !${commandName}`;
              
              message.unsend(processingMsg.messageID);
              message.reply(`✅ Command created successfully!\n\n📝 Name: ${commandName}.js\n📖 Usage:\n${guide}\n\n━━━━━━━━━━━━━━━\nMade by Sheikh Tamim`);
            } else {
              message.unsend(processingMsg.messageID);
              message.reply(`✅ Command saved: ${commandName}.js\n⚠️ Load failed: ${result.error?.message}\n\n💡 Use: !cmd load ${commandName}`);
            }
          } catch (loadErr) {
            message.unsend(processingMsg.messageID);
            message.reply(`✅ Command saved: ${commandName}.js\n\n💡 Use: !cmd load ${commandName}`);
          }

        } catch (err) {
          return message.reply(`❌ Error: ${err.message}`);
        }
      }
    }

    
    else if (args[0] === "-e") {
      const input = args.slice(1).join(" ");
      if (!input) {
        return message.reply("⚠️ Usage:\n!stai -e <description> - Create event\n!stai -e <filename> <issue> - Fix event");
      }

      const firstArg = args[1];
      const isFile = firstArg?.endsWith('.js') || fs.existsSync(path.join(process.cwd(), "scripts/events", firstArg?.endsWith('.js') ? firstArg : `${firstArg}.js`));

      if (isFile) {
        const fileName = firstArg.endsWith('.js') ? firstArg : `${firstArg}.js`;
        const issue = args.slice(2).join(" ") || "review and fix any issues";
        const eventPath = path.join(process.cwd(), "scripts/events", fileName);
        
        if (!fs.existsSync(eventPath)) {
          return message.reply(`❌ Event file not found: ${fileName}`);
        }

        try {
          const fileContent = fs.readFileSync(eventPath, "utf8");
          const prompt = `Fix this event file:\n\nISSUE: ${issue}\n\nCODE:\n${fileContent}\n\nProvide ONLY the complete fixed code, no explanations.`;
          
          const processingMsg = await message.reply("🔧 ST AI is analyzing and fixing the event...");
          
          const response = await callSTAI(prompt, senderID);
          
          let fixedCode = response;
          const codeMatch = response.match(/```(?:javascript|js)?\n([\s\S]+?)```/);
          if (codeMatch) {
            fixedCode = codeMatch[1].trim();
          }

          fs.writeFileSync(eventPath, fixedCode);

          const { loadScripts } = global.utils;
          const eventName = fileName.replace('.js', '');
          
          try {
            const { configCommands } = global.GoatBot;
            const result = loadScripts('events', eventName, global.utils.log, configCommands, api, 
              global.threadModel, global.userModel, global.dashBoardModel, global.globalModel,
              global.threadsData, global.usersData, global.dashBoardData, global.globalData, getLang);
            
            message.unsend(processingMsg.messageID);
            
            if (result.status === "success") {
              message.reply(`✅ Fixed and reloaded event ${fileName}!`);
            } else {
              message.reply(`✅ Event fixed and saved!\n⚠️ Reload failed: ${result.error?.message}\n\n💡 Use: !event load ${eventName}`);
            }
          } catch (loadErr) {
            message.unsend(processingMsg.messageID);
            message.reply(`✅ Event fixed and saved!\n\n💡 Use: !event load ${eventName}`);
          }

        } catch (err) {
          return message.reply(`❌ Error: ${err.message}`);
        }
      } else {
        const description = input;
        
        try {
          const prompt = `Create a new event based on this description: ${description}\n\nProvide ONLY the complete event code following the project structure. No explanations.`;
          
          const processingMsg = await message.reply("✨ ST AI is creating your event...");
          
          const response = await callSTAI(prompt, senderID);
          
          let code = response;
          const codeMatch = response.match(/```(?:javascript|js)?\n([\s\S]+?)```/);
          if (codeMatch) {
            code = codeMatch[1].trim();
          }

          const nameMatch = code.match(/name:\s*["']([^"']+)["']/);
          const eventName = nameMatch ? nameMatch[1] : `stai_event_${Date.now()}`;
          
          const filePath = path.join(process.cwd(), "scripts/events", `${eventName}.js`);
          
          if (fs.existsSync(filePath)) {
            message.unsend(processingMsg.messageID);
            return message.reply(`⚠️ Event "${eventName}" already exists!`);
          }

          fs.writeFileSync(filePath, code);

          try {
            const { loadScripts } = global.utils;
            const { configCommands } = global.GoatBot;
            const result = loadScripts('events', eventName, global.utils.log, configCommands, api,
              global.threadModel, global.userModel, global.dashBoardModel, global.globalModel,
              global.threadsData, global.usersData, global.dashBoardData, global.globalData, getLang);
            
            if (result.status === "success") {
              message.unsend(processingMsg.messageID);
              message.reply(`✅ Event created successfully!\n\n📝 Name: ${eventName}.js\n\n━━━━━━━━━━━━━━━\nMade by Sheikh Tamim`);
            } else {
              message.unsend(processingMsg.messageID);
              message.reply(`✅ Event saved: ${eventName}.js\n⚠️ Load failed: ${result.error?.message}\n\n💡 Use: !event load ${eventName}`);
            }
          } catch (loadErr) {
            message.unsend(processingMsg.messageID);
            message.reply(`✅ Event saved: ${eventName}.js\n\n💡 Use: !event load ${eventName}`);
          }

        } catch (err) {
          return message.reply(`❌ Error: ${err.message}`);
        }
      }
    }

  
    else {
      const userInput = args.join(" ");
      
      try {
        const processingMsg = await message.reply("🤔 ST AI is thinking...");
        const response = await callSTAI(userInput, senderID);
        message.unsend(processingMsg.messageID);
        

        if (response.includes('##CREATE_COMMAND##')) {
          const code = response.replace('##CREATE_COMMAND##', '').trim();
          let cleanCode = code;
          const codeMatch = code.match(/```(?:javascript|js)?\n([\s\S]+?)```/);
          if (codeMatch) {
            cleanCode = codeMatch[1].trim();
          }

          const nameMatch = cleanCode.match(/name:\s*["']([^"']+)["']/);
          const commandName = nameMatch ? nameMatch[1] : `stai_${Date.now()}`;
          
          const filePath = path.join(process.cwd(), "scripts/cmds", `${commandName}.js`);
          
          if (fs.existsSync(filePath)) {
            return message.reply(`⚠️ Command "${commandName}" already exists!`);
          }

          fs.writeFileSync(filePath, cleanCode);

          try {
            const { loadScripts } = global.utils;
            const { configCommands } = global.GoatBot;
            const result = loadScripts('cmds', commandName, global.utils.log, configCommands, api,
              global.threadModel, global.userModel, global.dashBoardModel, global.globalModel,
              global.threadsData, global.usersData, global.dashBoardData, global.globalData, getLang);
            
            if (result.status === "success") {
              const guideMatch = cleanCode.match(/guide:\s*{[^}]*en:\s*["']([^"']+)["']/);
              const guide = guideMatch ? guideMatch[1].replace(/{pn}/g, '!' + commandName) : `Use: !${commandName}`;
              
              message.reply(`✅ Command created successfully!\n\n📝 Name: ${commandName}.js\n📖 Usage:\n${guide}\n\n━━━━━━━━━━━━━━━\nMade by Sheikh Tamim`);
            } else {
              message.reply(`✅ Command saved: ${commandName}.js\n⚠️ Load failed: ${result.error?.message}\n\n💡 Use: !cmd load ${commandName}`);
            }
          } catch (loadErr) {
            message.reply(`✅ Command saved: ${commandName}.js\n\n💡 Use: !cmd load ${commandName}`);
          }
        }
        else if (response.includes('##CREATE_EVENT##')) {
          const code = response.replace('##CREATE_EVENT##', '').trim();
          let cleanCode = code;
          const codeMatch = code.match(/```(?:javascript|js)?\n([\s\S]+?)```/);
          if (codeMatch) {
            cleanCode = codeMatch[1].trim();
          }

          const nameMatch = cleanCode.match(/name:\s*["']([^"']+)["']/);
          const eventName = nameMatch ? nameMatch[1] : `stai_event_${Date.now()}`;
          
          const filePath = path.join(process.cwd(), "scripts/events", `${eventName}.js`);
          
          if (fs.existsSync(filePath)) {
            return message.reply(`⚠️ Event "${eventName}" already exists!`);
          }

          fs.writeFileSync(filePath, cleanCode);

          try {
            const { loadScripts } = global.utils;
            const { configCommands } = global.GoatBot;
            const result = loadScripts('events', eventName, global.utils.log, configCommands, api,
              global.threadModel, global.userModel, global.dashBoardModel, global.globalModel,
              global.threadsData, global.usersData, global.dashBoardData, global.globalData, getLang);
            
            if (result.status === "success") {
              message.reply(`✅ Event created successfully!\n\n📝 Name: ${eventName}.js\n\n━━━━━━━━━━━━━━━\nMade by Sheikh Tamim`);
            } else {
              message.reply(`✅ Event saved: ${eventName}.js\n⚠️ Load failed: ${result.error?.message}\n\n💡 Use: !event load ${eventName}`);
            }
          } catch (loadErr) {
            message.reply(`✅ Event saved: ${eventName}.js\n\n💡 Use: !event load ${eventName}`);
          }
        }
        else {
          
          message.reply(`💡 ST AI:\n\n${response}\n\n━━━━━━━━━━━━━━━\nMade by Sheikh Tamim\n📱 @sheikh.tamim_lover`, (err, info) => {
            if (!err) {
              global.GoatBot.onReply.set(info.messageID, {
                commandName: "stai",
                messageID: info.messageID,
                author: senderID,
                type: "chat"
              });
            }
          });
        }
      } catch (err) {
        return message.reply(
          `❌ ST AI is currently unavailable.\n\n` +
          `🆘 Owner Sheikh Tamim is updating the system.\n` +
          `📱 Contact: @sheikh.tamim_lover (Instagram)`
        );
      }
    }
  },

  onReply: async function({ Reply, message, event, args, api, getLang }) {
    const { author } = Reply;
    if (author !== event.senderID) return;

    const userInput = args.join(" ");
    
    try {
      const response = await axios.post(`${stbotApi.baseURL}/api/chat`, {
        prompt: userInput,
        userId: event.senderID
      }, {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": stbotApi.chatApiKey
        }
      });
      
      const aiResponse = response.data.data.response;
      
  
      if (aiResponse.includes('##CREATE_COMMAND##')) {
        const code = aiResponse.replace('##CREATE_COMMAND##', '').trim();
        let cleanCode = code;
        const codeMatch = code.match(/```(?:javascript|js)?\n([\s\S]+?)```/);
        if (codeMatch) {
          cleanCode = codeMatch[1].trim();
        }

        const nameMatch = cleanCode.match(/name:\s*["']([^"']+)["']/);
        const commandName = nameMatch ? nameMatch[1] : `stai_${Date.now()}`;
        
        const filePath = path.join(process.cwd(), "scripts/cmds", `${commandName}.js`);
        
        if (fs.existsSync(filePath)) {
          return message.reply(`⚠️ Command "${commandName}" already exists!`);
        }

        fs.writeFileSync(filePath, cleanCode);

        try {
          const { loadScripts } = global.utils;
          const { configCommands } = global.GoatBot;
          const result = loadScripts('cmds', commandName, global.utils.log, configCommands, api,
            global.threadModel, global.userModel, global.dashBoardModel, global.globalModel,
            global.threadsData, global.usersData, global.dashBoardData, global.globalData, getLang);
          
          if (result.status === "success") {
            const guideMatch = cleanCode.match(/guide:\s*{[^}]*en:\s*["']([^"']+)["']/);
            const guide = guideMatch ? guideMatch[1].replace(/{pn}/g, '!' + commandName) : `Use: !${commandName}`;
            
            message.reply(`✅ Command created successfully!\n\n📝 Name: ${commandName}.js\n📖 Usage:\n${guide}\n\n━━━━━━━━━━━━━━━\nMade by Sheikh Tamim`);
          } else {
            message.reply(`✅ Command saved: ${commandName}.js\n⚠️ Load failed: ${result.error?.message}\n\n💡 Use: !cmd load ${commandName}`);
          }
        } catch (loadErr) {
          message.reply(`✅ Command saved: ${commandName}.js\n\n💡 Use: !cmd load ${commandName}`);
        }
      }
      else if (aiResponse.includes('##CREATE_EVENT##')) {
        const code = aiResponse.replace('##CREATE_EVENT##', '').trim();
        let cleanCode = code;
        const codeMatch = code.match(/```(?:javascript|js)?\n([\s\S]+?)```/);
        if (codeMatch) {
          cleanCode = codeMatch[1].trim();
        }

        const nameMatch = cleanCode.match(/name:\s*["']([^"']+)["']/);
        const eventName = nameMatch ? nameMatch[1] : `stai_event_${Date.now()}`;
        
        const filePath = path.join(process.cwd(), "scripts/events", `${eventName}.js`);
        
        if (fs.existsSync(filePath)) {
          return message.reply(`⚠️ Event "${eventName}" already exists!`);
        }

        fs.writeFileSync(filePath, cleanCode);

        try {
          const { loadScripts } = global.utils;
          const { configCommands } = global.GoatBot;
          const result = loadScripts('events', eventName, global.utils.log, configCommands, api,
            global.threadModel, global.userModel, global.dashBoardModel, global.globalModel,
            global.threadsData, global.usersData, global.dashBoardData, global.globalData, getLang);
          
          if (result.status === "success") {
            message.reply(`✅ Event created successfully!\n\n📝 Name: ${eventName}.js\n\n━━━━━━━━━━━━━━━\nMade by Sheikh Tamim`);
          } else {
            message.reply(`✅ Event saved: ${eventName}.js\n⚠️ Load failed: ${result.error?.message}\n\n💡 Use: !event load ${eventName}`);
          }
        } catch (loadErr) {
          message.reply(`✅ Event saved: ${eventName}.js\n\n💡 Use: !event load ${eventName}`);
        }
      }
      else {

        message.reply(`💡 ST AI:\n\n${aiResponse}`, (err, info) => {
          if (!err) {
            global.GoatBot.onReply.set(info.messageID, {
              commandName: "stai",
              messageID: info.messageID,
              author: event.senderID,
              type: "chat"
            });
          }
        });
      }
    } catch (err) {
      message.reply(
        `❌ ST AI encountered an error.\n\n` +
        `🆘 Sheikh Tamim is updating the system.\n` +
        `📱 Instagram: @sheikh.tamim_lover`
      );
    }
  }
};
