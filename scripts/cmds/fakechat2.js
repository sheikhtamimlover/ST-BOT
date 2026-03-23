const axios = require("axios");

const getBaseApi = async () => {
  const base = await axios.get(
    "https://raw.githubusercontent.com/cyber-ullash/cyber-ullash/refs/heads/main/UllashApi.json"
  );
  return base.data;
};

const escapeRegex = (str) =>
  str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

module.exports.config = {
  name: "fakechat2",
  aliases: [],
  version: "3.2",
  role: 0,
  author: "MAHBUB ULLASH",
  description: "Generate Facebook fake chat",
  category: "Tools",
  guide: {
    en: "{prefix}fakechat @mention text U1/U2/U3\nExample:\n!fakechat @John Doe hello world U1"
  },
  coolDowns: 5,
};

module.exports.onStart = async function ({ api, event, args, usersData }) {
  let id;
  if (event.type === "message_reply") {
    id = event.messageReply.senderID;
  } else {
    id = Object.keys(event.mentions || {})[0] || event.senderID;
  }

  const userInfo = await usersData.get(id);

  if (!event.body) {
    return api.sendMessage(
      "❌ | 𝐏𝐫𝐨𝐯𝐢𝐝𝐞 𝐭𝐞𝐱𝐭 𝐚𝐟𝐭𝐞𝐫 𝐭𝐡𝐞 𝐜𝐨𝐦𝐦𝐚𝐧𝐝.",
      event.threadID,
      event.messageID
    );
  }

  const prefix = (global.GoatBot && global.GoatBot.config && global.GoatBot.config.prefix) || "";
  const commandName = module.exports.config.name || "fakechat";

  let body = event.body.trim();

  if (prefix && body.startsWith(prefix)) {
    body = body.slice(prefix.length).trim();
  }

  if (body.toLowerCase().startsWith(commandName.toLowerCase())) {
    body = body.slice(commandName.length).trim();
  }

  let content = body;

  if (event.mentions && Object.keys(event.mentions).length > 0) {
    for (const name of Object.values(event.mentions)) {
      const esc = escapeRegex(name);
      const reg = new RegExp("@?" + esc, "gi");
      content = content.replace(reg, " ");
    }
  }

  content = content.replace(/\s+/g, " ").trim();

  if (!content) {
    return api.sendMessage(
      "❌ | 𝐍𝐨 𝐭𝐞𝐱𝐭 𝐟𝐨𝐮𝐧𝐝 𝐚𝐟𝐭𝐞𝐫 𝐫𝐞𝐦𝐨𝐯𝐢𝐧𝐠 𝐦𝐞𝐧𝐭𝐢𝐨𝐧.",
      event.threadID,
      event.messageID
    );
  }

  let parts = content.split(/\s+/);
  let model = "U3";
  const lastWord = parts[parts.length - 1];

  if (/^U[0-9]+$/i.test(lastWord)) {
    model = lastWord.toUpperCase();
    parts.pop();
  }

  const text = parts.join(" ").trim();

  if (!text) {
    return api.sendMessage(
      "❌ | 𝐓𝐞𝐱𝐭 𝐜𝐚𝐧𝐧𝐨𝐭 𝐛𝐞 𝐞𝐦𝐩𝐭𝐲 𝐚𝐟𝐭𝐞𝐫 𝐫𝐞𝐦𝐨𝐯𝐢𝐧𝐠 𝐦𝐨𝐝𝐞𝐥 𝐚𝐧𝐝 𝐦𝐞𝐧𝐭𝐢𝐨𝐧.",
      event.threadID,
      event.messageID
    );
  }

  api.sendMessage(
    "⏳ 𝐆𝐞𝐧𝐞𝐫𝐚𝐭𝐢𝐧𝐠 𝐟𝐚𝐤𝐞 𝐜𝐡𝐚𝐭…",
    event.threadID,
    (err, info) => {
      setTimeout(() => {
        api.unsendMessage(info.messageID);
      }, 3000);
    }
  );

  try {
    const base = await getBaseApi();
    const api2 = base.api2;

    const imgUrl = `${api2}/api/fakechat?uid=${encodeURIComponent(
      id
    )}&text=${encodeURIComponent(text)}&model=${encodeURIComponent(model)}`;

    const response = await axios.get(imgUrl, { responseType: "stream" });

    api.sendMessage(
      {
        body:
          " ",
        attachment: response.data,
      },
      event.threadID,
      event.messageID
    );
  } catch (error) {
    console.error(error);
    api.sendMessage(
      "❌ | 𝐅𝐚𝐢𝐥𝐞𝐝 𝐭𝐨 𝐠𝐞𝐧𝐞𝐫𝐚𝐭𝐞 𝐟𝐚𝐤𝐞 𝐜𝐡𝐚𝐭.",
      event.threadID,
      event.messageID
    );
  }
};