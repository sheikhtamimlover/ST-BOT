const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

const stbotApi = new global.utils.STBotApis();

module.exports = {
  config: {
    name: "stai",
    version: "2.4.74",
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



    async function callSTAI(prompt, userId, largeGeneration = false) {
      try {
        const response = await axios.post(`${stbotApi.baseURL}/chat`, {
          prompt: prompt,
          userId: userId,
          largeGeneration: largeGeneration || prompt.length > 1000
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
        await axios.post(`${stbotApi.baseURL}/clear`, {
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
        "👋 Hi! I'm ST AI Enhanced, created by Sheikh Tamim for ST BOT project.\n\n" +
        "💬 Chat: !stai <question>\n" +
        "🔧 Create Command: !stai -c <description>\n" +
        "🔧 Fix Command: !stai -c <filename> <issue>\n" +
        "🔧 Fix Multiple: !stai -c <file1> <file2> <issue>\n" +
        "⚡ Create Event: !stai -e <description>\n" +
        "⚡ Fix Event: !stai -e <filename> <issue>\n" +
        "⚡ Fix Multiple Events: !stai -e <file1> <file2> <issue>\n" +
        "🗑️ Clear: !stai clear\n\n" +
        "✨ NEW FEATURES:\n" +
        "• Multi-generation: Create multiple cmds/events at once\n" +
        "• Multi-fix: Fix multiple files in one request\n" +
        "• Large code: No size limits on generation\n" +
        "• Proper events: Correct event structure\n\n" +
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
        // Check for multiple files
        const fileArgs = [];
        let issueStartIndex = 1;

        for (let i = 1; i < args.length; i++) {
          const possibleFile = args[i].endsWith('.js') ? args[i] : `${args[i]}.js`;
          const filePath = path.join(process.cwd(), "scripts/cmds", possibleFile);

          if (fs.existsSync(filePath)) {
            fileArgs.push(possibleFile);
            issueStartIndex = i + 1;
          } else {
            break;
          }
        }

        const issue = args.slice(issueStartIndex).join(" ") || "review and fix any issues";

        if (fileArgs.length === 0) {
          return message.reply(`❌ No valid command files found`);
        }

        // Handle multiple files
        if (fileArgs.length > 1) {
          const processingMsg = await message.reply(`🔧 ST AI is analyzing and fixing ${fileArgs.length} commands...\n⏳ This may take a moment...`);

          try {
            let combinedPrompt = `Fix these ${fileArgs.length} command files. Provide each fixed file separated by ##SEPARATOR##\n\nISSUE: ${issue}\n\n`;

            for (const fileName of fileArgs) {
              const filePath = path.join(process.cwd(), "scripts/cmds", fileName);
              const fileContent = fs.readFileSync(filePath, "utf8");
              combinedPrompt += `\n---FILE: ${fileName}---\n${fileContent}\n`;
            }

            combinedPrompt += "\n\nProvide the complete fixed code for each file. Start each file with '##FILE:filename.js##' followed by the code, then end with '##ENDFILE##'. Format:\n##FILE:filename.js##\ncode here\n##ENDFILE##\n##FILE:nextfile.js##\ncode here\n##ENDFILE##";

            const response = await callSTAI(combinedPrompt, senderID, true);

            // Parse response for multiple files - try all methods
            let successCount = 0;
            let failCount = 0;
            const results = [];
            const processedFiles = new Map(); // Track which files we've processed

            // Method 1: Try ##FILE:filename.js##...##ENDFILE## markers first
            const fileMatches = response.match(/##FILE:([^#]+)##([\s\S]+?)##ENDFILE##/g);

            if (fileMatches && fileMatches.length > 0) {
              for (const fileMatch of fileMatches) {
                const fileNameMatch = fileMatch.match(/##FILE:([^#]+)##/);
                const codeMatch = fileMatch.match(/##FILE:[^#]+##\s*([\s\S]+?)\s*##ENDFILE##/);

                if (!fileNameMatch || !codeMatch) continue;

                const fileName = fileNameMatch[1].trim();
                let fixedCode = codeMatch[1].trim();

                // Remove code blocks if present
                const jsCodeMatch = fixedCode.match(/```(?:javascript|js)?\n([\s\S]+?)```/);
                if (jsCodeMatch) {
                  fixedCode = jsCodeMatch[1].trim();
                }

                const filePath = path.join(process.cwd(), "scripts/cmds", fileName);
                processedFiles.set(fileName, fixedCode);

                try {
                  fs.writeFileSync(filePath, fixedCode);

                  const { loadScripts } = global.utils;
                  const commandName = fileName.replace('.js', '');
                  const { configCommands } = global.GoatBot;

                  const result = loadScripts('cmds', commandName, global.utils.log, configCommands, api,
                    global.threadModel, global.userModel, global.dashBoardModel, global.globalModel,
                    global.threadsData, global.usersData, global.dashBoardData, global.globalData, getLang);

                  if (result.status === "success") {
                    results.push(`✅ ${fileName}`);
                    successCount++;
                  } else {
                    results.push(`⚠️ ${fileName} (saved, reload manually)`);
                    successCount++;
                  }
                } catch (err) {
                  results.push(`❌ ${fileName}: ${err.message}`);
                  failCount++;
                }
              }
            }

            // Method 2: Try to extract code blocks for each file in order
            if (processedFiles.size === 0) {
              const codeBlocks = [];
              const blockRegex = /```(?:javascript|js)?\n([\s\S]+?)```/g;
              let match;
              while ((match = blockRegex.exec(response)) !== null) {
                codeBlocks.push(match[1].trim());
              }

              // If we have enough code blocks for all files, use them
              if (codeBlocks.length >= fileArgs.length) {
                for (let i = 0; i < fileArgs.length; i++) {
                  const fileName = fileArgs[i];
                  const fixedCode = codeBlocks[i];
                  const filePath = path.join(process.cwd(), "scripts/cmds", fileName);

                  try {
                    fs.writeFileSync(filePath, fixedCode);

                    const { loadScripts } = global.utils;
                    const commandName = fileName.replace('.js', '');
                    const { configCommands } = global.GoatBot;

                    const result = loadScripts('cmds', commandName, global.utils.log, configCommands, api,
                      global.threadModel, global.userModel, global.dashBoardModel, global.globalModel,
                      global.threadsData, global.usersData, global.dashBoardData, global.globalData, getLang);

                    if (result.status === "success") {
                      results.push(`✅ ${fileName}`);
                      successCount++;
                    } else {
                      results.push(`⚠️ ${fileName} (saved, reload manually)`);
                      successCount++;
                    }
                  } catch (err) {
                    results.push(`❌ ${fileName}: ${err.message}`);
                    failCount++;
                  }
                }
              }
            }

            message.unsend(processingMsg.messageID);
            message.reply(`🔧 Multi-Fix Complete!\n\n${results.join('\n')}\n\n✅ Success: ${successCount}\n❌ Failed: ${failCount}`);

          } catch (err) {
            message.unsend(processingMsg.messageID);
            return message.reply(`❌ Error: ${err.message}\n\n🆘 Contact @sheikh.tamim_lover`);
          }
        } else {
          // Single file fix (original logic)
          const fileName = fileArgs[0];
          const filePath = path.join(process.cwd(), "scripts/cmds", fileName);

          try {
            const fileContent = fs.readFileSync(filePath, "utf8");
            const prompt = `Fix this command file:\n\nISSUE: ${issue}\n\nCODE:\n${fileContent}\n\nProvide ONLY the complete fixed code, no explanations.`;

            const processingMsg = await message.reply("🔧 ST AI is analyzing and fixing the command...");

            const response = await callSTAI(prompt, senderID, fileContent.length > 2000);

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
        // Check for multiple files
        const fileArgs = [];
        let issueStartIndex = 1;

        for (let i = 1; i < args.length; i++) {
          const possibleFile = args[i].endsWith('.js') ? args[i] : `${args[i]}.js`;
          const filePath = path.join(process.cwd(), "scripts/events", possibleFile);

          if (fs.existsSync(filePath)) {
            fileArgs.push(possibleFile);
            issueStartIndex = i + 1;
          } else {
            break;
          }
        }

        const issue = args.slice(issueStartIndex).join(" ") || "review and fix any issues";

        if (fileArgs.length === 0) {
          return message.reply(`❌ No valid event files found`);
        }

        // Handle multiple files
        if (fileArgs.length > 1) {
          const processingMsg = await message.reply(`🔧 ST AI is analyzing and fixing ${fileArgs.length} events...\n⏳ This may take a moment...`);

          try {
            let combinedPrompt = `Fix these ${fileArgs.length} event files with PROPER event structure. Each event must use the proper structure with onStart returning a function for event types. Provide each fixed file separated by ##SEPARATOR##\n\nISSUE: ${issue}\n\n`;

            for (const fileName of fileArgs) {
              const filePath = path.join(process.cwd(), "scripts/events", fileName);
              const fileContent = fs.readFileSync(filePath, "utf8");
              combinedPrompt += `\n---FILE: ${fileName}---\n${fileContent}\n`;
            }

            combinedPrompt += "\n\nProvide the complete fixed code for each file with PROPER event structure. Start each file with '##FILE:filename.js##' followed by the code, then end with '##ENDFILE##'. Format:\n##FILE:filename.js##\ncode here\n##ENDFILE##\n##FILE:nextfile.js##\ncode here\n##ENDFILE##";

            const response = await callSTAI(combinedPrompt, senderID, true);

            // Parse response for multiple files - try all methods
            let successCount = 0;
            let failCount = 0;
            const results = [];
            const processedFiles = new Map();

            // Method 1: Try ##FILE:filename.js##...##ENDFILE## markers first
            const fileMatches = response.match(/##FILE:([^#]+)##([\s\S]+?)##ENDFILE##/g);

            if (fileMatches && fileMatches.length > 0) {
              for (const fileMatch of fileMatches) {
                const fileNameMatch = fileMatch.match(/##FILE:([^#]+)##/);
                const codeMatch = fileMatch.match(/##FILE:[^#]+##\s*([\s\S]+?)\s*##ENDFILE##/);

                if (!fileNameMatch || !codeMatch) continue;

                const fileName = fileNameMatch[1].trim();
                let fixedCode = codeMatch[1].trim();

                // Remove code blocks if present
                const jsCodeMatch = fixedCode.match(/```(?:javascript|js)?\n([\s\S]+?)```/);
                if (jsCodeMatch) {
                  fixedCode = jsCodeMatch[1].trim();
                }

                const filePath = path.join(process.cwd(), "scripts/events", fileName);
                processedFiles.set(fileName, fixedCode);

                try {
                  fs.writeFileSync(filePath, fixedCode);

                  const { loadScripts } = global.utils;
                  const eventName = fileName.replace('.js', '');
                  const { configCommands } = global.GoatBot;

                  const result = loadScripts('events', eventName, global.utils.log, configCommands, api,
                    global.threadModel, global.userModel, global.dashBoardModel, global.globalModel,
                    global.threadsData, global.usersData, global.dashBoardData, global.globalData, getLang);

                  if (result.status === "success") {
                    results.push(`✅ ${fileName}`);
                    successCount++;
                  } else {
                    results.push(`⚠️ ${fileName} (saved, reload manually)`);
                    successCount++;
                  }
                } catch (err) {
                  results.push(`❌ ${fileName}: ${err.message}`);
                  failCount++;
                }
              }
            }

            // Method 2: Try to extract code blocks for each file in order
            if (processedFiles.size === 0) {
              const codeBlocks = [];
              const blockRegex = /```(?:javascript|js)?\n([\s\S]+?)```/g;
              let match;
              while ((match = blockRegex.exec(response)) !== null) {
                codeBlocks.push(match[1].trim());
              }

              // If we have enough code blocks for all files, use them
              if (codeBlocks.length >= fileArgs.length) {
                for (let i = 0; i < fileArgs.length; i++) {
                  const fileName = fileArgs[i];
                  const fixedCode = codeBlocks[i];
                  const filePath = path.join(process.cwd(), "scripts/events", fileName);

                  try {
                    fs.writeFileSync(filePath, fixedCode);

                    const { loadScripts } = global.utils;
                    const eventName = fileName.replace('.js', '');
                    const { configCommands } = global.GoatBot;

                    const result = loadScripts('events', eventName, global.utils.log, configCommands, api,
                      global.threadModel, global.userModel, global.dashBoardModel, global.globalModel,
                      global.threadsData, global.usersData, global.dashBoardData, global.globalData, getLang);

                    if (result.status === "success") {
                      results.push(`✅ ${fileName}`);
                      successCount++;
                    } else {
                      results.push(`⚠️ ${fileName} (saved, reload manually)`);
                      successCount++;
                    }
                  } catch (err) {
                    results.push(`❌ ${fileName}: ${err.message}`);
                    failCount++;
                  }
                }
              }
            }

            message.unsend(processingMsg.messageID);
            message.reply(`🔧 Multi-Fix Complete!\n\n${results.join('\n')}\n\n✅ Success: ${successCount}\n❌ Failed: ${failCount}`);

          } catch (err) {
            message.unsend(processingMsg.messageID);
            return message.reply(`❌ Error: ${err.message}\n\n🆘 Contact @sheikh.tamim_lover`);
          }
        } else {
          // Single file fix with proper event structure
          const fileName = fileArgs[0];
          const eventPath = path.join(process.cwd(), "scripts/events", fileName);

          try {
            const fileContent = fs.readFileSync(eventPath, "utf8");
            const prompt = `Fix this event file with PROPER event structure. Events must use onStart that returns a function for event types like log:subscribe, log:unsubscribe, etc.\n\nISSUE: ${issue}\n\nCODE:\n${fileContent}\n\nProvide ONLY the complete fixed code with proper event structure, no explanations.`;

            const processingMsg = await message.reply("🔧 ST AI is analyzing and fixing the event...");

            const response = await callSTAI(prompt, senderID, fileContent.length > 2000);

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
        const response = await callSTAI(userInput, senderID, false);
        message.unsend(processingMsg.messageID);

        // Check for multiple command generation
        if (response.includes('##CREATE_COMMAND##') && response.includes('##SEPARATOR##')) {
          const commands = response.split('##SEPARATOR##').filter(cmd => cmd.includes('##CREATE_COMMAND##'));
          const createdCommands = [];
          let counter = 1;

          for (const cmdBlock of commands) {
            const code = cmdBlock.replace('##CREATE_COMMAND##', '').trim();
            let cleanCode = code;
            const codeMatch = code.match(/```(?:javascript|js)?\n([\s\S]+?)```/);
            if (codeMatch) {
              cleanCode = codeMatch[1].trim();
            }

            const nameMatch = cleanCode.match(/name:\s*["']([^"']+)["']/);
            let commandName = nameMatch ? nameMatch[1] : `stai_cmd_${Date.now()}`;
            let filePath = path.join(process.cwd(), "scripts/cmds", `${commandName}.js`);

            // Auto-rename if file exists
            while (fs.existsSync(filePath)) {
              commandName = `${nameMatch ? nameMatch[1] : 'stai_cmd'}_${counter}`;
              cleanCode = cleanCode.replace(/name:\s*["']([^"']+)["']/, `name: "${commandName}"`);
              filePath = path.join(process.cwd(), "scripts/cmds", `${commandName}.js`);
              counter++;
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
                createdCommands.push(`✅ ${commandName}.js\n   ${guide}`);
              } else {
                createdCommands.push(`⚠️ ${commandName}.js (saved, use !cmd load ${commandName})`);
              }
            } catch (loadErr) {
              createdCommands.push(`⚠️ ${commandName}.js (saved, use !cmd load ${commandName})`);
            }
          }

          return message.reply(`✨ Multi-Command Generation Complete!\n\n${createdCommands.join('\n\n')}\n\n📊 Total: ${createdCommands.length} commands\n━━━━━━━━━━━━━━━\nMade by Sheikh Tamim`);
        }

        // Check for single command generation
        if (response.includes('##CREATE_COMMAND##') && !response.includes('##SEPARATOR##')) {
          const code = response.replace('##CREATE_COMMAND##', '').trim();
          let cleanCode = code;
          const codeMatch = code.match(/```(?:javascript|js)?\n([\s\S]+?)```/);
          if (codeMatch) {
            cleanCode = codeMatch[1].trim();
          }

          const nameMatch = cleanCode.match(/name:\s*["']([^"']+)["']/);
          let commandName = nameMatch ? nameMatch[1] : `stai_cmd_${Date.now()}`;
          let filePath = path.join(process.cwd(), "scripts/cmds", `${commandName}.js`);
          let counter = 1;

          // Auto-rename if file exists
          while (fs.existsSync(filePath)) {
            commandName = `${nameMatch ? nameMatch[1] : 'stai_cmd'}_${counter}`;
            cleanCode = cleanCode.replace(/name:\s*["']([^"']+)["']/, `name: "${commandName}"`);
            filePath = path.join(process.cwd(), "scripts/cmds", `${commandName}.js`);
            counter++;
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
              return message.reply(`✅ Command created successfully!\n\n📝 Name: ${commandName}.js\n📖 Usage:\n${guide}\n\n━━━━━━━━━━━━━━━\nMade by Sheikh Tamim`);
            } else {
              return message.reply(`✅ Command saved: ${commandName}.js\n⚠️ Load failed: ${result.error?.message}\n\n💡 Use: !cmd load ${commandName}`);
            }
          } catch (loadErr) {
            return message.reply(`✅ Command saved: ${commandName}.js\n\n💡 Use: !cmd load ${commandName}`);
          }
        }

        // Check for multiple event generation
        if (response.includes('##CREATE_EVENT##') && response.includes('##SEPARATOR##')) {
          const events = response.split('##SEPARATOR##').filter(evt => evt.includes('##CREATE_EVENT##'));
          const createdEvents = [];

          for (const evtBlock of events) {
            const code = evtBlock.replace('##CREATE_EVENT##', '').trim();
            let cleanCode = code;
            const codeMatch = code.match(/```(?:javascript|js)?\n([\s\S]+?)```/);
            if (codeMatch) {
              cleanCode = codeMatch[1].trim();
            }

            const nameMatch = cleanCode.match(/name:\s*["']([^"']+)["']/);
            const eventName = nameMatch ? nameMatch[1] : `stai_event_${Date.now()}`;

            const filePath = path.join(process.cwd(), "scripts/events", `${eventName}.js`);

            if (fs.existsSync(filePath)) {
              createdEvents.push(`⚠️ ${eventName} (already exists)`);
              continue;
            }

            fs.writeFileSync(filePath, cleanCode);

            try {
              const { loadScripts } = global.utils;
              const { configCommands } = global.GoatBot;
              const result = loadScripts('events', eventName, global.utils.log, configCommands, api,
                global.threadModel, global.userModel, global.dashBoardModel, global.globalModel,
                global.threadsData, global.usersData, global.dashBoardData, global.globalData, getLang);

              if (result.status === "success") {
                createdEvents.push(`✅ ${eventName}.js`);
              } else {
                createdEvents.push(`⚠️ ${eventName}.js (saved, reload manually)`);
              }
            } catch (loadErr) {
              createdEvents.push(`⚠️ ${eventName}.js (saved, reload manually)`);
            }
          }

          return message.reply(`✨ Multi-Event Generation Complete!\n\n${createdEvents.join('\n')}\n\n📊 Total: ${createdEvents.length} events\n━━━━━━━━━━━━━━━\nMade by Sheikh Tamim`);
        }

        // Check for single event generation
        if (response.includes('##CREATE_EVENT##') && !response.includes('##SEPARATOR##')) {
          const code = response.replace('##CREATE_EVENT##', '').trim();
          let cleanCode = code;
          const codeMatch = code.match(/```(?:javascript|js)?\n([\s\S]+?)```/);
          if (codeMatch) {
            cleanCode = codeMatch[1].trim();
          }

          const nameMatch = cleanCode.match(/name:\s*["']([^"']+)["']/);
          let eventName = nameMatch ? nameMatch[1] : `stai_event_${Date.now()}`;
          let filePath = path.join(process.cwd(), "scripts/events", `${eventName}.js`);
          let counter = 1;

          // Auto-rename if file exists
          while (fs.existsSync(filePath)) {
            eventName = `${nameMatch ? nameMatch[1] : 'stai_event'}_${counter}`;
            cleanCode = cleanCode.replace(/name:\s*["']([^"']+)["']/, `name: "${eventName}"`);
            filePath = path.join(process.cwd(), "scripts/events", `${eventName}.js`);
            counter++;
          }

          fs.writeFileSync(filePath, cleanCode);

          try {
            const { loadScripts } = global.utils;
            const { configCommands } = global.GoatBot;
            const result = loadScripts('events', eventName, global.utils.log, configCommands, api,
              global.threadModel, global.userModel, global.dashBoardModel, global.globalModel,
              global.threadsData, global.usersData, global.dashBoardData, global.globalData, getLang);

            if (result.status === "success") {
              return message.reply(`✅ Event created successfully!\n\n📝 Name: ${eventName}.js\n\n━━━━━━━━━━━━━━━\nMade by Sheikh Tamim`);
            } else {
              return message.reply(`✅ Event saved: ${eventName}.js\n⚠️ Load failed: ${result.error?.message}\n\n💡 Use: !event load ${eventName}`);
            }
          } catch (loadErr) {
            return message.reply(`✅ Event saved: ${eventName}.js\n\n💡 Use: !event load ${eventName}`);
          }
        }

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
      const response = await axios.post(`${stbotApi.baseURL}/chat`, {
        prompt: userInput,
        userId: event.senderID
      }, {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": stbotApi.chatApiKey
        }
      });

      const aiResponse = response.data.data.response;


      // Check for multiple command generation in onReply
      if (aiResponse.includes('##CREATE_COMMAND##') && aiResponse.includes('##SEPARATOR##')) {
        const commands = aiResponse.split('##SEPARATOR##').filter(cmd => cmd.includes('##CREATE_COMMAND##'));
        const createdCommands = [];

        for (const cmdBlock of commands) {
          const code = cmdBlock.replace('##CREATE_COMMAND##', '').trim();
          let cleanCode = code;
          const codeMatch = code.match(/```(?:javascript|js)?\n([\s\S]+?)```/);
          if (codeMatch) {
            cleanCode = codeMatch[1].trim();
          }

          const nameMatch = cleanCode.match(/name:\s*["']([^"']+)["']/);
          const commandName = nameMatch ? nameMatch[1] : `stai_${Date.now()}`;

          const filePath = path.join(process.cwd(), "scripts/cmds", `${commandName}.js`);

          if (fs.existsSync(filePath)) {
            createdCommands.push(`⚠️ ${commandName} (already exists)`);
            continue;
          }

          fs.writeFileSync(filePath, cleanCode);

          try {
            const { loadScripts } = global.utils;
            const { configCommands } = global.GoatBot;
            const result = loadScripts('cmds', commandName, global.utils.log, configCommands, api,
              global.threadModel, global.userModel, global.dashBoardModel, global.globalModel,
              global.threadsData, global.usersData, global.dashBoardData, global.globalData, getLang);

            if (result.status === "success") {
              createdCommands.push(`✅ ${commandName}.js`);
            } else {
              createdCommands.push(`⚠️ ${commandName}.js (saved, reload manually)`);
            }
          } catch (loadErr) {
            createdCommands.push(`⚠️ ${commandName}.js (saved, reload manually)`);
          }
        }

        return message.reply(`✨ Multi-Command Generation Complete!\n\n${createdCommands.join('\n')}\n\n📊 Total: ${createdCommands.length} commands\n━━━━━━━━━━━━━━━\nMade by Sheikh Tamim`);
      }

      // Check for multiple event generation in onReply
      if (aiResponse.includes('##CREATE_EVENT##') && aiResponse.includes('##SEPARATOR##')) {
        const events = aiResponse.split('##SEPARATOR##').filter(evt => evt.includes('##CREATE_EVENT##'));
        const createdEvents = [];

        for (const evtBlock of events) {
          const code = evtBlock.replace('##CREATE_EVENT##', '').trim();
          let cleanCode = code;
          const codeMatch = code.match(/```(?:javascript|js)?\n([\s\S]+?)```/);
          if (codeMatch) {
            cleanCode = codeMatch[1].trim();
          }

          const nameMatch = cleanCode.match(/name:\s*["']([^"']+)["']/);
          const eventName = nameMatch ? nameMatch[1] : `stai_event_${Date.now()}`;

          const filePath = path.join(process.cwd(), "scripts/events", `${eventName}.js`);

          if (fs.existsSync(filePath)) {
            createdEvents.push(`⚠️ ${eventName} (already exists)`);
            continue;
          }

          fs.writeFileSync(filePath, cleanCode);

          try {
            const { loadScripts } = global.utils;
            const { configCommands } = global.GoatBot;
            const result = loadScripts('events', eventName, global.utils.log, configCommands, api,
              global.threadModel, global.userModel, global.dashBoardModel, global.globalModel,
              global.threadsData, global.usersData, global.dashBoardData, global.globalData, getLang);

            if (result.status === "success") {
              createdEvents.push(`✅ ${eventName}.js`);
            } else {
              createdEvents.push(`⚠️ ${eventName}.js (saved, reload manually)`);
            }
          } catch (loadErr) {
            createdEvents.push(`⚠️ ${eventName}.js (saved, reload manually)`);
          }
        }

        return message.reply(`✨ Multi-Event Generation Complete!\n\n${createdEvents.join('\n')}\n\n📊 Total: ${createdEvents.length} events\n━━━━━━━━━━━━━━━\nMade by Sheikh Tamim`);
      }

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
    } catch (err) {
      message.reply(
        `❌ ST AI encountered an error.\n\n` +
        `🆘 Sheikh Tamim is updating the system.\n` +
        `📱 Instagram: @sheikh.tamim_lover`
      );
    }
  }
};