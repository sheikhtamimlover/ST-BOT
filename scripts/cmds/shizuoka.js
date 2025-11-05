const axios = require("axios");

const getAPIBase = async () => {
  const base = await axios.get("https://gitlab.com/Rakib-Adil-69/shizuoka-command-store/-/raw/main/apiUrls.json");
  return base.data.rakib;
};
const sendMessage = (api, threadID, message, messageID) =>
  api.sendMessage(message, threadID, () => {}, messageID);

const cError = (api, threadID, messageID) =>
  sendMessage(api, threadID, "⚠️ Error 🦆💨", messageID);

const autoReplies = [
  "vag vai bukachuda eshe geche 🏃‍♂️🏃‍♀️",
  "হুম জান বলো 😚",
  "eto baby boilo na lojja lage🙈",
  "কি হইছে বলো তাড়াতাড়ি😒",
  "জান বাল ফালাবা?🙂",
  "জান পাট খেতে যাবা?🙂",
  "message my owner m.me/RAKIB.404X 🙂",
  "কি বলবি বল?😒",
  "হুম, বলো..",
  "আমি কি তোর চাকর নাকি?😒",
  "তোর জন্য একটা গল্প আছে!",
  "kicche eto dakos kn..😾?",
  "😍😘"
];

const autoEmojis = ["👀", "🫶", "🫦", "😍", "😘", "🥵", "👽", "😻", "😽", "💗", "🤡", "😾", "🙈", "💅", "🐸", "🐰"];
const keywords = ["bby", "baby", "bot", "robot", "বট", "বেবি", "shizuoka", "bbe"];

const cleanInput = (text = "") =>
  text.toString().toLowerCase().replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "").trim();

const startsWithEmoji = (text = "") =>
  /^[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u.test(text || "");

const matchesKeyword = (text = "") => {
  if (!text) return false;
  const pattern = new RegExp(`^(${keywords.join("|")})(\\b|$)`, "i");
  return pattern.test(text);
};

async function safeGetUserName(api, uid) {
  try {
    const info = await api.getUserInfo(uid);
    if (!info) return "User";
    return (info[uid] && info[uid].name) || Object.values(info)[0]?.name || "User";
  } catch {
    return "User";
  }
}

async function parseAllMsgsResponse(res) {
  const data = res?.data;
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.messages)) return data.messages;
  if (Array.isArray(data.data)) return data.data;
  if (data.messages && typeof data.messages === "object") {
    return Object.values(data.messages);
  }
  return [];
}

async function parseMsgRepliesResponse(res) {
  const data = res?.data;
  if (!data) return [];
  if (Array.isArray(data.messages)) return data.messages.map(m => (typeof m === "string" ? m : (m.ans || m.answer || m.text)));
  if (Array.isArray(data.replies)) return data.replies;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.messages)) return data.messages;
  if (typeof data === "string") return [data];
  return [];
}

const talkWithBot = async (api, threadID, messageID, senderID, input, isKeyword = false) => {
  try {
    if (!input || input.trim().length === 0) {
      return sendMessage(api, threadID, "type bby hi to text with me..", messageID);
    }
    
    const res = await axios.get(`${await getAPIBase()}/rakib`, {
      params: { text: input, uid: senderID, font: 1 }
    });
    
    const taught = res.data?.taught;
    let reply = res.data?.text || "Please teach me this sentence! 🦆💨";
    const react = res.data?.react || "";
    const mentions = [];
    
    if (!taught && isKeyword) {
      const emoji = autoEmojis[Math.floor(Math.random() * autoEmojis.length)];
      const autoReply = autoReplies[Math.floor(Math.random() * autoReplies.length)];
      const userName = await safeGetUserName(api, senderID);
      reply = `🎀✨ ${userName} ✨🎀\n\n${autoReply}`;
      mentions.push({ tag: userName, id: senderID });
      try { api.setMessageReaction(emoji, messageID, () => {}, true); } catch (e) {}
    }
    
    api.sendMessage({ body: reply + (react || ""), mentions }, threadID, (err, info) => {
      if (!err && info?.messageID) {
        global.GoatBot.onReply.set(info.messageID, {
          commandName: module.exports.config.name,
          type: "reply",
          author: senderID
        });
      }
    }, messageID);
    
  } catch (err) {
    console.error("talkWithBot error:", err?.message || err);
    return cError(api, threadID, messageID);
  }
};

const teachBot = async (api, threadID, messageID, senderID, teachText) => {
  const [ask, answers] = teachText.split(" - ").map(t => (t || "").trim());
  if (!ask || !answers)
    return sendMessage(api, threadID, "📚 Format: teach <ask> - <answer1>, <answer2> ...", messageID);
  
  const answerArray = answers.split(",").map(a => a.trim()).filter(Boolean);
  
  try {
    const res = await axios.get(`${await getAPIBase()}/rakib/teach`, {
      params: { ask, ans: answerArray.join(","), uid: senderID }
    });
    return sendMessage(api, threadID, res.data?.message || "Failed to teach!", messageID);
  } catch (err) {
    console.error("teachBot error:", err?.message || err);
    return cError(api, threadID, messageID);
  }
};

const editMessage = async (api, threadID, messageID, senderID, editText) => {
  const [ask, rest] = editText.split(" - ").map(t => (t || "").trim());
  if (!ask || !rest) return sendMessage(api, threadID, "✏️ Format: editmsg <ask> - <oldAns> / <newAns>", messageID);
  
  const parts = rest.split("/").map(t => (t || "").trim());
  if (parts.length < 2) return sendMessage(api, threadID, "✏️ You must separate old and new answers with '/'", messageID);
  const oldAns = parts[0];
  const newAns = parts.slice(1).join("/");
  
  if (!oldAns || !newAns) return sendMessage(api, threadID, "✏️ Invalid old or new answer.", messageID);
  
  try {
    const res = await axios.get(`${await getAPIBase()}/rakib/editmsg`, {
      params: { ask, oldAns, newAnswer: newAns, uid: senderID }
    });
    
    return sendMessage(api, threadID, res.data?.message || "✏️ Message edited.", messageID);
  } catch (err) {
    console.error("editMessage error:", err?.message || err);
    return cError(api, threadID, messageID);
  }
};

const deleteMessage = async (api, threadID, messageID, senderID, askText, usersData) => {
  const adil = ["100075808585925", "100042067216561"];
  if (!adil.includes(senderID)) {
    return sendMessage(api, threadID, "❌ Only rakib adil can delete taught messages.", messageID);
  }
  
  if (!askText) return sendMessage(api, threadID, "🗑️ Format: dltmsg <ask>", messageID);
  
  try {
    const res = await axios.get(`${await getAPIBase()}/rakib/dltmsg`, {
      params: { ask: askText, uid: senderID }
    });
    const msg = res.data?.message || "❌ Failed to delete message.";
    const emoji = res.data?.success ? "🧹" : "❌";
    try { api.setMessageReaction(emoji, messageID, () => {}, true); } catch (e) {}
    return sendMessage(api, threadID, msg, messageID);
  } catch (err) {
    console.error("deleteMessage error:", err?.message || err);
    return cError(api, threadID, messageID);
  }
};

const searchMessage = async (api, threadID, messageID, senderID, askText) => {
  if (!askText || askText.trim().length === 0)
    return sendMessage(api, threadID, "🔍 Format: msg <ask>", messageID);
  
  try {
    const res = await axios.get(`${await getAPIBase()}/rakib/msg`, {
      params: { ask: askText, uid: senderID }
    });
    
    const data = res.data;
    if (!data) return sendMessage(api, threadID, "❌ No data received from server.", messageID);
    
    let replies = [];
    
    if (Array.isArray(data.messages)) {
      replies = data.messages.map((m, i) =>
        typeof m === "string" ?
        `💬 ${i + 1}. ${m}` :
        `💬 ${i + 1}. ${m.ans || m.answer || m.text || "—"}`
      );
    } else if (Array.isArray(data.replies)) {
      replies = data.replies.map((r, i) => `💬 ${i + 1}. ${r}`);
    } else if (Array.isArray(data.data)) {
      replies = data.data.map((r, i) => `💬 ${i + 1}. ${r}`);
    } else if (data?.answers && Array.isArray(data.answers)) {
      replies = data.answers.map((r, i) => `💬 ${i + 1}. ${r}`);
    } else if (typeof data === "string") {
      replies = [`💬 1. ${data}`];
    }
    
    if (!replies.length)
      return sendMessage(api, threadID, `❌ No replies found for “${askText}”.`, messageID);
    
    const title = data.ask ? `📖 Question: ${data.ask}` : `📖 Question: ${askText}`;
    const text = `${title}\n\n${replies.join("\n")}\n\n⏳ Auto-deleting in 15s...`;
    
    api.sendMessage(text, threadID, (err, info) => {
      if (err || !info?.messageID) return;
      setTimeout(() => {
        api.unsendMessage(info.messageID);
      }, 15000);
    }, messageID);
    
  } catch (err) {
    console.error("searchMessage error:", err?.response?.data || err?.message || err);
    return cError(api, threadID, messageID);
  }
};

const showAllMessages = async (api, threadID, messageID, page = 1, authorID = null) => {
  try {
    const res = await axios.get(`${await getAPIBase()}/rakib/allmsgs`);
    const msgs = await parseAllMsgsResponse(res);
    if (!msgs || msgs.length === 0) return sendMessage(api, threadID, "📭 No taught messages found!", messageID);
    
    const perPage = 15;
    const totalPages = Math.max(1, Math.ceil(msgs.length / perPage));
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    const start = (page - 1) * perPage;
    const slice = msgs.slice(start, start + perPage);
    
    const formatted = slice.map((m, i) => {
      const ask = m.ask || m.q || m.question || m.name || "Unknown";
      let answers = m.ans ?? m.answers ?? m.reply ?? m.replies ?? m.answer ?? [];
      if (typeof answers === "string") answers = [answers];
      if (!Array.isArray(answers)) answers = Array.from(answers || []);
      const answersText = answers.length ? answers.join(", ") : "—";
      return `${start + i + 1}. ${ask}\n   💬 ${answersText}`;
    }).join("\n\n");
    
    const header = `📚 All taught messages — Page ${page}/${totalPages}\n\n`;
    const footer = `\n\nReply with "next" or "prev" to navigate — 🧮`;
    
    api.sendMessage(header + formatted + footer, threadID, (err, info) => {
      if (err) return console.error(err);
      
      if (info?.messageID) {
        global.GoatBot.onReply.set(info.messageID, {
          commandName: module.exports.config.name,
          type: "pagination",
          page,
          totalPages,
          data: msgs,
          author: authorID,
          currentMessageID: info.messageID
        });
      }
    }, messageID);
    
  } catch (err) {
    console.error("showAllMessages error:", err?.message || err);
    return cError(api, threadID, messageID);
  }
};

const showAllTeach = async (api, threadID, messageID) => {
  try {
    const res = await axios.get(`${await getAPIBase()}/rakib/totalteach`);
    if (!res.data) return sendMessage(api, threadID, "Couldn’t fetch total teaching stats.", messageID);
    const { totalTeachCount, totalQuestions } = res.data;
    const msg = `📊 Total Teaching Stats:\n\n📝 Questions: ${totalQuestions}\n📚 Teachings: ${totalTeachCount}`;
    return sendMessage(api, threadID, msg, messageID);
  } catch (err) {
    console.error("showAllTeach error:", err?.message || err);
    return cError(api, threadID, messageID);
  }
};

const showTeachers = async (api, threadID, messageID) => {
  try {
    const res = await axios.get(`${await getAPIBase()}/rakib/teachers`);
    if (!res.data?.teachers || !Array.isArray(res.data.teachers) || res.data.teachers.length === 0)
      return sendMessage(api, threadID, "No teachers found.", messageID);
    
    const list = [];
    for (const [i, t] of res.data.teachers.entries()) {
      const uid = t._id;
      const teachCount = t.teaches || 0;
      const name = await safeGetUserName(api, uid).catch(() => "Unknown");
      list.push(`${i + 1}. ${name} — ${teachCount} teaches`);
    }
    return sendMessage(api, threadID, `👨‍🏫 Bot Teachers:\n\n${list.join("\n")}`, messageID);
    
  } catch (err) {
    console.error("showTeachers error:", err?.message || err);
    return cError(api, threadID, messageID);
  }
};

module.exports.config = {
  name: "shizuoka",
  aliases: ["bby", "bot", "baby"],
  version: "2.6.15",
  author: "Rakib Adil ✨",
  role: 0,
  description: "Smart chatbot, better than all simsimi yk. teach, edit, delete, find and see your stats.",
  category: "chat",
  countDown: 2,
  guide: {
    en: "Teach: bot teach <ask> - <answer1>,<answer2>   Edit: bot editmsg <ask> - <oldAns> / <newAns>   Delete: bot dltmsg <ask>   Search: bot msg <ask>   All Messages: bot allmsg   All Teachers: bot teachers   Total Teach Stats: bot allteach   My Stats: bot mystats"
  }
};

module.exports.onStart = async ({ api, event, args, usersData }) => {
  const { threadID, messageID, senderID } = event;
  const input = (args || []).join(" ").trim();
  const [command, ...rest] = input.split(" ");
  
  try {
    switch ((command || "").toLowerCase()) {
      case "teach":
        return teachBot(api, threadID, messageID, senderID, rest.join(" "));
      case "editmsg":
        return editMessage(api, threadID, messageID, senderID, rest.join(" "));
      case "dltmsg":
        return deleteMessage(api, threadID, messageID, senderID, rest.join(" "), usersData);
      case "msg":
        return searchMessage(api, threadID, messageID, senderID, rest.join(" "));
      case "allmsg":
        return showAllMessages(api, threadID, messageID, 1, senderID);
      case "allteach":
        return showAllTeach(api, threadID, messageID);
      case "teachers":
        return showTeachers(api, threadID, messageID);
      case "mystats": {
        try {
          const res = await axios.get(`${await getAPIBase()}/rakib/mystats`, { params: { uid: senderID } });
          return sendMessage(api, threadID, `📊 Your Stats:\n\n🧠 Teachings: ${res.data?.yourTeachings || 0}`, messageID);
        } catch (err) {
          console.error("mystats error:", err?.message || err);
          return cError(api, threadID, messageID);
        }
      }
      default:
        return talkWithBot(api, threadID, messageID, senderID, input || args.join(" "), false);
    }
  } catch (err) {
    console.error("onStart error:", err?.message || err);
    return cError(api, threadID, messageID);
  }
};

module.exports.onChat = async ({ api, event }) => {
  const bodyRaw = (event.body || event.text || event.messageReply?.body || "").toString();
  if (!bodyRaw) return;
  if (startsWithEmoji(bodyRaw)) return;
  const input = cleanInput(bodyRaw);
  if (!input) return;
  
  if (keywords.includes(input)) {
    return talkWithBot(api, event.threadID, event.messageID, event.senderID, input, true);
  }
  
  const matchedKeyword = keywords.find(k => input === k || input.startsWith(k + " "));
  if (matchedKeyword) {
    const query = input.startsWith(matchedKeyword + " ") ? input.slice(matchedKeyword.length).trim() : "";
    if (query) {
      try {
        const checkShort = await axios.get(`${await getAPIBase()}/rakib`, { params: { text: query, uid: event.senderID, font: 1 } });
        if (checkShort.data?.taught) {
          return talkWithBot(api, event.threadID, event.messageID, event.senderID, query, false);
        }
        
        const checkFull = await axios.get(`${await getAPIBase()}/rakib`, { params: { text: input, uid: event.senderID, font: 1 } });
        if (checkFull.data?.taught) {
          return talkWithBot(api, event.threadID, event.messageID, event.senderID, input, false);
        }
        
        const msgRes = await axios.get(`${await getAPIBase()}/rakib/msg`, { params: { ask: input } });
        let replies = [];
        if (Array.isArray(msgRes.data?.messages)) replies = msgRes.data.messages;
        else if (Array.isArray(msgRes.data?.replies)) replies = msgRes.data.replies;
        else if (Array.isArray(msgRes.data?.data)) replies = msgRes.data.data;
        else if (Array.isArray(msgRes.data)) replies = msgRes.data;
        else if (typeof msgRes.data === "string") replies = [msgRes.data];
        
        if (replies && replies.length > 0) {
          if (replies.length === 1) {
            const single = typeof replies[0] === "string" ? replies[0] : (replies[0].ans || replies[0].answer || replies[0].text || JSON.stringify(replies[0]));
            return sendMessage(api, event.threadID, single, event.messageID);
          } else {
            const formatted = replies.map((r, i) => `${i + 1}. ${typeof r === "string" ? r : (r.ans || r.answer || r.text || JSON.stringify(r))}`).join("\n\n");
            return sendMessage(api, event.threadID, `💬 Found replies for your message:\n\n${formatted}`, event.messageID);
          }
        }
        
        return sendMessage(api, event.threadID, "Please teach me this sentence! 🦆💨", event.messageID);
        
      } catch (err) {
        console.error("keyword+sentence handling error (fallback):", err?.message || err);
        return talkWithBot(api, event.threadID, event.messageID, event.senderID, input, false);
      }
    } else {
      return talkWithBot(api, event.threadID, event.messageID, event.senderID, matchedKeyword, true);
    }
  }
};

module.exports.onReply = async ({ api, event, Reply }) => {
  try {
    const { senderID, threadID, messageID } = event;
    if (!Reply || !Reply.type) return;
    
    if (Reply.type === "pagination") {
      if (Reply.author && Reply.author !== senderID) {
        return api.sendMessage("🔒 Only the requester can control pagination..😴", threadID, messageID);
      }
      
      const text = (event.body || event.text || "").toString().trim().toLowerCase();
      if (!text) return;
      
      let newPage = Reply.page || 1;
      const pageNum = parseInt(text);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= Reply.totalPages) {
        newPage = pageNum;
      } else if (text.includes("next") || text === "n") newPage++;
      else if (text.includes("prev") || text === "pr") newPage--;
      else if (text.includes("close") || text === "c") {
        try { await api.unsendMessage(Reply.currentMessageID || Reply.messageID); } catch {}
        return;
      } else {
        return api.sendMessage('Reply with a page number / "next" / "prev" / "close".', threadID, messageID);
      }
      
      newPage = Math.max(1, Math.min(newPage, Reply.totalPages || 1));
      const perPage = 15;
      const start = (newPage - 1) * perPage;
      const slice = (Reply.data || []).slice(start, start + perPage);
      
      const formatted = slice.map((m, i) => {
        const ask = m.ask || m.q || "Unknown";
        let answers = m.ans ?? m.answers ?? m.reply ?? m.replies ?? m.answer ?? [];
        if (typeof answers === "string") answers = [answers];
        if (!Array.isArray(answers)) answers = Array.from(answers || []);
        const answersText = answers.length ? answers.join(", ") : "—";
        return `${start + i + 1}. ${ask}\n   💬 ${answersText}`;
      }).join("\n\n");
      
      const textMsg = `📚 All taught messages — Page ${newPage}/${Reply.totalPages}\n\n${formatted}\n\nReply with a page number / "next" / "prev" / "close".`;
      
      if (Reply.currentMessageID) {
        try { await api.unsendMessage(Reply.currentMessageID); } catch {}
      }
      
      const sentMsg = await api.sendMessage(textMsg, threadID);
      global.GoatBot.onReply.set(sentMsg.messageID, {
        ...Reply,
        page: newPage,
        currentMessageID: sentMsg.messageID,
      });
      
      return;
    }
    
    if (Reply.type === "reply") {
      const userMsg = (event.body || event.text || "").toString().trim();
      if (!userMsg) return;
      return talkWithBot(api, threadID, messageID, senderID, userMsg, false);
    }
    
  } catch (err) {
    console.error("onReply error:", err?.message || err);
    return cError(api, event.threadID, event.messageID);
  }
};
