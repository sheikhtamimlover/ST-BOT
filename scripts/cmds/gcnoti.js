
const fs = require('fs-extra');
const path = require('path');

module.exports = {
  config: {
    name: "gcnoti",
    version: "2.4.74",
    author: "ST",
    countDown: 5,
    role: 2,
    description: {
      en: "Manage group notification settings"
    },
    category: "admin",
    guide: {
      en: "{pn} enable - Enable group notifications globally\n"
        + "{pn} disable - Disable group notifications globally\n"
        + "{pn} add [threadID] - Add thread to allowed list (use current thread if no ID provided)\n"
        + "{pn} remove [threadID] - Remove thread from allowed list\n"
        + "{pn} list - Show all allowed threads with serial numbers\n"
        + "{pn} r <serial> - Remove thread by serial number from list"
    }
  },

  langs: {
    en: {
      enabled: "✅ Group notifications have been enabled globally.",
      disabled: "❌ Group notifications have been disabled globally.",
      addedCurrent: "✅ Added current thread to group notification list.\nThread ID: %1\nThread Name: %2",
      addedSpecific: "✅ Added thread to group notification list.\nThread ID: %1\nThread Name: %2",
      removed: "✅ Removed thread from group notification list.\nThread ID: %1",
      removedBySerial: "✅ Removed thread from list.\nThread ID: %1\nThread Name: %2",
      alreadyExists: "⚠️ This thread is already in the allowed list.",
      notInList: "⚠️ This thread is not in the allowed list.",
      invalidSerial: "❌ Invalid serial number. Please use a number from the list.",
      emptyList: "📋 Group notification thread list is empty.\n\nCurrent status: %1\n\nUse '{pn} add' to add threads.",
      listHeader: "📋 Group Notification Settings\n━━━━━━━━━━━━━━━━━━━━━\n\n",
      listStatus: "Status: %1\n\n",
      listThreads: "Allowed Threads (%1):\n",
      listItem: "%1. %2\n   ID: %3\n",
      noThreadName: "Unknown Thread",
      restartRequired: "\n⚠️ Please restart the bot for changes to take effect.\nUse: {pn}restart",
      invalidThreadId: "❌ Invalid thread ID provided.",
      cannotGetThreadInfo: "⚠️ Could not get thread information for ID: %1"
    }
  },

  ST: async function({ message, args, threadsData, getLang, commandName, api, event }) {
    const configPath = path.join(__dirname, '../../config.json');
    const config = require(configPath);
    
    if (!config.groupNoti) {
      config.groupNoti = {
        enable: true,
        threadIds: []
      };
    }

    const action = args[0]?.toLowerCase();

    switch (action) {
      case "enable": {
        config.groupNoti.enable = true;
        await fs.writeJson(configPath, config, { spaces: 2 });
        global.GoatBot.config.groupNoti = config.groupNoti;
        return message.reply(getLang("enabled") + getLang("restartRequired"));
      }

      case "disable": {
        config.groupNoti.enable = false;
        await fs.writeJson(configPath, config, { spaces: 2 });
        global.GoatBot.config.groupNoti = config.groupNoti;
        return message.reply(getLang("disabled") + getLang("restartRequired"));
      }

      case "add": {
        const threadIdToAdd = args[1] || event.threadID;
        
        if (!/^\d+$/.test(threadIdToAdd)) {
          return message.reply(getLang("invalidThreadId"));
        }

        if (config.groupNoti.threadIds.includes(threadIdToAdd)) {
          return message.reply(getLang("alreadyExists"));
        }

        let threadName;
        try {
          const threadInfo = await api.getThreadInfo(threadIdToAdd);
          threadName = threadInfo.threadName || getLang("noThreadName");
        } catch (err) {
          threadName = getLang("noThreadName");
        }

        config.groupNoti.threadIds.push(threadIdToAdd);
        await fs.writeJson(configPath, config, { spaces: 2 });
        global.GoatBot.config.groupNoti = config.groupNoti;

        if (args[1]) {
          return message.reply(getLang("addedSpecific", threadIdToAdd, threadName) + getLang("restartRequired"));
        } else {
          return message.reply(getLang("addedCurrent", threadIdToAdd, threadName) + getLang("restartRequired"));
        }
      }

      case "remove": {
        const threadIdToRemove = args[1] || event.threadID;
        
        if (!/^\d+$/.test(threadIdToRemove)) {
          return message.reply(getLang("invalidThreadId"));
        }

        const index = config.groupNoti.threadIds.indexOf(threadIdToRemove);
        if (index === -1) {
          return message.reply(getLang("notInList"));
        }

        config.groupNoti.threadIds.splice(index, 1);
        await fs.writeJson(configPath, config, { spaces: 2 });
        global.GoatBot.config.groupNoti = config.groupNoti;

        return message.reply(getLang("removed", threadIdToRemove) + getLang("restartRequired"));
      }

      case "r": {
        const serial = parseInt(args[1]);
        
        if (isNaN(serial) || serial < 1 || serial > config.groupNoti.threadIds.length) {
          return message.reply(getLang("invalidSerial"));
        }

        const threadIdToRemove = config.groupNoti.threadIds[serial - 1];
        let threadName;
        
        try {
          const threadInfo = await api.getThreadInfo(threadIdToRemove);
          threadName = threadInfo.threadName || getLang("noThreadName");
        } catch (err) {
          threadName = getLang("noThreadName");
        }

        config.groupNoti.threadIds.splice(serial - 1, 1);
        await fs.writeJson(configPath, config, { spaces: 2 });
        global.GoatBot.config.groupNoti = config.groupNoti;

        return message.reply(getLang("removedBySerial", threadIdToRemove, threadName) + getLang("restartRequired"));
      }

      case "list":
      default: {
        const status = config.groupNoti.enable ? "✅ Enabled" : "❌ Disabled";
        
        if (config.groupNoti.threadIds.length === 0) {
          return message.reply(getLang("emptyList", status));
        }

        let msg = getLang("listHeader");
        msg += getLang("listStatus", status);
        msg += getLang("listThreads", config.groupNoti.threadIds.length);

        for (let i = 0; i < config.groupNoti.threadIds.length; i++) {
          const tid = config.groupNoti.threadIds[i];
          let threadName;
          
          try {
            const threadInfo = await api.getThreadInfo(tid);
            threadName = threadInfo.threadName || getLang("noThreadName");
          } catch (err) {
            threadName = getLang("cannotGetThreadInfo", tid);
          }

          msg += getLang("listItem", i + 1, threadName, tid);
        }

        msg += "\n━━━━━━━━━━━━━━━━━━━━━";
        msg += `\n\n💡 Use '{pn} r <serial>' to remove by number`;

        return message.reply(msg);
      }
    }
  }
};
