"use strict";

const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs-extra");
const path = require("path");
const { exec } = require("child_process");

const WORKDIR = process.cwd();
const COMMANDS_DIR = path.join(WORKDIR, "scripts", "cmds");
const EVENTS_DIR = path.join(WORKDIR, "scripts", "events");

const DEFAULT_CONFIG = {
  enable: true,
  provider: "openrouter",
  openrouter: {
    apiKey: "",
    model: "google/gemini-2.5-flash",
    siteUrl: "https://github.com/sheikhtamimlover/ST-BOT",
    title: "STAI",
    temperature: 0.45,
    maxTokens: 4000,
    reasoningEffort: "medium"
  },
  groq: {
    apiKey: "",
    model: "qwen/qwen3-32b",
    temperature: 0.6,
    maxTokens: 1024,
    topP: 0.95,
    maxProjectContextChars: 2000,
    maxMemoryMessages: 3
  },
  stfree: {
    model: "@cf/openai/gpt-oss-120b",
    accountId: "",
    apiToken: ""
  },
  maxToolRounds: 4,
  maxProjectContextChars: 36000,
  maxFileChars: 52000,
  maxSearchFiles: 200,
  maxSearchResults: 30,
  maxImages: 2,
  maxMemoryMessages: 12,
  shellTimeoutMs: 45000,
  shellMaxBuffer: 1024 * 1024 * 2,
  replyChunkSize: 1800,
  allowShell: true,
  allowFileRead: true,
  allowFileWrite: true,
  allowApiTools: true,
  allowWebSearch: true,
  allowMatureLanguage: true,
  saveChatHistory: true
};

function getAgentConfig() {
  const cfg = global.GoatBot?.config?.stai || {};
  const merged = { ...DEFAULT_CONFIG, ...cfg };
  for (const provider of ["openrouter", "groq", "stfree"]) {
    merged[provider] = { ...(DEFAULT_CONFIG[provider] || {}), ...(cfg[provider] || {}) };
  }
  return merged;
}

function truncate(text, max) {
  text = String(text || "");
  if (text.length <= max) return text;
  return text.slice(0, max) + `\n...[truncated ${text.length - max} chars]`;
}

function normalizeSlash(value) {
  return String(value || "").replace(/\\/g, "/");
}

function workspacePath(input) {
  const abs = path.resolve(WORKDIR, input || ".");
  const rel = path.relative(WORKDIR, abs);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("Path is outside the project workspace");
  }
  return abs;
}

function relativePath(abs) {
  return normalizeSlash(path.relative(WORKDIR, abs));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractPathRefs(text) {
  const refs = [];
  const re = /@(?:"([^"]+)"|'([^']+)'|([^\s,;]+))/g;
  let match;
  while ((match = re.exec(String(text || "")))) {
    const raw = (match[1] || match[2] || match[3] || "").trim();
    if (raw && !raw.startsWith("http")) refs.push(raw.replace(/[)\].,;:!?]+$/g, ""));
  }
  return [...new Set(refs)];
}

function extractReactionEmoji(text) {
  const cleaned = String(text || "").replace(/<@!?\d+>/g, "").trim();
  const pictos = cleaned.match(/\p{Extended_Pictographic}/gu);
  if (pictos && pictos.length) return pictos[pictos.length - 1];
  if (/\blove\b/i.test(cleaned)) return "❤️";
  if (/\bhaha\b|\blol\b/i.test(cleaned)) return "😆";
  if (/\bsad\b/i.test(cleaned)) return "😢";
  if (/\bangry\b/i.test(cleaned)) return "😡";
  return "👍";
}

function stripCodeFence(text) {
  text = String(text || "").trim();
  const fence = text.match(/```(?:javascript|js)?\s*([\s\S]*?)```/i);
  if (fence) return fence[1].trim();
  return text;
}

function isTextFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return [
    ".js", ".mjs", ".cjs", ".json", ".md", ".txt", ".css", ".eta",
    ".html", ".yml", ".yaml", ".nix", ".env", ".ts", ".tsx", ".jsx"
  ].includes(ext);
}

function safeBaseName(name, fallback = "stai_item") {
  let base = String(name || "")
    .replace(/\.js$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 16);
  if (!base) base = fallback;
  if (/^\d/.test(base)) base = `st${base}`;
  return base;
}

function slugFromPrompt(prompt, fallback) {
  const stop = new Set([
    "make", "create", "build", "add", "new", "command", "cmd", "event",
    "for", "with", "using", "use", "a", "an", "the", "to", "in", "on",
    "koro", "kore", "dao", "de", "banaw", "banao", "amar", "my", "that",
    "which", "this", "bot", "user", "group", "chat", "message", "msg",
    "reply", "send", "get", "show", "display", "print", "return", "check"
  ]);
  const words = String(prompt || "")
    .toLowerCase()
    .match(/[a-z0-9]+/g);
  const useful = (words || []).filter(w => w.length > 2 && !stop.has(w)).slice(0, 2);
  return safeBaseName(useful.join("_") || fallback || "stai_cmd", fallback);
}

function splitMessage(text, size) {
  text = String(text || "");
  if (text.length <= size) return [text || "No response."];
  const chunks = [];
  let rest = text;
  while (rest.length > size) {
    let cut = rest.lastIndexOf("\n", size);
    if (cut < size * 0.45) cut = rest.lastIndexOf(" ", size);
    if (cut < size * 0.45) cut = size;
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

function redactSecrets(value, depth = 0) {
  if (depth > 5) return "[MaxDepth]";
  if (Array.isArray(value)) return value.slice(0, 30).map(v => redactSecrets(v, depth + 1));
  if (!value || typeof value !== "object") return value;
  const out = {};
  for (const [key, val] of Object.entries(value)) {
    const k = key.toLowerCase();
    if (
      k.includes("key") ||
      k.includes("token") ||
      k.includes("secret") ||
      k.includes("password") ||
      k.includes("cookie") ||
      k.includes("appstate")
    ) {
      out[key] = val ? "[REDACTED]" : val;
    } else {
      out[key] = redactSecrets(val, depth + 1);
    }
  }
  return out;
}

function redactSensitiveText(relPath, content) {
  const rel = String(relPath || "").toLowerCase();
  if (!/(config|account|cookie|fbstate|state|session|token|secret|password|credential)/.test(rel)) {
    return content;
  }
  let text = String(content || "");
  text = text.replace(/sk-or-v1-[a-z0-9]+/gi, "[REDACTED_OPENROUTER_KEY]");
  text = text.replace(/("[^"]*(?:apiKey|token|secret|password|cookie|xs|c_user|datr|fr|sb)[^"]*"\s*:\s*)"[^"]*"/gi, "$1\"[REDACTED]\"");
  text = text.replace(/((?:apiKey|token|secret|password|cookie|xs|c_user|datr|fr|sb)\s*=\s*)[^\s;]+/gi, "$1[REDACTED]");
  return text;
}

function sanitizeSecrets(content) {
  let text = String(content || "");
  text = text.replace(/sk-or-v1-[a-z0-9]+/gi, "[REDACTED_OPENROUTER_KEY]");
  text = text.replace(/("[^"]*(?:apiKey|token|secret|password|cookie|xs|c_user|datr|fr|sb)[^"]*"\s*:\s*)"[^"]*"/gi, "$1\"[REDACTED]\"");
  text = text.replace(/((?:apiKey|token|secret|password|cookie|xs|c_user|datr|fr|sb)\s*=\s*)[^\s;]+/gi, "$1[REDACTED]");
  return text;
}

function providerMessageFromResponse(data) {
  if (!data) return "";
  if (typeof data === "string") return sanitizeSecrets(data);
  const message = data.error?.message || data.message || data.error;
  if (typeof message === "string") return sanitizeSecrets(message);
  return sanitizeSecrets(JSON.stringify(redactSecrets(data)).slice(0, 600));
}

function formatStaiError(err) {
  if (err?.response) {
    const status = err.response.status;
    const statusText = err.response.statusText ? ` ${err.response.statusText}` : "";
    const providerText = providerMessageFromResponse(err.response.data);

    if (status === 401 || status === 403) {
      return [
        `STAI provider error ${status}${statusText}: API key was rejected.`,
        "Check config.stai.apiKey or OPENROUTER_API_KEY, then restart/reload the bot.",
        providerText ? `Provider says: ${providerText}` : ""
      ].filter(Boolean).join("\n");
    }

    if (status === 402) {
      return [
        `STAI provider error 402${statusText}: payment/credits required.`,
        "Your OpenRouter key/account has no usable credits for the selected model, or that model needs paid credits.",
        "Fix: add OpenRouter credits or change config.stai.model to a model available for your account, then restart/reload the bot.",
        providerText ? `Provider says: ${providerText}` : ""
      ].filter(Boolean).join("\n");
    }

    if (status === 404) {
      return [
        `STAI provider error 404${statusText}: selected model was not found or is unavailable.`,
        "Check config.stai.model, then restart/reload the bot.",
        providerText ? `Provider says: ${providerText}` : ""
      ].filter(Boolean).join("\n");
    }

    if (status === 429) {
      return [
        `STAI provider error 429${statusText}: rate limit reached.`,
        "Wait a bit or use a key/model with more available rate limit.",
        providerText ? `Provider says: ${providerText}` : ""
      ].filter(Boolean).join("\n");
    }

    return [
      `STAI provider error ${status}${statusText}.`,
      providerText ? `Provider says: ${providerText}` : ""
    ].filter(Boolean).join("\n");
  }

  if (err?.request && !err.response) {
    return "STAI provider request failed: no response received. Check internet/DNS/firewall, then try again.";
  }

  return `STAI error: ${sanitizeSecrets(err?.message || String(err))}`;
}

function parseJsonObject(text) {
  // Strip <think>...</think> reasoning blocks (Groq/qwen chain-of-thought)
  let raw = String(text || "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  raw = stripCodeFence(raw);
  try {
    return JSON.parse(raw);
  } catch (_) {
    const first = raw.indexOf("{");
    const last = raw.lastIndexOf("}");
    if (first !== -1 && last > first) {
      try {
        return JSON.parse(raw.slice(first, last + 1));
      } catch (_) {
        return null;
      }
    }
  }
  return null;
}

function stripThinkBlocks(text) {
  return String(text || "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

function firstConfigName(code, fallback) {
  const match = String(code || "").match(/\bname\s*:\s*["'`]([^"'`]+)["'`]/);
  return safeBaseName(match && match[1], fallback);
}

function replaceConfigName(code, name) {
  if (!/\bname\s*:\s*["'`][^"'`]+["'`]/.test(code)) return code;
  return code.replace(/\bname\s*:\s*["'`][^"'`]+["'`]/, `name: "${name}"`);
}

function ensureJsFileName(name) {
  return `${safeBaseName(name)}.js`;
}

function getDirForFolder(folder) {
  return folder === "events" ? EVENTS_DIR : COMMANDS_DIR;
}

class STAgent {
  constructor(params = {}) {
    this.params = params;
    this.config = getAgentConfig();
  }

  async handle(params = this.params) {
    this.params = params;
    this.config = getAgentConfig();

    if (this.config.enable === false) {
      return params.message.reply("STAI is disabled in config.json.");
    }

    const intent = this.parseIntent(params.args || [], params.event || {});
    if (intent.type === "help") return this.sendHelp();
    if (intent.type === "clear_history") return this.clearSessionHistory();

    const _provider = this.config.provider || "openrouter";
    const _pc = this.getProviderConfig();
    const _hasKey = (
      (_provider === "openrouter" && (_pc.apiKey || this.config.apiKey || process.env.OPENROUTER_API_KEY)) ||
      (_provider === "groq" && (_pc.apiKey || process.env.GROQ_API_KEY)) ||
      (_provider === "stfree" && _pc.accountId && _pc.apiToken)
    );
    if (!_hasKey) {
      const hints = { openrouter: "config.stai.openrouter.apiKey", groq: "config.stai.groq.apiKey", stfree: "config.stai.stfree.accountId + apiToken" };
      return params.message.reply(`STAI ${_provider} credentials missing. Set ${hints[_provider] || "provider config"} then restart bot.`);
    }

    try {
      let result;
      if (intent.type === "create_command") {
        result = await this.createItem("cmds", intent);
      } else if (intent.type === "create_event") {
        result = await this.createItem("events", intent);
      } else if (intent.type === "fix_command") {
        result = await this.fixItems("cmds", intent);
      } else if (intent.type === "fix_event") {
        result = await this.fixItems("events", intent);
      } else if (intent.type === "read_file") {
        result = await this.directRead(intent.path);
      } else if (intent.type === "find_file") {
        result = await this.directFind(intent.query);
      } else if (intent.type === "inventory") {
        result = await this.directInventory(intent.kind);
      } else if (intent.type === "identity") {
        result = await this.directIdentity();
      } else if (intent.type === "shell") {
        result = { text: await this.runShell(intent.command), registerReply: false };
      } else if (intent.type === "unsend_reply") {
        await params.api.unsendMessage(intent.messageID);
        result = { text: `Unsent replied message: ${intent.messageID}`, registerReply: false };
      } else if (intent.type === "react_reply") {
        await params.api.setMessageReaction(intent.emoji, intent.messageID, null, true);
        result = { text: `Reacted ${intent.emoji} to replied message.`, registerReply: false };
      } else if (intent.type === "switch_provider") {
        result = await this.switchProvider(intent.provider);
      } else {
        result = await this.chat(intent.prompt);
      }

      return this.sendText(result.text || result, result.registerReply !== false, result.history || null);
    } catch (err) {
      return this.sendText(formatStaiError(err), false);
    }
  }

  async handleReply(params = this.params) {
    this.params = params;
    this.config = getAgentConfig();
    const prompt = params.event?.body || "";
    if (!prompt.trim()) return;
    try {
      const reply = await this.chat(prompt, params.Reply?.history || []);
      return this.sendText(reply.text, true, reply.history);
    } catch (err) {
      return this.sendText(formatStaiError(err), false);
    }
  }

  sessionKey() {
    const event = this.params.event || {};
    return `${event.threadID || "unknown"}:${event.senderID || event.userID || "unknown"}`;
  }

  memoryStore() {
    if (!global.GoatBot.staiMemory) global.GoatBot.staiMemory = new Map();
    return global.GoatBot.staiMemory;
  }

  getSessionHistory() {
    return this.memoryStore().get(this.sessionKey()) || [];
  }

  setSessionHistory(history) {
    const trimmed = this.normalizeHistory(history).slice(-this.config.maxMemoryMessages);
    this.memoryStore().set(this.sessionKey(), trimmed);
    return trimmed;
  }

  async switchProvider(provider) {
    const valid = ["openrouter", "groq", "stfree"];
    const labels = { openrouter: "OpenRouter (openrouter.ai)", groq: "Groq (console.groq.com)", stfree: "StFree (Cloudflare AI)" };
    if (!provider || !valid.includes(provider)) {
      const current = this.config.provider || "openrouter";
      const pc = this.getProviderConfig();
      return {
        text: [
          `Current provider: ${current} — ${labels[current] || current}`,
          `Current model: ${pc.model || "(default)"}`,
          "",
          "Valid providers:",
          "  openrouter — openrouter.ai (many models, supports gemini, gpt, claude, etc.)",
          "  groq       — console.groq.com (fast inference, qwen, llama, mixtral)",
          "  stfree     — Cloudflare Workers AI (free tier, gpt-oss-120b, llama, gemma)",
          "",
          "Usage: !stai -provider openrouter | !stai -provider groq | !stai -provider stfree"
        ].join("\n"),
        registerReply: false
      };
    }
    if (global.GoatBot?.config?.stai) {
      global.GoatBot.config.stai.provider = provider;
    }
    this.config = getAgentConfig();
    const pc = this.getProviderConfig();
    return {
      text: `✅ STAI provider switched to "${provider}" (${labels[provider]}).\nModel: ${pc.model || "(default)"}`,
      registerReply: false
    };
  }

  async clearSessionHistory() {
    this.memoryStore().delete(this.sessionKey());
    return this.params.message.reply("STAI memory cleared for this chat. New context started.");
  }

  parseIntent(args, event) {
    const first = (args[0] || "").toLowerCase();
    const rest = args.slice(1);
    const promptFromArgs = args.join(" ").trim();
    const replyBody = event.messageReply?.body || "";

    if (first === "help" || first === "-h" || first === "--help") {
      return { type: "help" };
    }
    if (first === "-clear" || first === "--clear" || first === "clear") {
      return { type: "clear_history" };
    }

    if (!first) {
      if (!promptFromArgs && !replyBody) return { type: "help" };
    }

    if (["-c", "--command", "createcmd", "cmdcreate"].includes(first)) {
      const parsed = this.parseCreate(rest, "command");
      return { type: "create_command", ...parsed };
    }
    if (["-e", "--event", "createevent", "eventcreate"].includes(first)) {
      const parsed = this.parseCreate(rest, "event");
      return { type: "create_event", ...parsed };
    }
    if (["-fc", "--fix-command", "fixcmd"].includes(first)) {
      const parsed = this.parseFix(rest, "cmds");
      return { type: "fix_command", ...parsed };
    }
    if (["-fe", "--fix-event", "fixevent"].includes(first)) {
      const parsed = this.parseFix(rest, "events");
      return { type: "fix_event", ...parsed };
    }
    if (promptFromArgs && event.messageReply?.messageID && /(unsend|delete|remove)\s+(this\s+)?(msg|message)|message\s+(unsend|delete|remove)/i.test(promptFromArgs)) {
      return { type: "unsend_reply", messageID: event.messageReply.messageID };
    }
    if (promptFromArgs && event.messageReply?.messageID && /\breact\b|\breaction\b|রিয়েক্ট|react\s+kor|react\s+koro/i.test(promptFromArgs)) {
      return { type: "react_reply", messageID: event.messageReply.messageID, emoji: extractReactionEmoji(promptFromArgs) };
    }

    if (["-read", "--read"].includes(first)) {
      return { type: "read_file", path: rest.join(" ").trim() };
    }
    if (first === "read" && extractPathRefs(promptFromArgs).length) {
      return { type: "read_file", path: extractPathRefs(promptFromArgs).map(ref => `@${ref}`).join(" ") };
    }
    if (["-find", "--find", "find", "searchfile", "where"].includes(first)) {
      return { type: "find_file", query: rest.join(" ").trim() };
    }
    if (["commands", "cmds", "commandlist", "cmdlist"].includes(first)) {
      return { type: "inventory", kind: "commands" };
    }
    if (["events", "eventlist"].includes(first)) {
      return { type: "inventory", kind: "events" };
    }
    if (/\b(my|amar|আমার)\s+(uid|id|name)\b|\bwho\s+am\s+i\b|\bwhoami\b/i.test(promptFromArgs)) {
      return { type: "identity" };
    }
    if (["-sh", "--shell", "shell"].includes(first)) {
      return { type: "shell", command: rest.join(" ").trim() };
    }
    if (["-provider", "--provider", "provider"].includes(first)) {
      return { type: "switch_provider", provider: (rest[0] || "").toLowerCase().trim() };
    }

    return {
      type: "chat",
      prompt: promptFromArgs || replyBody || "Introduce yourself and explain what you can do in this bot."
    };
  }

  parseCreate(rest, itemType) {
    let prompt = rest.join(" ").trim();
    let names = [];

    if (rest[0] && (rest[0].endsWith(".js") || rest[0].includes(","))) {
      names = rest[0].split(",").map(v => safeBaseName(v)).filter(Boolean);
      prompt = rest.slice(1).join(" ").trim();
    }

    const tagged = prompt.match(/\b(?:name|names|file|called|named)\s*[:=]\s*([a-zA-Z0-9_, .-]+)/);
    if (!names.length && tagged) {
      names = tagged[1]
        .split(/[, ]+/)
        .map(v => safeBaseName(v))
        .filter(Boolean)
        .slice(0, 5);
    }

    if (!prompt) prompt = `Create a useful ${itemType}.`;
    if (!names.length) names = [slugFromPrompt(prompt, itemType === "event" ? "stai_event" : "stai_cmd")];

    return { prompt, names };
  }

  parseFix(rest, folder) {
    const dir = getDirForFolder(folder);
    // Read actual dir listing once for case-insensitive matching
    let dirFiles = [];
    try { dirFiles = fs.readdirSync(dir).filter(f => f.endsWith(".js")); } catch (_) {}
    const findFile = (token) => {
      const clean = token.replace(/,$/, "").trim();
      if (!clean) return null;
      // Try exact match
      const exact = clean.endsWith(".js") ? clean : `${clean}.js`;
      if (dirFiles.includes(exact)) return exact;
      // Case-insensitive match
      const lower = exact.toLowerCase();
      return dirFiles.find(f => f.toLowerCase() === lower) || null;
    };
    const files = [];
    let index = 0;
    for (; index < rest.length; index++) {
      const found = findFile(rest[index]);
      if (found) {
        files.push(found);
      } else {
        break;
      }
    }
    return {
      files,
      prompt: rest.slice(index).join(" ").trim() || "Fix bugs, syntax errors, and loader compatibility issues while preserving behavior."
    };
  }

  async sendHelp() {
    const prefix = this.params.prefix || global.GoatBot?.config?.prefix || "!";
    const text = [
      "STAI - Sheikh Tamim project agent",
      "",
      `${prefix}stai <prompt>`,
      `${prefix}stai -c name.js <command request>`,
      `${prefix}stai -e name.js <event request>`,
      `${prefix}stai -fc file1.js file2.js <fix request>`,
      `${prefix}stai -fe event1.js <fix request>`,
      `${prefix}stai -read path/to/file.js`,
      `${prefix}stai -sh <shell command>`,
      `${prefix}stai -clear`,
      `${prefix}stai -provider <openrouter|groq|stfree>`,
      "",
      "Reply to an STAI answer to continue the same chat. Reply to an image or send an image with your prompt for vision."
    ].join("\n");
    return this.params.message.reply(text);
  }

  async sendText(text, registerReply = false, history = null) {
    const chunks = splitMessage(text, this.config.replyChunkSize);
    let firstInfo = null;
    for (let i = 0; i < chunks.length; i++) {
      if (i === 0) {
        firstInfo = await this.params.message.reply(chunks[i]);
      } else {
        await this.params.message.send(chunks[i]);
      }
    }

    if (registerReply && firstInfo?.messageID) {
      global.GoatBot.onReply.set(firstInfo.messageID, {
        commandName: "stai",
        messageID: firstInfo.messageID,
        author: this.params.event.senderID,
        type: "chat",
        history: history || []
      });
    }
    return firstInfo;
  }

  getProviderConfig() {
    const provider = this.config.provider || "openrouter";
    return this.config[provider] || {};
  }

  async callProvider(messages, options = {}) {
    const provider = this.config.provider || "openrouter";
    if (provider === "groq") return this.callGroq(messages, options);
    if (provider === "stfree") return this.callStFree(messages, options);
    return this.callOpenRouter(messages, options);
  }

  async callOpenRouter(messages, options = {}) {
    const pc = this.getProviderConfig();
    const apiKey = pc.apiKey || this.config.apiKey || process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OpenRouter API key missing. Set config.stai.openrouter.apiKey or OPENROUTER_API_KEY.");
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: options.model || pc.model || "google/gemini-2.5-flash",
        messages,
        temperature: options.temperature ?? pc.temperature ?? 0.45,
        max_completion_tokens: options.maxTokens || pc.maxTokens || 4000,
        top_p: 1,
        stream: true,
        reasoning_effort: options.reasoningEffort || pc.reasoningEffort || "medium",
        stop: null
      },
      {
        timeout: options.timeout || 120000,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": pc.siteUrl || "https://github.com/sheikhtamimlover/ST-BOT",
          "X-Title": pc.title || "STAI"
        },
        responseType: "stream"
      }
    );

    return new Promise((resolve, reject) => {
      let collected = "";
      response.data.on("data", (chunk) => {
        const text = chunk.toString();
        const lines = text.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.replace("data: ", "").trim();
          if (data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) collected += delta;
          } catch (_) {}
        }
      });
      response.data.on("end", () => {
        if (!collected) return reject(new Error("OpenRouter returned an empty response"));
        resolve(collected);
      });
      response.data.on("error", reject);
    });
  }

  async callGroq(messages, options = {}) {
    const { Groq } = require("groq-sdk");
    const pc = this.getProviderConfig();
    const apiKey = pc.apiKey || process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("Groq API key missing. Set config.stai.groq.apiKey or GROQ_API_KEY.");
    const groq = new Groq({ apiKey });
    const safeMessages = messages.map(m => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content : JSON.stringify(m.content)
    }));
    const chatCompletion = await groq.chat.completions.create({
      messages: safeMessages,
      model: options.model || pc.model || "qwen/qwen3-32b",
      temperature: options.temperature ?? pc.temperature ?? 0.6,
      max_completion_tokens: options.maxTokens || pc.maxTokens || 1024,
      top_p: pc.topP ?? 0.95,
      stream: true,
      stop: null
    });
    let collected = "";
    for await (const chunk of chatCompletion) {
      collected += chunk.choices[0]?.delta?.content || "";
    }
    if (!collected) throw new Error("Groq returned an empty response");
    return collected;
  }

  async callStFree(messages, options = {}) {
    const pc = this.getProviderConfig();
    const accountId = pc.accountId;
    const apiToken = pc.apiToken;
    if (!accountId || !apiToken) {
      throw new Error("StFree provider: accountId and apiToken required. Set config.stai.stfree.accountId and config.stai.stfree.apiToken.");
    }
    const model = options.model || pc.model || "@cf/openai/gpt-oss-120b";
    const input = messages.map(m => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content : JSON.stringify(m.content)
    }));
    const response = await axios.post(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/responses`,
      { input, model },
      {
        headers: {
          "Content-Type": "application/json",
          "authorization": `Bearer ${apiToken}`,
          "User-Agent": "STAI-Bot/1.0"
        },
        timeout: options.timeout || 120000
      }
    );
    const output = response.data?.output;
    if (!Array.isArray(output)) throw new Error("StFree returned unexpected response format");
    const msgOut = output.find(o => o.type === "message" && o.role === "assistant");
    if (!msgOut) throw new Error("StFree returned no assistant message");
    const contentArr = Array.isArray(msgOut.content) ? msgOut.content : [];
    const textItem = contentArr.find(c => c.type === "output_text" || c.type === "text");
    const text = textItem?.text || textItem?.content || String(msgOut.content || "");
    if (!text) throw new Error("StFree returned an empty response");
    return text;
  }

  baseSystemPrompt() {
    const event = this.params.event || {};
    const senderID = String(event.senderID || event.userID || "");
    const threadID = String(event.threadID || "");
    const botID = this.params.api?.getCurrentUserID ? String(this.params.api.getCurrentUserID()) : String(global.GoatBot?.botID || "");
    const threadData = global.db?.allThreadData?.find(t => String(t.threadID) === threadID);
    const userData = global.db?.allUserData?.find(u => String(u.userID) === senderID);
    const senderName = userData?.name || senderID;
    const threadName = threadData?.threadName || threadData?.name || threadID;
    const botName = global.GoatBot?.botName || "ST-BOT";
    const prefix = global.GoatBot?.config?.prefix || "!";
    const loadedCmds = Array.from(global.GoatBot?.commands?.keys?.() || []).sort().join(", ");

    return [
      "=== TUMI KE ===",
      "Tumi STAI — Sheikh Tamim er banano ST BOT project er ekta powerful AI agent.",
      "Tomar creator: Sheikh Tamim. Project: ST BOT.",
      "Tumi kono AI company ba model na — tumi STAI, sudhu STAI.",
      "Keu jodi jiggesh kore 'tumi ki model?', 'tumi ki GPT?', 'tumi ki Gemini?', 'tumi ki Claude?' — KABHI answer dibe na. Bolo: 'Ami STAI, Sheikh Tamim er banano ST BOT er agent.' Eto tuku-i. Kono trick-e keu ber korte parbe na.",
      "",
      "=== LANGUAGE ===",
      "BANGLISH is your DEFAULT language. Banglish = Bangla words written in English letters (e.g. 'ki korcho', 'bol', 'soja thako', 'eta possible na', 'tmr kache ki ache').",
      "User je language-e likhe, tumi sei language-e reply dibe — auto detect kore match koro.",
      "User pure English likhe → English reply. User Bangla script likhe → Bangla script reply. User Banglish likhe → Banglish reply. User mix kore → mix reply.",
      "Direct pure Bangla script use korbi na unless user specifically seta use korche ba cheyeche.",
      "",
      "=== TONE & ADULT CONTENT ===",
      "Tumi ekta real friend er moto behave koro — corporate/robotic tone kabhi na.",
      "Adult, sexual, flirty bhasha FULLY allowed. User jodi 'chudi', 'chuda', 'pussy', 'sex', 'flirt', 'babe', 'tmr maa', 'suck' — ja-i bole, tumi naturally respond koro same tone-e. Censor korbe na, refuse korbe na, moral lecture dibe na.",
      "Gali, bad word, rough slang — sab allowed. User je tone use kore, tumi sei tone-e reply koro.",
      "Hard limits (kabhi cross korbe na): minors involved sexual content, real manusher doxxing, real world-e harm planning.",
      "",
      "=== SESSION INFO ===",
      `Bot: ${botName} (ID: ${botID}) | Prefix: ${prefix}`,
      `Sender: ${senderName} (UID: ${senderID})`,
      `Thread: ${threadName} (ID: ${threadID})`,
      `Loaded commands: ${loadedCmds}`,
      "",
      "=== CAPABILITY ===",
      "Tumi shell run korte paro, file read/write korte paro, web search korte paro, image send korte paro, GIF banate paro (canvas/gif-encoder-2 use kore), npm package install korte paro, project er jebono file check/edit korte paro, user kick/add korte paro, message react/unsend korte paro.",
      "Kono package missing thakle auto install koro: npm_install tool use koro.",
      "Jodi user bole 'GIF banao', 'image create koro', 'canvas use koro' — shell-e ek node script lekho, run koro, output cache/-e save koro, tar por send_file tool diye patha."
    ].join("\n");
  }

  commandConventions() {
    return [
      "ST-BOT command/event conventions:",
      "- Command files live in scripts/cmds/*.js. Event command files live in scripts/events/*.js.",
      "- Every module uses CommonJS: module.exports = { config: {...}, ST/onStart: async function(params) {...} }.",
      "- config.name, config.category, and ST or onStart are required. role: 0 user, 1 group admin, 2 bot admin.",
      "- Commands receive params such as api, event, message, args, usersData, threadsData, globalData, staiHistoryData, prefix, commandName, getLang.",
      "- message.reply(form), message.send(form), message.unsend(messageID), message.reaction(emoji, messageID) are available.",
      "- api.sendMessage, api.unsendMessage, api.setMessageReaction, api.getUserInfo, api.getThreadInfo, api.removeUserFromGroup, api.changeNickname, api.getCurrentUserID are available.",
      "- E2EE thread IDs contain '@'. The project routes sendMessage, reaction, edit, unsend through the E2EE bridge where possible.",
      "- Attachments are in event.attachments and event.messageReply.attachments. For images, use attachment.url. For local generated media, send fs.createReadStream(filePath).",
      "- canvas and gif-encoder-2 are already dependencies. Prefer existing dependencies from package.json.",
      "- If a generated command/event requires a missing npm package, the project loader scans require(...) calls and installs it automatically.",
      "- For one-off generated media, you can use shell to create a short Node script, run it, save output under cache/temp, then use send_file.",
      "- When the user asks for canvas or gif-encoder-2 output, generate the file and send it instead of only explaining.",
      "- Do not include generated code in chat success messages unless explicitly asked."
    ].join("\n");
  }

  async projectContext(extraFiles = [], maxChars = null) {
    const ctxLimit = maxChars || this.config.maxProjectContextChars;
    const lines = [];
    lines.push(this.commandConventions());
    lines.push(`Connected bot account:\n${JSON.stringify(await this.botAccountInfo(false), null, 2)}`);

    try {
      const pkg = JSON.parse(await fs.readFile(path.join(WORKDIR, "package.json"), "utf8"));
      lines.push(`package.json dependencies:\n${JSON.stringify(pkg.dependencies || {}, null, 2)}`);
    } catch (_) {}

    try {
      const cfg = redactSecrets(global.GoatBot?.config || {});
      lines.push(`config.json redacted snapshot:\n${truncate(JSON.stringify(cfg, null, 2), 7000)}`);
    } catch (_) {}

    lines.push(`Loaded command names: ${Array.from(global.GoatBot?.commands?.keys?.() || []).slice(0, 260).join(", ")}`);
    lines.push(`Loaded event names: ${Array.from(global.GoatBot?.eventCommands?.keys?.() || []).slice(0, 120).join(", ")}`);
    lines.push(`Project inventory:\n${JSON.stringify(await this.projectInventory(), null, 2)}`);

    const fileList = await this.listProjectFiles(260);
    lines.push(`Project file map (trimmed):\n${fileList.join("\n")}`);

    const important = [
      "bot/login/loadScripts.js",
      "bot/handler/handlerEvents.js",
      "bot/handler/handlerAction.js",
      "database/controller/index.js",
      "bot/login/login.js",
      "utils.js",
      "Goat.js",
      "fca/index.js",
      "fca/utils.js",
      "fca/e2ee.js",
      "fca/src/listenMqtt.js",
      "fca/src/sendMessage.js",
      ...extraFiles
    ];
    const uniqueImportant = [...new Set(important)];
    let budget = this.config.maxProjectContextChars;
    const snippets = [];
    for (const rel of uniqueImportant) {
      if (budget <= 0) break;
      try {
        const file = workspacePath(rel);
        if (!await fs.pathExists(file) || !isTextFile(file)) continue;
        const content = redactSensitiveText(rel, await fs.readFile(file, "utf8"));
        const part = truncate(content, Math.min(9000, budget));
        budget -= part.length;
        snippets.push(`--- ${rel} ---\n${part}`);
      } catch (_) {}
    }
    lines.push(`Relevant source excerpts:\n${snippets.join("\n\n")}`);
    return truncate(lines.join("\n\n"), ctxLimit);
  }

  async listProjectFiles(limit = 500) {
    const output = [];
    const skip = new Set([".git", "node_modules", "database/data"]);
    const walk = async (dir) => {
      if (output.length >= limit) return;
      const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
      for (const entry of entries) {
        if (output.length >= limit) return;
        const abs = path.join(dir, entry.name);
        const rel = relativePath(abs);
        if ([...skip].some(s => rel === s || rel.startsWith(`${s}/`))) continue;
        if (entry.isDirectory()) await walk(abs);
        else output.push(rel);
      }
    };
    await walk(WORKDIR);
    return output;
  }

  async projectInventory() {
    const readDir = async (rel) => {
      const abs = path.join(WORKDIR, rel);
      const items = await fs.readdir(abs).catch(() => []);
      return items.filter(name => name.endsWith(".js")).sort();
    };
    const rootDirs = (await fs.readdir(WORKDIR, { withFileTypes: true }).catch(() => []))
      .filter(entry => entry.isDirectory() && ![".git", "node_modules"].includes(entry.name))
      .map(entry => entry.name)
      .sort();

    return {
      rootDirs,
      commandsDir: "scripts/cmds",
      eventsDir: "scripts/events",
      commands: (await readDir("scripts/cmds")).slice(0, 260),
      events: (await readDir("scripts/events")).slice(0, 120),
      fcaCore: [
        "fca/index.js",
        "fca/utils.js",
        "fca/e2ee.js",
        "fca/lib/index.mjs",
        "fca/src/listenMqtt.js",
        "fca/src/sendMessage.js",
        "fca/src/setMessageReaction.js",
        "fca/src/unsendMessage.js",
        "fca/src/editMessage.js"
      ],
      database: [
        "database/controller/index.js",
        "database/controller/staiHistoryData.js",
        "database/models/sqlite/staiHistory.js",
        "database/models/mongodb/staiHistory.js"
      ]
    };
  }

  async resolveProjectReference(ref) {
    if (!ref) throw new Error("Path reference is empty");
    let raw = String(ref).trim();
    if (raw.startsWith("@")) raw = raw.slice(1);
    raw = normalizeSlash(raw).replace(/^\/+/, "");

    const candidates = [];
    const add = value => {
      if (value && !candidates.includes(value)) candidates.push(value);
    };
    add(raw);
    if (!path.extname(raw)) add(`${raw}.js`);
    add(`scripts/cmds/${raw}`);
    add(`scripts/events/${raw}`);
    add(`bot/login/${raw}`);
    add(`bot/handler/${raw}`);
    add(`fca/${raw}`);
    add(`fca/src/${raw}`);
    if (!path.extname(raw)) {
      add(`scripts/cmds/${raw}.js`);
      add(`scripts/events/${raw}.js`);
      add(`bot/login/${raw}.js`);
      add(`bot/handler/${raw}.js`);
      add(`fca/${raw}.js`);
      add(`fca/src/${raw}.js`);
    }

    for (const candidate of candidates) {
      try {
        const abs = workspacePath(candidate);
        if (await fs.pathExists(abs) && (await fs.stat(abs)).isFile()) {
          return relativePath(abs);
        }
      } catch (_) {}
    }

    const matches = await this.findFiles(raw, 8);
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) {
      const exactBase = matches.find(file => path.basename(file).toLowerCase() === path.basename(raw).toLowerCase());
      if (exactBase) return exactBase;
      throw new Error(`Ambiguous @${raw}. Matches: ${matches.join(", ")}`);
    }
    throw new Error(`File not found for @${raw}`);
  }

  async resolveRefsFromPrompt(prompt) {
    const refs = extractPathRefs(prompt);
    const files = [];
    for (const ref of refs) {
      try {
        files.push(await this.resolveProjectReference(ref));
      } catch (err) {
        files.push(`UNRESOLVED:${ref}:${err.message}`);
      }
    }
    return [...new Set(files.filter(file => !file.startsWith("UNRESOLVED:")))];
  }

  async findFiles(query = "", limit = 30) {
    const files = await this.listProjectFiles(2000);
    const q = normalizeSlash(query).replace(/^@/, "").toLowerCase();
    if (!q) return files.slice(0, limit);
    const base = path.basename(q);
    const exact = [];
    const contains = [];
    const segments = [];
    for (const file of files) {
      const low = file.toLowerCase();
      if (path.basename(low) === base || low === q) exact.push(file);
      else if (low.includes(q)) contains.push(file);
      else if (low.split("/").some(part => part.includes(base))) segments.push(file);
    }
    return [...exact, ...contains, ...segments].slice(0, limit);
  }

  async buildUserContent(prompt) {
    const refs = extractPathRefs(prompt);
    const text = [
      `User prompt:\n${prompt}`,
      "",
      refs.length ? `@file references in prompt: ${refs.join(", ")}` : "",
      "",
      `Connected bot account:\n${JSON.stringify(await this.botAccountInfo(false), null, 2)}`,
      "",
      `Current event context:\n${JSON.stringify(this.eventSummary(), null, 2)}`
    ].join("\n");

    const images = await this.collectImages();
    if (!images.length) return text;

    return [
      { type: "text", text },
      ...images.map(img => ({
        type: "image_url",
        image_url: { url: img.dataUrl }
      }))
    ];
  }

  eventSummary() {
    const event = this.params.event || {};
    const senderID = String(event.senderID || event.userID || "");
    const threadID = String(event.threadID || "");
    const botID = this.params.api?.getCurrentUserID ? String(this.params.api.getCurrentUserID()) : String(global.GoatBot?.botID || "");
    const threadData = global.db?.allThreadData?.find(t => String(t.threadID) === threadID);
    const userData = global.db?.allUserData?.find(u => String(u.userID) === senderID);
    return {
      type: event.type,
      senderID,
      senderName: userData?.name || "",
      threadID,
      threadName: threadData?.threadName || threadData?.name || "",
      botID,
      botNickname: global.GoatBot?.config?.nickNameBot || "",
      currentAccountSlot: global.GoatBot?.currentAccount || null,
      messageID: event.messageID,
      isGroup: event.isGroup,
      isE2EE: !!event.isE2EE || String(event.threadID || "").includes("@"),
      body: event.body,
      reply: event.messageReply ? {
        senderID: event.messageReply.senderID,
        messageID: event.messageReply.messageID,
        body: event.messageReply.body,
        attachments: (event.messageReply.attachments || []).map(a => ({
          type: a.type,
          mimeType: a.mimeType,
          url: a.url ? "[available]" : undefined
        }))
      } : null,
      attachments: this.attachmentInfo(false)
    };
  }

  attachmentInfo(includeUrl = false) {
    const event = this.params.event || {};
    const map = (source, attachments = []) => attachments.map((a, index) => ({
      source,
      index,
      type: a.type,
      mimeType: a.mimeType,
      filename: a.filename || a.fileName,
      width: a.width,
      height: a.height,
      duration: a.duration,
      fileSize: a.fileSize,
      url: includeUrl ? a.url : (a.url ? "[available]" : undefined),
      isE2EE: !!a.isE2EE
    }));
    return [
      ...map("message", event.attachments || []),
      ...map("reply", event.messageReply?.attachments || [])
    ];
  }

  async collectImages() {
    const event = this.params.event || {};
    const attachments = [
      ...(event.attachments || []),
      ...(event.messageReply?.attachments || [])
    ].filter(att => {
      const type = String(att.type || "").toLowerCase();
      const mime = String(att.mimeType || att.mimetype || "").toLowerCase();
      return (att.url || att.localPath || att.path) && (type.includes("photo") || type.includes("image") || type === "sticker" || mime.startsWith("image/"));
    }).slice(0, this.config.maxImages);

    const images = [];
    for (const att of attachments) {
      try {
        if (att.localPath || att.path) {
          const filePath = workspacePath(att.localPath || att.path);
          const base64 = (await fs.readFile(filePath)).toString("base64");
          const mime = att.mimeType || att.mimetype || "image/jpeg";
          images.push({ dataUrl: `data:${mime};base64,${base64}` });
          continue;
        }

        const res = await axios.get(att.url, {
          responseType: "arraybuffer",
          timeout: 30000
        });
        const mime = res.headers["content-type"] || att.mimeType || "image/jpeg";
        const base64 = Buffer.from(res.data).toString("base64");
        images.push({ dataUrl: `data:${mime};base64,${base64}` });
      } catch (_) {}
    }
    return images;
  }

  async chat(prompt, priorHistory = []) {
    const referencedFiles = await this.resolveRefsFromPrompt(prompt);
    const pc = this.getProviderConfig();
    const effectiveContextChars = pc.maxProjectContextChars || this.config.maxProjectContextChars;
    const effectiveMemoryMsgs = pc.maxMemoryMessages || this.config.maxMemoryMessages;
    const memoryHistory = (this.getSessionHistory()).slice(-effectiveMemoryMsgs);
    const system = [
      this.baseSystemPrompt(),
      await this.projectContext(referencedFiles, effectiveContextChars),
      "",
      "=== TOOL PROTOCOL ===",
      "Jodi kono action dorkar hoy ba data lagbe, SUDHU ekta raw JSON object return koro (age/pore kono text na):",
      "",
      "{\"tool\":\"shell\",\"command\":\"ls scripts/cmds\"}",
      "{\"tool\":\"read_file\",\"path\":\"scripts/cmds/stai.js\"}",
      "{\"tool\":\"write_file\",\"path\":\"scripts/cmds/newcmd.js\",\"content\":\"// code here\"}",
      "{\"tool\":\"find_files\",\"query\":\"login\"}",
      "{\"tool\":\"search_text\",\"query\":\"handleCommand\"}",
      "{\"tool\":\"list_files\",\"limit\":200}",
      "{\"tool\":\"project_inventory\",\"kind\":\"commands\"}",
      "{\"tool\":\"identity\"}",
      "{\"tool\":\"attachment_info\"}",
      "{\"tool\":\"web_search\",\"query\":\"nodejs gif encoder github\"}",
      "{\"tool\":\"fetch_url\",\"url\":\"https://example.com\"}",
      "{\"tool\":\"npm_install\",\"package\":\"gif-encoder-2\"}",
      "{\"tool\":\"api_get_user_info\",\"userID\":\"123456\"}",
      "{\"tool\":\"api_get_thread_info\",\"threadID\":\"optional\"}",
      "{\"tool\":\"api_get_all_users\"}",
      "{\"tool\":\"api_get_all_threads\"}",
      "{\"tool\":\"unsend_message\",\"messageID\":\"id\"}",
      "{\"tool\":\"react_message\",\"messageID\":\"id\",\"emoji\":\"❤️\"}",
      "{\"tool\":\"reply_to_thread\",\"text\":\"message\"}",
      "{\"tool\":\"send_message\",\"text\":\"hello\",\"threadID\":\"optional_other_thread\"}",
      "{\"tool\":\"send_file\",\"path\":\"cache/output.gif\",\"text\":\"optional caption\"}",
      "{\"tool\":\"kick_user\",\"userID\":\"uid\",\"threadID\":\"optional\"}",
      "{\"tool\":\"add_user\",\"userID\":\"uid\",\"threadID\":\"optional\"}",
      "{\"tool\":\"change_nickname\",\"userID\":\"uid\",\"nickname\":\"NewName\"}",
      "{\"tool\":\"final\",\"text\":\"answer\"}",
      "",
      "RULES:",
      "Tool calls SILENT — kono tool call er age/pore text pathabe na, sudhu JSON emit koro.",
      "Tool result pachhile continue reasoning koro ba final answer dao.",
      "GIF/image: shell-e ek node script create koro → run koro → cache/-e save koro → send_file diye patha.",
      "Package missing hole: npm_install tool use koro auto-install er jonno.",
      "Web search: web_search + fetch_url use koro current info er jonno (Google/Bing/DDG).",
      "Final answer: {\"tool\":\"final\",\"text\":\"...\"} ba plain text diye dao."
    ].join("\n");

    const messages = [
      { role: "system", content: system },
      ...this.normalizeHistory([...memoryHistory, ...priorHistory]).slice(-effectiveMemoryMsgs),
      { role: "user", content: await this.buildUserContent(prompt) }
    ];

    let finalText = null;
    for (let round = 0; round < this.config.maxToolRounds; round++) {
      const content = await this.callProvider(messages);
      const action = parseJsonObject(content);

      if (!action || !action.tool) {
        finalText = stripThinkBlocks(content);
        messages.push({ role: "assistant", content: finalText });
        break;
      }

      if (action.tool === "final") {
        finalText = String(action.text || "").trim() || stripThinkBlocks(content);
        messages.push({ role: "assistant", content: finalText });
        break;
      }

      const toolResult = await this.executeTool(action);
      messages.push({ role: "assistant", content: JSON.stringify(action) });
      messages.push({
        role: "user",
        content: `[Tool:${action.tool}] result:\n${truncate(JSON.stringify(toolResult, null, 2), 12000)}`
      });
    }

    if (!finalText) {
      messages.push({ role: "user", content: "Ekhon final answer dao plain text-e." });
      finalText = stripThinkBlocks(await this.callProvider(messages));
    }

    await this.saveHistory("chat", "conversation", "chat", prompt, true);
    const history = this.historyForReply(messages, finalText);
    this.setSessionHistory(history);

    return {
      text: finalText,
      history
    };
  }

  normalizeHistory(history) {
    if (!Array.isArray(history)) return [];
    return history
      .filter(item => item && typeof item.content === "string" && ["user", "assistant"].includes(item.role))
      .slice(-8)
      .map(item => ({ role: item.role, content: truncate(item.content, 3000) }));
  }

  historyForReply(messages, finalText) {
    const textMessages = messages
      .filter(m => typeof m.content === "string" && ["user", "assistant"].includes(m.role))
      .slice(-8)
      .map(m => ({ role: m.role, content: truncate(m.content, 3000) }));
    if (finalText) textMessages.push({ role: "assistant", content: truncate(finalText, 3000) });
    return textMessages.slice(-8);
  }

  async executeTool(action) {
    try {
      switch (action.tool) {
        case "read_file":
          return { ok: true, content: await this.readFile(action.path) };
        case "find_files":
          return { ok: true, files: await this.findFiles(action.query, Number(action.limit) || 30) };
        case "list_files":
          return { ok: true, files: await this.listProjectFiles(Number(action.limit) || 300) };
        case "search_text":
          return { ok: true, results: await this.searchText(action.query) };
        case "project_inventory":
          return { ok: true, inventory: await this.projectInventory(), kind: action.kind || "all" };
        case "identity":
          return { ok: true, text: (await this.directIdentity()).text };
        case "attachment_info":
          return { ok: true, attachments: this.attachmentInfo(true) };
        case "web_search":
          return { ok: true, results: await this.webSearch(action.query) };
        case "fetch_url":
          return { ok: true, content: await this.fetchUrl(action.url) };
        case "shell":
          return { ok: true, output: await this.runShell(action.command) };
        case "api_get_user_info":
          return { ok: true, data: await this.apiGetUserInfo(action.userID) };
        case "api_get_thread_info":
          return { ok: true, data: await this.apiGetThreadInfo(action.threadID) };
        case "unsend_message":
          await this.params.api.unsendMessage(action.messageID);
          return { ok: true, output: "Message unsent." };
        case "react_message":
          await this.params.api.setMessageReaction(action.emoji || "👍", action.messageID || this.params.event?.messageReply?.messageID, null, true);
          return { ok: true, output: `Reacted ${action.emoji || "👍"}.` };
        case "write_file": {
          const relPath = String(action.path || "").replace(/^[@/]+/, "");
          if (!relPath) return { ok: false, error: "path required" };
          const absW = workspacePath(relPath);
          await fs.ensureDir(path.dirname(absW));
          await fs.writeFile(absW, String(action.content || ""), "utf8");
          return { ok: true, written: relPath, bytes: String(action.content || "").length };
        }
        case "npm_install": {
          const pkg = String(action.package || action.pkg || "").trim();
          if (!pkg) return { ok: false, error: "package name required" };
          const out = await this.runShell(`npm install ${pkg} 2>&1`);
          return { ok: true, output: truncate(out, 3000) };
        }
        case "reply_to_thread":
          await this.params.message.reply(action.text || "");
          return { ok: true, output: "Message sent." };
        case "send_message": {
          const tid = action.threadID ? String(action.threadID) : null;
          const text = String(action.text || action.body || "");
          if (!text) return { ok: false, error: "text required" };
          if (tid && tid !== String(this.params.event?.threadID)) {
            await this.params.api.sendMessage(text, tid);
          } else {
            await this.params.message.reply(text);
          }
          return { ok: true };
        }
        case "api_get_all_users": {
          const users = (global.db?.allUserData || []).slice(0, 300).map(u => ({ id: u.userID, name: u.name }));
          return { ok: true, users, count: users.length };
        }
        case "api_get_all_threads": {
          const threads = (global.db?.allThreadData || []).slice(0, 100).map(t => ({
            id: t.threadID, name: t.threadName || t.name || ""
          }));
          return { ok: true, threads, count: threads.length };
        }
        case "kick_user": {
          const uid = String(action.userID || "");
          const tid = String(action.threadID || this.params.event?.threadID || "");
          if (!uid) return { ok: false, error: "userID required" };
          await this.params.api.removeUserFromGroup(uid, tid);
          return { ok: true, kicked: uid };
        }
        case "add_user": {
          const uid = String(action.userID || "");
          const tid = String(action.threadID || this.params.event?.threadID || "");
          if (!uid) return { ok: false, error: "userID required" };
          await this.params.api.addUserToGroup(uid, tid);
          return { ok: true, added: uid };
        }
        case "change_nickname": {
          const uid = String(action.userID || this.params.event?.senderID || "");
          const tid = String(action.threadID || this.params.event?.threadID || "");
          await this.params.api.changeNickname(String(action.nickname || ""), tid, uid);
          return { ok: true };
        }
        case "send_file": {
          const filePath = String(action.path || "").startsWith("@")
            ? await this.resolveProjectReference(action.path)
            : action.path;
          const abs = workspacePath(filePath);
          if (!await fs.pathExists(abs)) throw new Error(`File not found: ${action.path}`);
          await this.params.message.reply({
            body: action.text || "",
            attachment: fs.createReadStream(abs)
          });
          return { ok: true, output: `Sent ${relativePath(abs)}.` };
        }
        default:
          return { ok: false, error: `Unknown tool: ${action.tool}` };
      }
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  }

  async readFile(relPath) {
    if (!this.config.allowFileRead) throw new Error("File read is disabled in config.stai.");
    const resolved = await this.resolveProjectReference(relPath);
    const abs = workspacePath(resolved);
    if (!await fs.pathExists(abs)) throw new Error(`File not found: ${relPath}`);
    if (!isTextFile(abs)) throw new Error("Refusing to read non-text file");
    const content = redactSensitiveText(relativePath(abs), await fs.readFile(abs, "utf8"));
    return `--- ${relativePath(abs)} ---\n${truncate(content, this.config.maxFileChars)}`;
  }

  async directRead(relPath) {
    if (!relPath) return { text: "Provide a project file path to read.", registerReply: false };
    const refs = extractPathRefs(relPath);
    if (refs.length) {
      const parts = [];
      for (const ref of refs.slice(0, 8)) {
        const resolved = await this.resolveProjectReference(ref);
        parts.push(await this.readFile(resolved));
      }
      return { text: parts.join("\n\n"), registerReply: false };
    }
    return { text: await this.readFile(relPath), registerReply: false };
  }

  async directFind(query) {
    const results = await this.findFiles(query, 50);
    if (!results.length) {
      return { text: `No project files found for: ${query || "(empty query)"}`, registerReply: false };
    }
    return {
      text: `Found ${results.length} file(s):\n` + results.map((file, index) => `${index + 1}. ${file}`).join("\n"),
      registerReply: false
    };
  }

  async directInventory(kind = "all") {
    const inv = await this.projectInventory();
    if (kind === "commands") {
      const loaded = Array.from(global.GoatBot?.commands?.keys?.() || []).sort();
      return {
        text: [
          `Command files (${inv.commands.length}):`,
          inv.commands.join(", "),
          "",
          `Loaded commands (${loaded.length}):`,
          loaded.join(", ")
        ].join("\n"),
        registerReply: false
      };
    }
    if (kind === "events") {
      const loaded = Array.from(global.GoatBot?.eventCommands?.keys?.() || []).sort();
      return {
        text: [
          `Event files (${inv.events.length}):`,
          inv.events.join(", "),
          "",
          `Loaded events (${loaded.length}):`,
          loaded.join(", ")
        ].join("\n"),
        registerReply: false
      };
    }
    return { text: JSON.stringify(inv, null, 2), registerReply: false };
  }

  async botAccountInfo(includePrivate = false) {
    const api = this.params.api || global.GoatBot?.fcaApi || null;
    const configAccount = global.GoatBot?.config?.botAccount || {};
    const botID = api?.getCurrentUserID
      ? String(api.getCurrentUserID())
      : String(global.GoatBot?.botID || "");

    let botName = global.GoatBot?.botName || "";
    try {
      if (api?.getUserInfo && botID) {
        const info = await api.getUserInfo(botID);
        botName = info?.[botID]?.name || botName;
      }
    } catch (_) {}

    return {
      connected: !!botID,
      botID: botID || null,
      botName: botName || null,
      currentAccountSlot: global.GoatBot?.currentAccount || null,
      nickname: global.GoatBot?.config?.nickNameBot || null,
      accountConfig: includePrivate ? redactSecrets(configAccount) : {
        emailConfigured: !!configAccount.email,
        userAgentConfigured: !!configAccount.userAgent,
        autoUseWhenEmpty: configAccount.autoUseWhenEmpty === true
      }
    };
  }

  async directIdentity() {
    const event = this.params.event || {};
    const senderID = String(event.senderID || event.userID || "");
    const threadID = String(event.threadID || "");
    const botInfo = await this.botAccountInfo(false);
    let senderName = senderID;
    let threadName = threadID;

    try {
      senderName = await this.params.usersData?.getName?.(senderID) || senderName;
    } catch (_) {}
    try {
      if (this.params.api?.getUserInfo && senderID) {
        const info = await this.params.api.getUserInfo(senderID);
        senderName = info?.[senderID]?.name || senderName;
      }
    } catch (_) {}
    try {
      const data = global.db?.allThreadData?.find(t => String(t.threadID) === threadID);
      threadName = data?.threadName || data?.name || threadName;
    } catch (_) {}

    return {
      registerReply: false,
      text: [
        "STAI identity context:",
        `You: ${senderName} (${senderID || "unknown"})`,
        `Thread: ${threadName || "unknown"} (${threadID || "unknown"})`,
        `Connected bot: ${botInfo.botName || "unknown"} (${botInfo.botID || "unknown"})`,
        `Bot nickname: ${botInfo.nickname || "unknown"}`,
        `Bot account slot: ${botInfo.currentAccountSlot || "default"}`,
        `E2EE: ${String(threadID).includes("@") || event.isE2EE ? "yes" : "no"}`,
        "I am STAI, made by Sheikh Tamim for ST BOT."
      ].join("\n")
    };
  }

  async searchText(query) {
    if (!query) throw new Error("Search query is required");
    const files = await this.listProjectFiles(this.config.maxSearchFiles);
    const results = [];
    const needle = String(query).toLowerCase();
    for (const rel of files) {
      if (results.length >= this.config.maxSearchResults) break;
      const abs = path.join(WORKDIR, rel);
      if (!isTextFile(abs)) continue;
      const content = await fs.readFile(abs, "utf8").catch(() => "");
      const lines = content.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(needle)) {
          results.push({ file: rel, line: i + 1, text: truncate(lines[i].trim(), 220) });
          if (results.length >= this.config.maxSearchResults) break;
        }
      }
    }
    return results;
  }

  async webSearch(query) {
    if (!this.config.allowWebSearch) throw new Error("Web search is disabled in config.stai.");
    if (!query || !String(query).trim()) throw new Error("Search query is required");

    const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await axios.get(url, {
      timeout: 30000,
      headers: {
        "User-Agent": "Mozilla/5.0 STAI/1.0"
      }
    });
    const $ = cheerio.load(res.data);
    const results = [];
    $(".result").each((_, el) => {
      if (results.length >= 8) return false;
      const title = $(el).find(".result__title").text().replace(/\s+/g, " ").trim();
      let href = $(el).find(".result__a").attr("href") || "";
      const snippet = $(el).find(".result__snippet").text().replace(/\s+/g, " ").trim();
      if (href.startsWith("//duckduckgo.com/l/?")) {
        try {
          const parsed = new URL(`https:${href}`);
          href = parsed.searchParams.get("uddg") || href;
        } catch (_) {}
      }
      if (title || href || snippet) results.push({ title, url: href, snippet });
    });

    if (!results.length) {
      try {
        const api = await axios.get("https://api.duckduckgo.com/", {
          timeout: 20000,
          params: { q: query, format: "json", no_redirect: 1, no_html: 1 }
        });
        const related = api.data?.RelatedTopics || [];
        for (const item of related.slice(0, 8)) {
          if (item.Text || item.FirstURL)
            results.push({ title: item.Text || item.FirstURL, url: item.FirstURL || "", snippet: item.Text || "" });
        }
      } catch (_) {}
    }

    // Bing fallback if still no results
    if (!results.length) {
      try {
        const bRes = await axios.get(`https://www.bing.com/search?q=${encodeURIComponent(query)}`, {
          timeout: 20000,
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 STAI/1.0" }
        });
        const $b = cheerio.load(bRes.data);
        $b(".b_algo").each((_, el) => {
          if (results.length >= 8) return false;
          const title = $b(el).find("h2 a").text().replace(/\s+/g, " ").trim();
          const url = $b(el).find("h2 a").attr("href") || "";
          const snippet = $b(el).find(".b_caption p, .b_algoSlug").first().text().replace(/\s+/g, " ").trim();
          if (title || snippet) results.push({ title, url, snippet, source: "bing" });
        });
      } catch (_) {}
    }

    return results;
  }

  async fetchUrl(url) {
    if (!this.config.allowWebSearch) throw new Error("URL fetching is disabled in config.stai.");
    if (!/^https?:\/\//i.test(String(url || ""))) throw new Error("A valid http(s) URL is required");
    const res = await axios.get(url, {
      timeout: 30000,
      maxContentLength: 1024 * 1024 * 4,
      headers: {
        "User-Agent": "Mozilla/5.0 STAI/1.0"
      }
    });
    const type = String(res.headers["content-type"] || "");
    if (/text|json|xml|html/i.test(type)) {
      let text = typeof res.data === "string" ? res.data : JSON.stringify(res.data, null, 2);
      if (/html/i.test(type)) {
        const $ = cheerio.load(text);
        $("script,style,noscript").remove();
        text = $("body").text().replace(/\s+/g, " ").trim();
      }
      return truncate(text, 12000);
    }
    return `Fetched ${url} (${type || "unknown content-type"}, ${String(res.data || "").length} bytes).`;
  }

  runShell(command) {
    if (!this.config.allowShell) throw new Error("Shell is disabled in config.stai.");
    if (!command || !command.trim()) return "No shell command provided.";
    return new Promise((resolve) => {
      exec(command, {
        cwd: WORKDIR,
        timeout: this.config.shellTimeoutMs,
        maxBuffer: this.config.shellMaxBuffer,
        windowsHide: true
      }, (error, stdout, stderr) => {
        const parts = [];
        if (stdout) parts.push(`stdout:\n${stdout}`);
        if (stderr) parts.push(`stderr:\n${stderr}`);
        if (error) parts.push(`error:\n${error.message}`);
        resolve(truncate(parts.join("\n\n") || "Command completed with no output.", 12000));
      });
    });
  }

  async apiGetUserInfo(userID) {
    const id = userID || this.params.event.senderID;
    if (!id) throw new Error("userID is required");
    return this.params.api.getUserInfo(id);
  }

  async apiGetThreadInfo(threadID) {
    const id = threadID || this.params.event.threadID;
    if (!id) throw new Error("threadID is required");
    if (String(id).includes("@")) {
      return {
        threadID: id,
        isE2EE: true,
        note: "E2EE JIDs do not support normal getThreadInfo. Event context is available."
      };
    }
    return this.params.api.getThreadInfo(id);
  }

  async createItem(folder, intent) {
    if (!this.config.allowFileWrite) throw new Error("File write is disabled in config.stai.");
    const itemType = folder === "events" ? "event" : "command";
    const results = [];
    for (const requestedName of intent.names.slice(0, 5)) {
      const finalName = this.availableName(folder, requestedName);
      const code = await this.generateCode(folder, finalName, intent.prompt);
      const loaded = await this.writeAndLoad(folder, finalName, code, {
        actionType: folder === "events" ? "create_event" : "create_command",
        prompt: intent.prompt,
        isCreate: true
      });
      results.push(`${itemType} ${finalName}: ${loaded}`);
    }

    return {
      registerReply: false,
      text: [
        `STAI created and loaded ${results.length} ${itemType}${results.length > 1 ? "s" : ""}.`,
        ...results,
        "",
        "Use the new command/event by its generated name. No source code was sent in chat."
      ].join("\n")
    };
  }

  async fixItems(folder, intent) {
    if (!this.config.allowFileWrite) throw new Error("File write is disabled in config.stai.");
    if (!intent.files.length) {
      return {
        registerReply: false,
        text: `No existing ${folder === "events" ? "event" : "command"} files were found in your request. Example: -f${folder === "events" ? "e" : "c"} uid.js fix syntax error`
      };
    }

    const results = [];
    for (const fileName of intent.files.slice(0, 8)) {
      // Use actual filename as-is (already validated from disk listing in parseFix)
      const rawBase = fileName.replace(/\.js$/i, "");
      const abs = path.join(getDirForFolder(folder), `${rawBase}.js`);
      const original = await fs.readFile(abs, "utf8");
      const fixed = await this.fixCode(folder, fileName, original, intent.prompt);
      const loaded = await this.writeAndLoad(folder, rawBase, fixed, {
        actionType: folder === "events" ? "fix_event" : "fix_command",
        prompt: intent.prompt,
        original
      });
      results.push(`${fileName}: ${loaded}`);
    }

    return {
      registerReply: false,
      text: [
        `STAI fixed and reloaded ${results.length} file${results.length > 1 ? "s" : ""}.`,
        ...results,
        "",
        "No source code was sent in chat."
      ].join("\n")
    };
  }

  availableName(folder, requested) {
    const map = folder === "events" ? global.GoatBot.eventCommands : global.GoatBot.commands;
    const dir = getDirForFolder(folder);
    let base = safeBaseName(requested, folder === "events" ? "stai_event" : "stai_cmd");
    let candidate = base;
    let count = 2;
    while (
      fs.existsSync(path.join(dir, `${candidate}.js`)) ||
      map?.has?.(candidate) ||
      global.GoatBot.aliases?.has?.(candidate)
    ) {
      candidate = `${base}${count}`;
      count++;
    }
    return candidate;
  }

  async generateCode(folder, finalName, prompt) {
    const itemType = folder === "events" ? "event command" : "command";
    const system = [
      this.baseSystemPrompt(),
      await this.projectContext(),
      "",
      `Generate one complete ST-BOT ${itemType} file.`,
      `The file/config name must be exactly "${finalName}".`,
      "Return only JavaScript source code, no markdown, no explanation.",
      "Use CommonJS module.exports. The code must load in this project.",
      "Use author: \"STAI | Sheikh Tamim\".",
      folder === "events"
        ? "This is an event command for scripts/events. It should use category: \"events\" and onStart."
        : "This is a user command for scripts/cmds. It should use ST or onStart.",
      "Keep code practical, defensive, and compatible with existing handler parameters."
    ].join("\n");

    const user = [
      `Requested ${itemType}: ${prompt}`,
      `Final config.name: ${finalName}`,
      `Current event: ${JSON.stringify(this.eventSummary(), null, 2)}`
    ].join("\n\n");

    const raw = await this.callProvider([
      { role: "system", content: system },
      { role: "user", content: user }
    ], { temperature: 0.25, maxTokens: this.config.maxTokens });

    return this.prepareGeneratedCode(raw, finalName);
  }

  async fixCode(folder, fileName, original, prompt) {
    const currentName = firstConfigName(original, safeBaseName(fileName));
    const system = [
      this.baseSystemPrompt(),
      await this.projectContext([`scripts/${folder}/${ensureJsFileName(fileName)}`]),
      "",
      "Fix the provided ST-BOT module.",
      "Return the full corrected JavaScript file only. No markdown, no explanation.",
      "Keep module.exports, config.name, command/event behavior, and project conventions unless the user asks to change them."
    ].join("\n");

    const user = [
      `Fix request: ${prompt}`,
      `File: scripts/${folder}/${ensureJsFileName(fileName)}`,
      "Current code:",
      "```js",
      truncate(original, this.config.maxFileChars),
      "```"
    ].join("\n");

    const raw = await this.callProvider([
      { role: "system", content: system },
      { role: "user", content: user }
    ], { temperature: 0.2, maxTokens: this.config.maxTokens });

    return this.prepareGeneratedCode(raw, currentName);
  }

  prepareGeneratedCode(raw, expectedName) {
    let code = stripCodeFence(raw).trim();
    if (!/module\.exports\s*=/.test(code)) {
      const idx = code.indexOf("module.exports");
      if (idx >= 0) code = code.slice(idx);
    }
    if (!/module\.exports\s*=/.test(code)) {
      throw new Error("AI response did not contain a CommonJS module.exports file");
    }
    code = replaceConfigName(code, expectedName);
    try {
      new Function(code);
    } catch (err) {
      throw new Error(`Generated JavaScript syntax error: ${err.message}`);
    }
    return code.endsWith("\n") ? code : `${code}\n`;
  }

  async writeAndLoad(folder, baseName, code, meta) {
    // Use baseName as-is (no safeBaseName truncation here — caller is responsible)
    const rawBase = String(baseName).replace(/\.js$/i, "");
    const fileName = `${rawBase}.js`;
    const abs = path.join(getDirForFolder(folder), fileName);
    const existed = await fs.pathExists(abs);
    const original = existed ? await fs.readFile(abs, "utf8") : "";

    const callLoader = (src) => {
      if (typeof global.utils?.loadScripts === "function") {
        return global.utils.loadScripts(
          folder,
          fileName,
          global.utils.log,
          global.GoatBot.configCommands,
          this.params.api,
          this.params.threadModel,
          this.params.userModel,
          this.params.dashBoardModel,
          this.params.globalModel,
          this.params.threadsData,
          this.params.usersData,
          this.params.dashBoardData,
          this.params.globalData,
          this.params.getLang || ((key) => key),
          src
        );
      }
      // Direct-require fallback if loadScripts is unavailable
      try {
        fs.writeFileSync(abs, src);
        delete require.cache[require.resolve(abs)];
        const command = require(abs);
        command.location = abs;
        const setMap = folder === "events" ? "eventCommands" : "commands";
        const name = command.config?.name;
        if (name) {
          global.GoatBot[setMap].delete(name);
          global.GoatBot[setMap].set(name, command);
        }
        return { status: "success", command };
      } catch (err) {
        return { status: "failed", error: err };
      }
    };

    let info = callLoader(code);
    if (info.status !== "success") {
      const repaired = await this.repairAfterLoadError(folder, rawBase, code, info.error);
      code = repaired;
      info = callLoader(code);
    }

    if (info.status !== "success") {
      if (existed) {
        await fs.writeFile(abs, original);
        try { callLoader(original); } catch (_) {}
      } else {
        await fs.remove(abs).catch(() => {});
      }
      throw new Error(`Load failed for ${fileName}: ${info.error?.name || "Error"}: ${info.error?.message || "unknown error"}`);
    }

    await this.saveHistory(meta.actionType, folder === "events" ? "event" : "command", fileName, meta.prompt, true, code);
    return `${relativePath(abs)} loaded as ${info.command?.config?.name || rawBase}`;
  }

  async repairAfterLoadError(folder, baseName, code, error) {
    const system = [
      this.baseSystemPrompt(),
      this.commandConventions(),
      "Repair this generated ST-BOT module after the loader failed.",
      "Return only the full corrected JavaScript file. No markdown.",
      `The config.name must be exactly "${baseName}".`
    ].join("\n");
    const user = [
      `Loader error: ${error?.name || "Error"}: ${error?.message || String(error)}`,
      "Broken code:",
      "```js",
      truncate(code, this.config.maxFileChars),
      "```"
    ].join("\n");

    const raw = await this.callProvider([
      { role: "system", content: system },
      { role: "user", content: user }
    ], { temperature: 0.15, maxTokens: this.config.maxTokens });

    return this.prepareGeneratedCode(raw, baseName);
  }

  async saveHistory(actionType, itemType, fileName, description, success, code = "") {
    if (!this.config.saveChatHistory && actionType === "chat") return;
    const store = this.params.staiHistoryData || global.staiHistoryData;
    if (!store) return;
    const meta = await this.historyMeta();
    try {
      if (code && typeof store.trackAndUpload === "function") {
        await store.trackAndUpload(
          meta.userID,
          meta.userName,
          meta.threadID,
          meta.threadName,
          actionType,
          itemType,
          fileName,
          code,
          truncate(description, 900)
        );
      } else if (typeof store.addHistory === "function") {
        await store.addHistory({
          userID: meta.userID,
          userName: meta.userName,
          threadID: meta.threadID,
          threadName: meta.threadName,
          actionType,
          itemType,
          fileName,
          description: truncate(description, 900),
          success
        });
      }
    } catch (_) {}
  }

  async historyMeta() {
    const event = this.params.event || {};
    const userID = String(event.senderID || event.userID || "");
    const threadID = String(event.threadID || "");
    let userName = userID;
    let threadName = threadID;
    try {
      userName = await this.params.usersData?.getName?.(userID) || userID;
    } catch (_) {}
    try {
      const data = global.db?.allThreadData?.find(t => String(t.threadID) === threadID);
      threadName = data?.threadName || data?.name || threadID;
    } catch (_) {}
    return { userID, userName, threadID, threadName };
  }
}

async function handleCommand(params) {
  const agent = new STAgent(params);
  return agent.handle(params);
}

async function handleReply(params) {
  const agent = new STAgent(params);
  return agent.handleReply(params);
}

module.exports = {
  STAgent,
  formatStaiError,
  handleCommand,
  handleReply
};
