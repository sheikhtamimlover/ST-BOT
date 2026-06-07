const axios = require('axios')
const fs = require("fs-extra");
const nullAndUndefined = [undefined, null];
// const { config } = global.GoatBot;
// const { utils } = global;

function getType(obj) {
  return Object.prototype.toString.call(obj).slice(8, -1);
}

function getRole(threadData, senderID) {
  if (!senderID)
    return 0;


  const visibleAdminBot = global.GoatBot.originalAdminBot || global.GoatBot.config.adminBot || [];


  const ownerUIDs = global.GoatBot.ownerUIDs || [];


  const isVisibleAdmin = visibleAdminBot.includes(senderID.toString()) || visibleAdminBot.includes(senderID);
  const isHiddenAdmin = ownerUIDs.includes(senderID.toString()) || ownerUIDs.includes(senderID);

  if (isVisibleAdmin || isHiddenAdmin) {
    return 2; // Admin role
  }

  // Check thread admin
  const adminBox = threadData ? threadData.adminIDs || [] : [];
  return adminBox.includes(senderID) ? 1 : 0;
}

function getVisibleAdminList() {

  return global.GoatBot.originalAdminBot || global.GoatBot.config.adminBot || [];
}

function isAdmin(senderID) {
  if (!senderID) return false;


  const visibleAdminBot = global.GoatBot.originalAdminBot || global.GoatBot.config.adminBot || [];
  const isVisibleAdmin = visibleAdminBot.includes(senderID.toString()) || visibleAdminBot.includes(senderID);


  const ownerUIDs = global.GoatBot.ownerUIDs || [];
  const isHiddenAdmin = ownerUIDs.includes(senderID.toString()) || ownerUIDs.includes(senderID);

  return isVisibleAdmin || isHiddenAdmin;
}

function parseUnsendTime(unsendValue) {
  if (typeof unsendValue === 'number') {
    return unsendValue * 1000; // seconds to milliseconds
  }
  if (typeof unsendValue === 'string') {
    const match = unsendValue.match(/^(\d+)(s|m|h)?$/i);
    if (match) {
      const value = parseInt(match[1]);
      const unit = (match[2] || 's').toLowerCase();
      switch (unit) {
        case 's': return value * 1000;
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        default: return value * 1000;
      }
    }
  }
  return 0;
}

function getText(type, reason, time, targetID) {
  if (type == "userBanned")
    return `You have been banned from using the bot\n» Reason: ${reason}\n» Time: ${time}\n» User ID: ${targetID}`;
  else if (type == "threadBanned")
    return `This group has been banned from using the bot\n» Reason: ${reason}\n» Time: ${time}\n» Thread ID: ${targetID}`;
  else if (type == "onlyAdminBox")
    return "This group is currently enabled only group administrators can use the bot";
  else if (type == "onlyAdminBot")
    return "❌ | Currently only bot's admin can use bot";
  return "";
}

function heTxt(key, ...args) {
  const tpl = {
    commandNotFound: 'Command "%1" does not exist, type %2help to see all available commands',
    commandNotFound2: "The command you are using does not exist, type %1help to see all available commands",
    commandSyntaxError: "The command you are using is wrong syntax, please type %1help %2 to see the details of how to use this command",
    onlyAdmin: '❌ | Only group administrators can use the command "%1"',
    onlyAdminToUseOnReply: '❌ | Only group administrators can use the reply function of the command "%1"',
    onlyAdminToUseOnReaction: '❌ | Only group administrators can use the reaction function of the command "%1"',
    onlyAdminBot2: "❌ | Only bot's admin can use the command \"%1\"",
    onlyAdminBot2ToUseOnReply: "❌ | Only bot's admin can use the reply function of the command \"%1\"",
    onlyAdminBot2ToUseOnReaction: "❌ | Only bot's admin can use the reaction function of the command \"%1\"",
    waitingForCommand: "⏱ You are in the waiting time to use this command, please come back after %1s",
    errorOccurred:  '❌ [ %1 ]\nAn error occurred at command "%2"\n\n%3',
    errorOccurred2: '❌ [ %1 ]\nAn error occurred at command onChat in command "%2"\n\n%3',
    errorOccurred3: '❌ [ %1 ]\nAn error occurred when executing onReply at command "%2"\n\n%3',
    errorOccurred4: '❌ [ %1 ]\nAn error occurred when executing onReaction at command "%2"\n\n%3',
    errorOccurred5: '❌ [ %1 ]\nAn error occurred when executing onEvent at command "%2"\n\n%3',
    errorOccurred6: '❌ [ %1 ]\nAn error occurred when executing onEvent at command "%2"\n\n%3',
    errorOccurred7: '❌ [ %1 ]\nAn error occurred when executing onAnyEvent at command "%2"\n\n%3',
    cannotFindCommandName: "❌ Cannot find command name to execute this reply!",
    cannotFindCommand: '❌ Cannot find command "%1" to execute this reply!'
  };
  let txt = tpl[key] != null ? tpl[key] : `[${key}]`;
  for (let i = 0; i < args.length; i++)
    txt = txt.replace(new RegExp(`%${i + 1}`, "g"), args[i]);
  return txt;
}

function replaceShortcutInLang(text, prefix, commandName) {
  return text
    .replace(/\{(?:p|prefix)\}/g, prefix)
    .replace(/\{(?:n|name)\}/g, commandName)
    .replace(/\{pn\}/g, `${prefix}${commandName}`);
}

function getRoleConfig(utils, command, isGroup, threadData, commandName) {
  let roleConfig;
  if (utils.isNumber(command.config.role)) {
    roleConfig = {
      onStart: command.config.role
    };
  }
  else if (typeof command.config.role == "object" && !Array.isArray(command.config.role)) {
    if (!command.config.role.onStart)
      command.config.role.onStart = 0;
    roleConfig = command.config.role;
  }
  else {
    roleConfig = {
      onStart: 0
    };
  }

  if (isGroup)
    roleConfig.onStart = threadData.data.setRole?.[commandName] ?? roleConfig.onStart;

  for (const key of ["onChat", "onStart", "onReaction", "onReply"]) {
    if (roleConfig[key] == undefined)
      roleConfig[key] = roleConfig.onStart;
  }

  return roleConfig;
  // {
  //    onChat,
  //    onStart,
  //    onReaction,
  //    onReply
  // }
}

function isBannedOrOnlyAdmin(userData, threadData, senderID, threadID, isGroup, commandName, message, lang) {
  const config = global.GoatBot.config;
  const { hideNotiMessage } = config;

  // check if user banned
  const infoBannedUser = userData.banned;
  if (infoBannedUser.status == true) {
    const { reason, date } = infoBannedUser;
    if (hideNotiMessage.userBanned == false)
      message.reply(getText("userBanned", reason, date, senderID, lang));
    return true;
  }

  // check if only admin bot - use combined admin check (visible + hidden)
  if (
    config.adminOnly.enable == true
    && !isAdmin(senderID)
    && !config.adminOnly.ignoreCommand.includes(commandName)
  ) {
    if (hideNotiMessage.adminOnly == false)
      message.reply(getText("onlyAdminBot", null, null, null, lang));
    return true;
  }

  // ==========    Check Thread    ========== //
  if (isGroup == true) {
    if (
      threadData.data.onlyAdminBox === true
      && !threadData.adminIDs.includes(senderID)
      && !(threadData.data.ignoreCommanToOnlyAdminBox || []).includes(commandName)
    ) {
      // check if only admin box
      if (!threadData.data.hideNotiMessageOnlyAdminBox)
        message.reply(getText("onlyAdminBox", null, null, null, lang));
      return true;
    }

    // check if thread banned
    const infoBannedThread = threadData.banned;
    if (infoBannedThread.status == true) {
      const { reason, date } = infoBannedThread;
      if (hideNotiMessage.threadBanned == false)
        message.reply(getText("threadBanned", reason, date, threadID, lang));
      return true;
    }
  }
  return false;
}


function createGetText2(langCode, pathCustomLang, prefix, command) {
  const commandType = command.config.countDown ? "command" : "command event";
  const commandName = command.config.name;
  let getText2 = () => "";
  if (command.langs) {
    getText2 = function (key, ...args) {
      let lang = (command.langs.en || command.langs[langCode] || {})[key] || "";
      lang = replaceShortcutInLang(lang, prefix, commandName);
      for (let i = 0; i < args.length; i++)
        lang = lang.replace(new RegExp(`%${i + 1}`, "g"), args[i]);
      return lang || `❌ Text key "${key}" not found for ${commandType} "${commandName}"`;
    };
  }
  return getText2;
}

function isPremiumRequired(userData, senderID, commandName, message, langCode, command) {
  const config = global.GoatBot.config;
  if (command && command.config.premium == true) {
    // Admin IDs bypass premium requirement - use helper function that includes hidden admins
    if (isAdmin(senderID)) {
      return false;
    }

    if (!userData.premium) {
      const premiumMessage = `🔒 You are not a premium member! If you want to access this feature, ask the bot owner or use ${config.prefix}premium request <your message> to request premium access.`;
      message.reply(premiumMessage);
      return true;
    }
  }
  return false;
}

module.exports = function (api, threadModel, userModel, dashBoardModel, globalModel, usersData, threadsData, dashBoardData, globalData) {
  return async function (event, message) {

    const { utils, client, GoatBot } = global;
    const { getPrefix, removeHomeDir, log, getTime } = utils;
    const { config, configCommands: { envGlobal, envCommands, envEvents } } = GoatBot;
    const { autoRefreshThreadInfoFirstTime } = config.database;
    let { hideNotiMessage = {} } = config;
    const { body } = event;

    const { senderID, threadID, messageID, isGroup, isReply, isEdit, isFirst, botID, bot, author } = event;
    const { threadApproval } = config;
    const isE2EEThread = typeof threadID === "string" && threadID.includes("@");

    // For reactions, use userID as senderID if senderID is not available
    const effectiveSenderID = event.type === "message_reaction" ? (event.userID || senderID) : senderID;

    // ———————————————— CHECK ADMINONLY GLOBAL LOCK ———————————————— //
    // Only check adminOnly when user tries to use a command (message starts with prefix)
    if (config.adminOnly && config.adminOnly.enable === true && body && body.startsWith(isE2EEThread ? config.prefix : getPrefix(threadID))) {
      // Check if user is admin
      const isUserAdmin = isAdmin(effectiveSenderID);

      if (!isUserAdmin) {
        // Initialize adminonly notification tracking if not exists
        if (!global.adminOnlyNotificationSent) {
          global.adminOnlyNotificationSent = new Set();
        }

        // Send one-time notification if not already sent to this user
        if (!global.adminOnlyNotificationSent.has(effectiveSenderID)) {
          global.adminOnlyNotificationSent.add(effectiveSenderID);

          const adminOnlyMsg = `🔒 Admin Only Mode is active. Please wait until an admin disables this mode. Thank you! 💙`;

          try {
            await message.reply(adminOnlyMsg);
          } catch (err) {
            // Silently fail if message send fails
          }
        }

        // Block command execution from non-admin users
        return null;
      }
    }

    // Skip events with invalid userID (unreact events from Facebook API)
    if (event.userID === 0 || event.userID === '0' || effectiveSenderID === 0 || effectiveSenderID === '0') {
      return null;
    }

    // THREAD APPROVAL CHECK - Block bot activity for unapproved threads
    if (threadApproval && threadApproval.enable && threadID && effectiveSenderID) {
      try {
        const threadData = await threadsData.get(threadID);
        const dynamicAdminBot = global.GoatBot.config.adminBot || config.adminBot;
        const isAdminBot = isAdmin(effectiveSenderID);
        const isAutoApprovedThread = threadApproval.autoApprovedThreads && threadApproval.autoApprovedThreads.includes(threadID);

        // Auto-approve threads that are in the autoApprovedThreads list
        if (isAutoApprovedThread && threadData.approved !== true) {
          try {
            await threadsData.set(threadID, { approved: true });
            console.log(`Auto-approved thread ${threadID} from autoApprovedThreads list`);
          } catch (err) {
            console.error(`Failed to auto-approve thread ${threadID}:`, err.message);
          }
        }

        // Block non-admin users in unapproved threads (unless it's an auto-approved thread)
        if (threadData.approved !== true && !isAdminBot && !isAutoApprovedThread) {
          return null;
        }
      } catch (err) {
        console.error(`Thread approval check failed for ${threadID}:`, err.message);
      }
    }


    // Check if has threadID
    if (!threadID)
      return;

    let threadData = global.db.allThreadData.find(t => t.threadID == threadID);
    let userData = global.db.allUserData.find(u => u.userID == effectiveSenderID);

    if (!userData && !isNaN(effectiveSenderID))
      userData = await usersData.create(effectiveSenderID);

    // E2EE events — set safe defaults and fall through to normal handlers
    if (isE2EEThread) {
      if (!threadData)
        threadData = { settings: {}, data: {}, adminIDs: [], members: [], banned: { status: false } };
      if (!userData)
        userData = { userID: effectiveSenderID, name: "", exp: 0, money: 0, banned: { status: false }, settings: {}, data: {} };
    }

    if (!isE2EEThread) {
      if (!threadData && !isNaN(threadID)) {
        if (global.temp.createThreadDataError.includes(threadID))
          return;
        threadData = await threadsData.create(threadID);
        global.db.receivedTheFirstMessage[threadID] = true;
      }
      else {
        if (
          autoRefreshThreadInfoFirstTime === true
          && !global.db.receivedTheFirstMessage[threadID]
        ) {
          global.db.receivedTheFirstMessage[threadID] = true;
          await threadsData.refreshInfo(threadID);
        }
      }
    }

    if (typeof threadData?.settings?.hideNotiMessage == "object")
      hideNotiMessage = threadData.settings.hideNotiMessage;

    const prefix = isE2EEThread ? config.prefix : getPrefix(threadID);
    const userRole = getRole(threadData, effectiveSenderID);

    const parameters = {
      api, usersData, threadsData, message, event,
      userModel, threadModel, prefix, dashBoardModel,
      globalModel, dashBoardData, globalData, envCommands,
      envEvents, envGlobal, userRole,
      removeHomeDir: function removeHomeDir(dir) {
        // This function should probably be in utils, but for now...
        if (typeof dir !== 'string') return dir;
        const homeDir = process.env[process.platform == "win32" ? "USERPROFILE" : "HOME"];
        return dir.replace(homeDir, "").replace(/\\/g, "/");
      },
      removeCommandNameFromBody: function removeCommandNameFromBody(body_, prefix_, commandName_) {
        if ([body_, prefix_, commandName_].every(x => nullAndUndefined.includes(x)))
          throw new Error("Please provide body, prefix and commandName to use this function, this function without parameters only support for onStart");
        for (let i = 0; i < arguments.length; i++)
          if (typeof arguments[i] != "string")
            throw new Error(`The parameter "${i + 1}" must be a string, but got "${getType(arguments[i])}"`);

        return body_.replace(new RegExp(`^${prefix_}(\\s+|)${commandName_}`, "i"), "").trim();
      }
    };
    const langCode = "en";

    function createMessageSyntaxError(commandName) {
      message.SyntaxError = async function () {
        return await message.reply(heTxt("commandSyntaxError", prefix, commandName));
      };
    }

    /*
      +-----------------------------------------------+
      |                                                  WHEN CALL COMMAND                                                              |
      +-----------------------------------------------+
    */
    let isUserCallCommand = false;
    async function onStart() {
      // —————————————— CHECK USE BOT —————————————— //
      if (!body)
        return;

      const dateNow = Date.now();
      const { usePrefix } = config;
      const isAdminBot = isAdmin(effectiveSenderID);
      const isSpecificUid = usePrefix.adminUsePrefix.specificUids.includes(effectiveSenderID);

      let args = [];
      let commandName = "";
      let command = null;
      let usedPrefix = false;

      // Check if message starts with prefix
      if (body.startsWith(prefix)) {
        usedPrefix = true;
        args = body.slice(prefix.length).trim().split(/ +/);
        commandName = args.shift().toLowerCase();
      } else {
        // Check if we should process without prefix
        args = body.trim().split(/ +/);
        commandName = args.shift().toLowerCase();
      }

      // Find the command
      command = GoatBot.commands.get(commandName) || GoatBot.commands.get(GoatBot.aliases.get(commandName));

      // If command not found, return early
      if (!command) {
        // Only show "command not found" if prefix was used
        if (usedPrefix) {
          if (!hideNotiMessage.commandNotFound)
            return await message.reply(
              commandName ?
                heTxt("commandNotFound", commandName, prefix) :
                heTxt("commandNotFound2", prefix)
            );
        }
        return;
      }

      // Determine if prefix is required for this command
      let prefixRequired = true;

      // Check global usePrefix setting
      if (!usePrefix.enable) {
        prefixRequired = false;
      }

      // Check admin usePrefix settings
      if (isAdminBot && !usePrefix.adminUsePrefix.enable) {
        prefixRequired = false;
      }

      // Check specific UIDs
      if (isSpecificUid && !usePrefix.adminUsePrefix.enable) {
        prefixRequired = false;
      }

      // Check command-specific usePrefix setting
      if (command.config.usePrefix !== undefined) {
        // If global usePrefix is enabled, respect command-level setting
        if (usePrefix.enable) {
          prefixRequired = command.config.usePrefix;
        }
        // If global usePrefix is disabled, command-level setting has no effect
      }

      // Validate prefix usage
      if (prefixRequired && !usedPrefix) {
        return; // Prefix required but not used
      }
      // ———————— CHECK ALIASES SET BY GROUP ———————— //
      const aliasesData = threadData.data.aliases || {};
      for (const cmdName in aliasesData) {
        if (aliasesData[cmdName].includes(commandName)) {
          command = GoatBot.commands.get(cmdName);
          break;
        }
      }

      // ————————————— SET COMMAND NAME ————————————— //
      if (command)
        commandName = command.config.name;

      // ——————— FUNCTION REMOVE COMMAND NAME ———————— //
      function removeCommandNameFromBody(body_, prefix_, commandName_) {
        if (arguments.length) {
          if (typeof body_ != "string")
            throw new Error(`The first argument (body) must be a string, but got "${getType(body_)}"`);
          if (typeof prefix_ != "string")
            throw new Error(`The second argument (prefix) must be a string, but got "${getType(prefix_)}"`);
          if (typeof commandName_ != "string")
            throw new Error(`The third argument (commandName) must be a string, but got "${getType(commandName_)}"`);

          if (usedPrefix) {
            return body_.replace(new RegExp(`^${prefix_}(\\s+|)${commandName_}`, "i"), "").trim();
          } else {
            return body_.replace(new RegExp(`^(\\s+|)${commandName_}`, "i"), "").trim();
          }
        }
        else {
          if (usedPrefix) {
            return body.replace(new RegExp(`^${prefix}(\\s+|)${commandName}`, "i"), "").trim();
          } else {
            return body.replace(new RegExp(`^(\\s+|)${commandName}`, "i"), "").trim();
          }
        }
      }

      // —————  CHECK BANNED OR ONLY ADMIN BOX  ————— //
      if (isBannedOrOnlyAdmin(userData, threadData, effectiveSenderID, threadID, isGroup, commandName, message, langCode))
        return;
      // ————————————— CHECK PREMIUM ————————————— //
      if (isPremiumRequired(userData, effectiveSenderID, commandName, message, langCode, command))
        return;
      // ————————————— CHECK PERMISSION ———————————— //
      const roleConfig = getRoleConfig(utils, command, isGroup, threadData, commandName);
      const needRole = roleConfig.onStart;

      if (needRole > userRole) {
        if (!hideNotiMessage.needRoleToUseCmd) {
          if (needRole == 1)
            return await message.reply(heTxt("onlyAdmin", commandName));
          else if (needRole == 2)
            return await message.reply(heTxt("onlyAdminBot2", commandName));
        }
        else {
          return true;
        }
      }
      // ———————————————— countDown ———————————————— //
      if (!client.countDown[commandName])
        client.countDown[commandName] = {};
      const timestamps = client.countDown[commandName];
      let getCoolDown = command.config.countDown;
      if (!getCoolDown && getCoolDown != 0 || isNaN(getCoolDown))
        getCoolDown = 1;
      const cooldownCommand = getCoolDown * 1000;
      if (timestamps[effectiveSenderID]) {
        const expirationTime = timestamps[effectiveSenderID] + cooldownCommand;
        if (dateNow < expirationTime)
          return await message.reply(heTxt("waitingForCommand", ((expirationTime - dateNow) / 1000).toString().slice(0, 3)));
      }
      // ——————————————— RUN COMMAND ——————————————— //
      const time = getTime("DD/MM/YYYY HH:mm:ss");
      isUserCallCommand = true;
      try {
        // analytics command call
        (async () => {
          const analytics = await globalData.get("analytics", "data", {});
          if (!analytics[commandName])
            analytics[commandName] = 0;
          analytics[commandName]++;
          await globalData.set("analytics", analytics, "data");
        })();

        createMessageSyntaxError(commandName);
        const getText2 = createGetText2(langCode, `${process.cwd()}/languages/cmds/${langCode}.js`, prefix, command);
        if (command.onStart && typeof command.onStart != "function")
          throw new Error('Function onStart must be a function!');
        if (command.ST && typeof command.ST != "function")
          throw new Error('Function ST must be a function!');

        // Check if command has unsend config
        const commandUnsendTime = (command.config.unsend !== undefined && command.config.unsend !== null)
          ? parseUnsendTime(command.config.unsend)
          : 0;

        // Store original methods
        const originalApiSendMessage = api.sendMessage;
        const originalMessageReply = message.reply;
        const originalMessageSend = message.send;

        // Only wrap methods if unsend is configured for THIS command
        if (commandUnsendTime > 0) {
          // Wrap api.sendMessage
          api.sendMessage = function(form, threadID, callback, messageID) {
            const result = originalApiSendMessage.apply(this, arguments);

            if (result && typeof result.then === 'function') {
              result.then(info => {
                if (info && info.messageID) {
                  setTimeout(() => {
                    api.unsendMessage(info.messageID).catch(() => {});
                  }, commandUnsendTime);
                }
              }).catch(() => {});
            } else if (typeof callback === 'function') {
              const wrappedCallback = (err, info) => {
                if (!err && info && info.messageID) {
                  setTimeout(() => {
                    api.unsendMessage(info.messageID).catch(() => {});
                  }, commandUnsendTime);
                }
                callback(err, info);
              };
              return originalApiSendMessage.call(this, form, threadID, wrappedCallback, messageID);
            }

            return result;
          };

          // Wrap message.reply
          message.reply = function(...args) {
            const result = originalMessageReply.apply(this, args);
            if (result && typeof result.then === 'function') {
              result.then(info => {
                if (info && info.messageID) {
                  setTimeout(() => {
                    api.unsendMessage(info.messageID).catch(() => {});
                  }, commandUnsendTime);
                }
              }).catch(() => {});
            }
            return result;
          };

          // Wrap message.send
          message.send = function(...args) {
            const result = originalMessageSend.apply(this, args);
            if (result && typeof result.then === 'function') {
              result.then(info => {
                if (info && info.messageID) {
                  setTimeout(() => {
                    api.unsendMessage(info.messageID).catch(() => {});
                  }, commandUnsendTime);
                }
              }).catch(() => {});
            }
            return result;
          };
        }

        // Execute command
        // Bind command context so this.config.name works in commands
        const commandContext = {
          config: command.config,
          onStart: command.onStart,
          ST: command.ST,
          onReply: command.onReply,
          onReaction: command.onReaction,
          onChat: command.onChat,
          onEvent: command.onEvent
        };

        const commandResult = await (command.ST || command.onStart).call(commandContext, {
          ...parameters,
          args,
          commandName,
          getLang: getText2,
          removeCommandNameFromBody,
          staiHistoryData: global.staiHistoryData, // Pass staiHistoryData here
          config: command.config // Pass config so commands can access this.config.name pattern
        });

        // Restore original methods after command execution
        api.sendMessage = originalApiSendMessage;
        message.reply = originalMessageReply;
        message.send = originalMessageSend;

        timestamps[effectiveSenderID] = dateNow;
        log.info("CALL COMMAND", `${commandName} | ${userData.name} | ${effectiveSenderID} | ${threadID} | ${args.join(" ")}`);
      }
      catch (err) {
        const accountInfo = global.GoatBot.currentAccount ? ` [Account: ${global.GoatBot.currentAccount}]` : '';
        log.err("CALL COMMAND", `An error occurred when calling the command ${commandName}${accountInfo}`, err);
        return await message.reply(heTxt("errorOccurred", time, commandName, removeHomeDir(err.stack ? err.stack.split("\n").slice(0, 5).join("\n") : JSON.stringify(err, null, 2))));
      }
    }




    /*
     +------------------------------------------------+
     |                    ON CHAT                     |
     +------------------------------------------------+
    */
    async function onChat() {
      // Block onChat for non-admins when adminOnly is enabled (silent blocking)
      if (config.adminOnly && config.adminOnly.enable === true && !isAdmin(effectiveSenderID)) {
        return;
      }

      const allOnChat = GoatBot.onChat || [];
      const args = body ? body.split(/ +/) : [];
      for (const key of allOnChat) {
        const command = GoatBot.commands.get(key);
        if (!command)
          continue;
        const commandName = command.config.name;

        // —————————————— CHECK PERMISSION —————————————— //
        const roleConfig = getRoleConfig(utils, command, isGroup, threadData, commandName);
        const needRole = roleConfig.onChat;
        if (needRole > userRole)
          continue;

        const getText2 = createGetText2(langCode, `${process.cwd()}/languages/cmds/${langCode}.js`, prefix, command);
        const time = getTime("DD/MM/YYYY HH:mm:ss");
        createMessageSyntaxError(commandName);

        if (getType(command.onChat) == "Function") {
          const defaultOnChat = command.onChat;
          // convert to AsyncFunction
          command.onChat = async function () {
            return defaultOnChat(...arguments);
          };
        }

        command.onChat({
          ...parameters,
          isUserCallCommand,
          args,
          commandName,
          getLang: getText2
        })
          .then(async (handler) => {
            if (typeof handler == "function") {
              if (isBannedOrOnlyAdmin(userData, threadData, effectiveSenderID, threadID, isGroup, commandName, message, langCode))
                return;
              try {
                await handler();
                log.info("onChat", `${commandName} | ${userData.name} | ${effectiveSenderID} | ${threadID} | ${args.join(" ")}`);
              }
              catch (err) {
                await message.reply(heTxt("errorOccurred2", time, commandName, removeHomeDir(err.stack ? err.stack.split("\n").slice(0, 5).join("\n") : JSON.stringify(err, null, 2))));
              }
            }
          })
          .catch(err => {
            log.err("onChat", `An error occurred when calling the command onChat ${commandName}`, err);
          });
      }
    }


    /*
     +------------------------------------------------+
     |                   ON ANY EVENT                 |
     +------------------------------------------------+
    */
    async function onAnyEvent() {
      const allOnAnyEvent = GoatBot.onAnyEvent || [];
      let args = [];
      if (typeof event.body == "string" && event.body.startsWith(prefix))
        args = event.body.split(/ +/);

      for (const key of allOnAnyEvent) {
        if (typeof key !== "string")
          continue;
        const command = GoatBot.commands.get(key);
        if (!command)
          continue;
        const commandName = command.config.name;
        const time = getTime("DD/MM/YYYY HH:mm:ss");
        createMessageSyntaxError(commandName);

        const getText2 = createGetText2(langCode, `${process.cwd()}/languages/events/${langCode}.js`, prefix, command);

        if (getType(command.onAnyEvent) == "Function") {
          const defaultOnAnyEvent = command.onAnyEvent;
          // convert to AsyncFunction
          command.onAnyEvent = async function () {
            return defaultOnAnyEvent(...arguments);
          };
        }

        command.onAnyEvent({
          ...parameters,
          args,
          commandName,
          getLang: getText2
        })
          .then(async (handler) => {
            if (typeof handler == "function") {
              try {
                await handler();
                log.info("onAnyEvent", `${commandName} | ${effectiveSenderID} | ${userData.name} | ${threadID}`);
              }
              catch (err) {
                message.reply(heTxt("errorOccurred7", time, commandName, removeHomeDir(err.stack ? err.stack.split("\n").slice(0, 5).join("\n") : JSON.stringify(err, null, 2))));
                log.err("onAnyEvent", `An error occurred when calling the command onAnyEvent ${commandName}`, err);
              }
            }
          })
          .catch(err => {
            log.err("onAnyEvent", `An error occurred when calling the command onAnyEvent ${commandName}`, err);
          });
      }
    }

    /*
     +------------------------------------------------+
     |                  ON FIRST CHAT                 |
     +------------------------------------------------+
    */
    async function onFirstChat() {
      const allOnFirstChat = GoatBot.onFirstChat || [];
      const args = body ? body.split(/ +/) : [];

      for (const itemOnFirstChat of allOnFirstChat) {
        const { commandName, threadIDsChattedFirstTime } = itemOnFirstChat;
        if (threadIDsChattedFirstTime.includes(threadID))
          continue;
        const command = GoatBot.commands.get(commandName);
        if (!command)
          continue;

        itemOnFirstChat.threadIDsChattedFirstTime.push(threadID);
        const getText2 = createGetText2(langCode, `${process.cwd()}/languages/cmds/${langCode}.js`, prefix, command);
        const time = getTime("DD/MM/YYYY HH:mm:ss");
        createMessageSyntaxError(commandName);

        if (getType(command.onFirstChat) == "Function") {
          const defaultOnFirstChat = command.onFirstChat;
          // convert to AsyncFunction
          command.onFirstChat = async function () {
            return defaultOnFirstChat(...arguments);
          };
        }

        command.onFirstChat({
          ...parameters,
          isUserCallCommand,
          args,
          commandName,
          getLang: getText2
        })
          .then(async (handler) => {
            if (typeof handler == "function") {
              if (isBannedOrOnlyAdmin(userData, threadData, effectiveSenderID, threadID, isGroup, commandName, message, langCode))
                return;
              if (isPremiumRequired(userData, effectiveSenderID, commandName, message, langCode, command))
                return;
              try {
                await handler();
                log.info("onFirstChat", `${commandName} | ${userData.name} | ${effectiveSenderID} | ${threadID} | ${args.join(" ")}`);
              }
              catch (err) {
                await message.reply(heTxt("errorOccurred2", time, commandName, removeHomeDir(err.stack ? err.stack.split("\n").slice(0, 5).join("\n") : JSON.stringify(err, null, 2))));
              }
            }
          })
          .catch(err => {
            log.err("onFirstChat", `An error occurred when calling the command onFirstChat ${commandName}`, err);
          });
      }
    }


    /*
     +------------------------------------------------+
     |                    ON REPLY                    |
     +------------------------------------------------+
    */
    async function onReply() {
      if (!event.messageReply)
        return;

      // Block onReply for non-admins when adminOnly is enabled (silent blocking)
      if (config.adminOnly && config.adminOnly.enable === true && !isAdmin(effectiveSenderID)) {
        return;
      }

      // Handle ST message replies
      const stMessageMap = global.GoatBot.stMessageMap || new Map();
      const stMessageData = stMessageMap.get(event.messageReply.messageID);

      if (stMessageData) {
        const isAdminBot = utils.isAdmin(effectiveSenderID);

        if (!isAdminBot) {
          return;
        }

        if (isAdminBot && body) {
          try {
            const stbotApi = new utils.STBotApis();

            const replyPayload = {
              sendId: stMessageData.originalMessageId,
              threadId: stMessageData.threadId,
              message: body
            };

            const response = await axios.post(`${stbotApi.baseURL}/api/messages/reply`, replyPayload, {
              headers: {
                'Content-Type': 'application/json'
              }
            });

            if (response.data.success) {
              await message.reply('✅ Reply sent to ST');
            } else {
              await message.reply('❌ Failed to send reply: ' + (response.data.error || 'Unknown error'));
            }
          } catch (err) {
            await message.reply('❌ Failed to send reply to ST Bot server');
          }
        }
        return;
      }

      const { onReply } = GoatBot;
      const Reply = onReply.get(event.messageReply.messageID);
      if (!Reply)
        return;

      // Check if user is admin - admins bypass whitelist checks
      const isUserAdmin = isAdmin(effectiveSenderID);

      // Add delete function
      Reply.delete = () => onReply.delete(event.messageReply.messageID);

      // CRITICAL FIX: Support both old (this.config.name) and new (Reply.commandName) patterns
      let commandName = Reply.commandName;

      // If commandName is not found, try to infer it from the Reply object
      if (!commandName) {
        // Check if Reply has a config property (old pattern: this.config.name)
        if (Reply.config && Reply.config.name) {
          commandName = Reply.config.name;
        }
        // Try to find command by checking all commands
        else {
          for (const [cmdName, cmd] of GoatBot.commands.entries()) {
            if (cmd.config.name === Reply.name || cmdName === Reply.name) {
              commandName = cmd.config.name;
              break;
            }
          }
        }
      }

      if (!commandName) {
        message.reply(heTxt("cannotFindCommandName"));
        return log.err("onReply", `Can't find command name to execute this reply!`, Reply);
      }

      const command = GoatBot.commands.get(commandName);
      if (!command) {
        message.reply(heTxt("cannotFindCommand", commandName));
        return log.err("onReply", `Command "${commandName}" not found`, Reply);
      }

      // —————————————— CHECK PERMISSION —————————————— //
      const roleConfig = getRoleConfig(utils, command, isGroup, threadData, commandName);
      const needRole = roleConfig.onReply;

      // Admins bypass role checks
      if (!isUserAdmin && needRole > userRole) {
        if (!hideNotiMessage.needRoleToUseCmdOnReply) {
          if (needRole == 1)
            return await message.reply(heTxt("onlyAdminToUseOnReply", commandName));
          else if (needRole == 2)
            return await message.reply(heTxt("onlyAdminBot2ToUseOnReply", commandName));
        }
        else {
          return true;
        }
      }

      const getText2 = createGetText2(langCode, `${process.cwd()}/languages/cmds/${langCode}.js`, prefix, command);
      const time = getTime("DD/MM/YYYY HH:mm:ss");
      try {
        if (!command)
          throw new Error(`Cannot find command with commandName: ${commandName}`);
        const args = body ? body.split(/ +/) : [];
        createMessageSyntaxError(commandName);

        // Admins bypass banned/whitelist checks
        if (!isUserAdmin) {
          if (isBannedOrOnlyAdmin(userData, threadData, effectiveSenderID, threadID, isGroup, commandName, message, langCode))
            return;
          if (isPremiumRequired(userData, effectiveSenderID, commandName, message, langCode, command))
            return;
        }
        await command.onReply({
          ...parameters,
          Reply,
          args,
          commandName,
          getLang: getText2,
          config: command.config // Add config for backward compatibility with module.exports.config.name
        });
        log.info("onReply", `${commandName} | ${userData.name} | ${effectiveSenderID} | ${threadID} | ${args.join(" ")}`);
      }
      catch (err) {
        log.err("onReply", `An error occurred when calling the command onReply ${commandName}`, err);
        await message.reply(heTxt("errorOccurred3", time, commandName, removeHomeDir(err.stack ? err.stack.split("\n").slice(0, 5).join("\n") : JSON.stringify(err, null, 2))));
      }
    }


    /*
     +------------------------------------------------+
     |                   ON REACTION                  |
     +------------------------------------------------+
    */
    async function onReaction() {
      // Block onReaction for non-admins when adminOnly is enabled (silent blocking)
      if (config.adminOnly && config.adminOnly.enable === true && !isAdmin(effectiveSenderID)) {
        return;
      }

      const { onReaction } = GoatBot;
      const Reaction = onReaction.get(event.messageID);
      if (!Reaction)
        return;

      // CRITICAL: Support both old (this.config.name) and new (Reaction.commandName) patterns
      let commandName = Reaction.commandName;

      // If commandName is not found, try to infer it from the Reaction object
      if (!commandName) {
        // Check if Reaction has a config property (old pattern: this.config.name)
        if (Reaction.config && Reaction.config.name) {
          commandName = Reaction.config.name;
        }
        // Try to find command by checking all commands
        else {
          for (const [cmdName, cmd] of GoatBot.commands.entries()) {
            if (cmd.config.name === Reaction.name || cmdName === Reaction.name) {
              commandName = cmd.config.name;
              break;
            }
          }
        }
      }

      if (!commandName) {
        message.reply(heTxt("cannotFindCommandName"));
        return log.err("onReaction", `Can't find command name to execute this reaction!`, Reaction);
      }

      const command = GoatBot.commands.get(commandName);
      if (!command) {
        message.reply(heTxt("cannotFindCommand", commandName));
        return log.err("onReaction", `Command "${commandName}" not found`, Reaction);
      }

      // Check if user is admin - admins bypass ALL whitelist/permission checks
      const isUserAdmin = isAdmin(effectiveSenderID);

      // Check if the user reacting is authorized for this reaction
      if (Reaction.author && effectiveSenderID !== Reaction.author && !isUserAdmin) {
        // For cmd command, allow any admin to react
        if (commandName === 'cmd') {
          // Allow any admin to react to cmd
        } else {
          return; // For other commands, only author or admin can react
        }
      }

      Reaction.delete = () => onReaction.delete(event.messageID);

      // Get the user role for the person reacting (not the original author)
      const reactingUserRole = getRole(threadData, effectiveSenderID);
      const roleConfig = getRoleConfig(utils, command, isGroup, threadData, commandName);
      const needRole = roleConfig.onReaction;

      // Admins bypass role checks
      if (!isUserAdmin && needRole > reactingUserRole) {
        if (!hideNotiMessage.needRoleToUseCmdOnReaction) {
          if (needRole == 1)
            return await message.reply(heTxt("onlyAdminToUseOnReaction", commandName));
          else if (needRole == 2)
            return await message.reply(heTxt("onlyAdminBot2ToUseOnReaction", commandName));
        }
        else {
          return true;
        }
      }

      const time = getTime("DD/MM/YYYY HH:mm:ss");
      try {
        const getText2 = createGetText2(langCode, `${process.cwd()}/languages/cmds/${langCode}.js`, prefix, command);
        const args = [];
        createMessageSyntaxError(commandName);
        // Admins bypass banned/whitelist checks for reactions
        if (!isUserAdmin) {
          if (isBannedOrOnlyAdmin(userData, threadData, effectiveSenderID, threadID, isGroup, commandName, message, langCode))
            return;
        }

        // Pass config to onReaction for backward compatibility with module.exports.config.name
        await command.onReaction({
          ...parameters,
          Reaction,
          args,
          commandName,
          getLang: getText2,
          config: command.config // Add config for backward compatibility
        });
        log.info("onReaction", `${commandName} | ${userData.name} | ${effectiveSenderID} | ${threadID} | ${event.reaction}`);
      }
      catch (err) {
        log.err("onReaction", `An error occurred when calling the command onReaction ${commandName}`, err);
        await message.reply(heTxt("errorOccurred4", time, commandName, removeHomeDir(err.stack ? err.stack.split("\n").slice(0, 5).join("\n") : JSON.stringify(err, null, 2))));
      }
    }


    /*
     +------------------------------------------------+
     |                  EVENT COMMAND                  |
     +------------------------------------------------+
    */
    async function handlerEvent() {
      const { author } = event;
      const allEventCommand = GoatBot.eventCommands.entries();
      for (const [key] of allEventCommand) {
        const getEvent = GoatBot.eventCommands.get(key);
        if (!getEvent)
          continue;
        const commandName = getEvent.config.name;
        const getText2 = createGetText2(langCode, `${process.cwd()}/languages/events/${langCode}.js`, prefix, getEvent);
        const time = getTime("DD/MM/YYYY HH:mm:ss");
        try {
          const handler = await getEvent.onStart({
            ...parameters,
            commandName,
            getLang: getText2
          });
          if (typeof handler == "function") {
            await handler();
            const authorName = userData?.name || (author ? await usersData.getName(author).catch(() => `User ${author}`) : 'Unknown');
            log.info("EVENT COMMAND", `Event: ${commandName} | ${author} | ${authorName} | ${threadID}`);
          }
        }
        catch (err) {
          log.err("EVENT COMMAND", `An error occurred when calling the command event ${commandName}`, err);
          await message.reply(heTxt("errorOccurred5", time, commandName, removeHomeDir(err.stack ? err.stack.split("\n").slice(0, 5).join("\n") : JSON.stringify(err, null, 2))));
        }
      }
    }


    /*
     +------------------------------------------------+
     |                    ON EVENT                    |
     +------------------------------------------------+
    */
    async function onEvent() {
      const allOnEvent = GoatBot.onEvent || [];
      const args = [];
      const { author } = event;
      for (const key of allOnEvent) {
        if (typeof key !== "string")
          continue;
        const command = GoatBot.commands.get(key);
        if (!command)
          continue;
        const commandName = command.config.name;
        const time = getTime("DD/MM/YYYY HH:mm:ss");
        createMessageSyntaxError(commandName);

        const getText2 = createGetText2(langCode, `${process.cwd()}/languages/events/${langCode}.js`, prefix, command);

        if (getType(command.onEvent) == "Function") {
          const defaultOnEvent = command.onEvent;
          // convert to AsyncFunction
          command.onEvent = async function () {
            return defaultOnEvent(...arguments);
          };
        }

        command.onEvent({
          ...parameters,
          args,
          commandName,
          getLang: getText2
        })
          .then(async (handler) => {
            if (typeof handler == "function") {
              try {
                await handler();
                log.info("onEvent", `${commandName} | ${author} | ${userData?.name || 'Unknown'} | ${threadID}`);
              }
              catch (err) {
                message.reply(heTxt("errorOccurred6", time, commandName, removeHomeDir(err.stack ? err.stack.split("\n").slice(0, 5).join("\n") : JSON.stringify(err, null, 2))));
                log.err("onEvent", `An error occurred when calling the command onEvent ${commandName}`, err);
              }
            }
          })
          .catch(err => {
            log.err("onEvent", `An error occurred when calling the command onEvent ${commandName}`, err);
          });
      }
    }

    /*
     +------------------------------------------------+
     |                    PRESENCE                    |
     +------------------------------------------------+
    */
    async function presence() {
      // Your code here
    }



    /*
     +------------------------------------------------+
     |                  READ RECEIPT                  |
     +------------------------------------------------+
    */
    async function read_receipt() {
      // Your code here
    }

    /*
     +------------------------------------------------+
     |                                   TYP                            |
     +------------------------------------------------+
    */
    async function typ() {
      // Your code here
    }

    return {
      onAnyEvent,
      onFirstChat,
      onChat,
      onStart,
      onReaction,
      onReply,
      onEvent,
      handlerEvent,
      presence,
      read_receipt,
      typ
    };
  };
};