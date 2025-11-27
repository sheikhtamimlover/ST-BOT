
const { getTime } = global.utils;

module.exports = {
  config: {
    name: "adminUpdate",
    version: "2.4.74",
    author: "karan jalvanshi | Updated by ST",
    category: "events",
    description: "Update group information quickly",
    envConfig: {
      autoUnsend: true,
      sendNoti: true,
      timeToUnsend: 10
    }
  },

  langs: {
    en: {
      newAdmin: "[ GROUP UPDATE ]\n» New Admin\n\n%1 is now an admin",
      removeAdmin: "[ GROUP UPDATE ]\n» %1 has been removed as admin",
      changeNickname: "[ GROUP UPDATE ]\n» %1",
      changeThreadName: "[ GROUP UPDATE ]\n» %1",
      changeThreadIcon: "[ GROUP UPDATE ]\n» %1\n» Original Icon: %2",
      threadCall: "[ GROUP UPDATE ]\n» %1",
      threadCallEnded: "[ GROUP UPDATE ]\n» CALL HAS ENDED.\n» CALL DURATION: %1",
      threadCallJoined: "[ GROUP UPDATE ]\n» %1 JOINED THE CALL.",
      magicWords: "[⚜️] Theme %1 added effects: %2\n[⚜️] Emoji: %3\n[⚜️] Total %4 word effects added",
      threadPoll: "%1",
      threadApproval: "%1",
      threadColor: "[ GROUP UPDATE ]\n» %1"
    }
  },

  onStart: async function({ api, event, threadsData, usersData, getLang }) {
    const { logMessageType, logMessageData, threadID, author } = event;
    
    if (!threadID || author == threadID) return;

    
    const globalConfig = global.GoatBot.config.groupNoti || { enable: true, threadIds: [] };
    
    
    if (!globalConfig.enable) return;
    
   
    if (globalConfig.threadIds && globalConfig.threadIds.length > 0) {
      if (!globalConfig.threadIds.includes(threadID)) return;
    }

    try {
      const threadData = await threadsData.get(threadID);
      if (!threadData) return;

      const config = this.config.envConfig;
      let message = "";

      switch (logMessageType) {
        case "log:thread-admins": {
          if (logMessageData.ADMIN_EVENT == "add_admin") {
            if (!threadData.adminIDs) threadData.adminIDs = [];
            threadData.adminIDs.push({ id: logMessageData.TARGET_ID });
            await threadsData.set(threadID, { adminIDs: threadData.adminIDs });
            
            if (config.sendNoti) {
              message = getLang("newAdmin", logMessageData.TARGET_ID);
            }
          }
          else if (logMessageData.ADMIN_EVENT == "remove_admin") {
            threadData.adminIDs = threadData.adminIDs.filter(item => item.id != logMessageData.TARGET_ID);
            await threadsData.set(threadID, { adminIDs: threadData.adminIDs });
            
            if (config.sendNoti) {
              message = getLang("removeAdmin", logMessageData.TARGET_ID);
            }
          }
          break;
        }

        case "log:user-nickname": {
          const nicknameText = logMessageData.nickname.length == 0 
            ? `Removed nickname for user ${logMessageData.participant_id}`
            : `Updated nickname for ${logMessageData.participant_id} to: ${logMessageData.nickname}`;
          message = getLang("changeNickname", nicknameText);
          break;
        }

        case "log:thread-name": {
          const nameText = logMessageData.name 
            ? `Updated group name to: ${logMessageData.name}`
            : 'Removed group name';
          message = getLang("changeThreadName", nameText);
          break;
        }

        case "log:thread-icon": {
          const fs = require("fs");
          const iconPath = __dirname + "/data/emoji.json";
          
          if (!fs.existsSync(iconPath)) {
            fs.writeFileSync(iconPath, JSON.stringify({}));
          }
          
          let preIcon = JSON.parse(fs.readFileSync(iconPath));
          const previousIcon = preIcon[threadID] || "unclear";
          
          if (config.sendNoti) {
            message = getLang("changeThreadIcon", event.logMessageBody.replace("emoticon", "icon"), previousIcon);
          }
          
          preIcon[threadID] = logMessageData.thread_icon || "👍";
          fs.writeFileSync(iconPath, JSON.stringify(preIcon));
          break;
        }

        case "log:thread-call": {
          if (logMessageData.event == "group_call_started") {
            const name = await usersData.getName(logMessageData.caller_id);
            const callType = logMessageData.video ? 'VIDEO ' : '';
            message = getLang("threadCall", `${name} started a ${callType}call`);
          }
          else if (logMessageData.event == "group_call_ended") {
            const callDuration = logMessageData.call_duration;
            let hours = Math.floor(callDuration / 3600);
            let minutes = Math.floor((callDuration - (hours * 3600)) / 60);
            let seconds = callDuration - (hours * 3600) - (minutes * 60);

            hours = hours < 10 ? "0" + hours : hours;
            minutes = minutes < 10 ? "0" + minutes : minutes;
            seconds = seconds < 10 ? "0" + seconds : seconds;

            const timeFormat = `${hours}:${minutes}:${seconds}`;
            message = getLang("threadCallEnded", timeFormat);
          }
          else if (logMessageData.joining_user) {
            const name = await usersData.getName(logMessageData.joining_user);
            const callType = logMessageData.group_call_type == '1' ? 'VIDEO ' : '';
            message = getLang("threadCallJoined", `${name} joined the ${callType}call`);
          }
          break;
        }

        case "log:magic-words": {
          message = getLang("magicWords", 
            event.logMessageData.magic_word,
            event.logMessageData.theme_name,
            event.logMessageData.emoji_effect || "No emoji",
            event.logMessageData.new_magic_word_count
          );
          break;
        }

        case "log:thread-poll": {
          message = getLang("threadPoll", event.logMessageBody);
          break;
        }

        case "log:thread-approval-mode": {
          message = getLang("threadApproval", event.logMessageBody);
          break;
        }

        case "log:thread-color": {
          if (config.sendNoti) {
            message = getLang("threadColor", event.logMessageBody.replace("Topic", "color"));
          }
          break;
        }

        default:
          return;
      }

      if (message && config.sendNoti) {
        const sentMsg = await api.sendMessage(message, threadID);
        
        if (config.autoUnsend && sentMsg) {
          setTimeout(() => {
            api.unsendMessage(sentMsg.messageID).catch(() => {});
          }, config.timeToUnsend * 1000);
        }
      }

    } catch (error) {
      console.error("Error in adminUpdate event:", error);
    }
  }
};
