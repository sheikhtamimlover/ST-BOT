const axios = require("axios");

const stapi = new global.utils.STBotApis();

module.exports = {
  config: {
    name: "tm",
    aliases: [],
    version: "2.4.78",
    author: "ST | Sheikh Tamim",
    role: 0,
    category: "utility",
    guide: {
      en:
        "!tm → domain list\n" +
        "!tm gen → random mail\n" +
        "!tm gen name domain\n" +
        "!tm inbox mail"
    }
  },

  ST: async function ({ message, args, event }) {
    const uid = event.senderID;


    if (args[0] === "gen" && !args[1]) {
      try {
        const res = await axios.get(`${stapi.baseURL}/api/mailgen`);
        return message.reply(`📧 Inbox:\n${res.data.inbox}`);
      } catch {
        return message.reply("❌ Failed to generate mail");
      }
    }

    if (args[0] === "gen" && args[1] && args[2]) {
      try {
        const res = await axios.post(`${stapi.baseURL}/api/mailgen`, {
          username: args[1],
          domain: args[2]
        });

        return message.reply(`📧 Custom Inbox:\n${res.data.inbox}`);
      } catch {
        return message.reply("❌ Failed to create custom mail");
      }
    }


    if (args[0] === "inbox") {
      const mail = args[1];
      if (!mail) return message.reply("❌ Provide email");

      try {
        const res = await axios.get(
          `${stapi.baseURL}/api/mailcheck/${encodeURIComponent(mail)}`
        );

        const msgs = res.data.msgs;

        if (!msgs.length) {
          return message.reply("📭 Inbox empty");
        }

        let msg = `📬 Inbox: ${mail}\n\n`;

        msgs.forEach((m, i) => {
          msg += `${i + 1}. ${m.s}\n👤 ${m.f}\n⏱ ${m.rr}\n\n`;
        });

        return message.reply(msg);

      } catch {
        return message.reply("❌ Failed to check inbox");
      }
    }


    try {
      const res = await axios.get(`${stapi.baseURL}/api/maildomains`);
      const domains = res.data;

      let msg = "🌐 DOMAIN LIST:\n\n";

      domains.forEach((d, i) => {
        msg += `${i + 1}. ${d.qdn}\n`;
      });

      msg += "\n👉 Reply with number + name\nExample: 1 tamim";

      return message.reply(msg, (err, info) => {
        global.GoatBot.onReply.set(info.messageID, {
          commandName: module.exports.config.name,
          author: uid,
          type: "select_domain",
          domains
        });
      });

    } catch {
      return message.reply("❌ Failed to fetch domains");
    }
  },


  onReply: async function ({ message, event, Reply }) {
    const uid = event.senderID;
    if (Reply.author !== uid) return;

    if (Reply.type === "select_domain") {
      const input = event.body.split(" ");
      const index = parseInt(input[0]);
      const username = input[1];

      if (isNaN(index) || !username) {
        return message.reply("❌ Format: <number> <name>");
      }

      const domain = Reply.domains[index - 1]?.qdn;
      if (!domain) return message.reply("❌ Invalid domain");

      try {
        const res = await axios.post(`${stapi.baseURL}/api/mailgen`, {
          username,
          domain
        });

        return message.reply(
          `✅ Mail Created\n\n📧 ${res.data.inbox}`
        );

      } catch {
        return message.reply("❌ Failed to create mail");
      }
    }
  }
};