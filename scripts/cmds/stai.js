"use strict";

module.exports = {
  config: {
    name: "stai",
    aliases: ["tamimai", "aiagent", "stagent"],
    version: "2.1.0",
    author: "STAI | Sheikh Tamim",
    countDown: 3,
    role: 2,
    description: {
      en: "STAI — full project AI agent. Shell, files, web, GIF, auto-install, full bot API, multi-provider."
    },
    category: "ai",
    guide: {
      en: "{pn} <prompt>\n"
        + "{pn} read @login.js @account.txt\n"
        + "{pn} find <filename>\n"
        + "{pn} commands | events\n"
        + "{pn} -c name.js <create command>\n"
        + "{pn} -e name.js <create event>\n"
        + "{pn} -fc file.js <fix command>\n"
        + "{pn} -fe file.js <fix event>\n"
        + "{pn} -sh <shell command>\n"
        + "{pn} -read path/to/file\n"
        + "{pn} -provider openrouter|groq|stfree\n"
        + "{pn} -clear\n"
        + "Reply to any STAI message to continue same chat."
    }
  },

  onStart: async function(params) {
    return global.GoatBot.stagent.handleCommand(params);
  },

  onReply: async function(params) {
    const { Reply, event } = params;
    if (!Reply || Reply.commandName !== "stai") return;
    if (Reply.author && event.senderID !== Reply.author && !global.utils.isAdmin(event.senderID)) return;
    return global.GoatBot.stagent.handleReply(params);
  }
};
