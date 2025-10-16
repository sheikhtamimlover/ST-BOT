<div align="center">

# 🐐 ST-BOT - By Sheikh Tamim

<img src="./dashboard/images/st.png" alt="ST-Bot Logo" width="200" height="200" style="border-radius: 50%;">

*A customized and powerful multi-purpose chatbot framework for Facebook Messenger*

![GitHub stars](https://img.shields.io/github/stars/sheikhtamimlover/ST-BOT?style=for-the-badge)
![GitHub forks](https://img.shields.io/github/forks/sheikhtamimlover/ST-BOT?style=for-the-badge)
![GitHub issues](https://img.shields.io/github/issues/sheikhtamimlover/ST-BOT?style=for-the-badge)
![GitHub license](https://img.shields.io/github/license/sheikhtamimlover/ST-BOT?style=for-the-badge)
![Node.js Version](https://img.shields.io/badge/Node.js-v18+-green?style=for-the-badge&logo=node.js)
![Package Version](https://img.shields.io/github/package-json/v/sheikhtamimlover/ST-BOT?style=for-the-badge)
![Repository Size](https://img.shields.io/github/repo-size/sheikhtamimlover/ST-BOT?style=for-the-badge)
![Last Commit](https://img.shields.io/github/last-commit/sheikhtamimlover/ST-BOT?style=for-the-badge)
[![Deploy on Replit](https://img.shields.io/badge/Deploy%20on-Replit-667881?style=for-the-badge&logo=replit&logoColor=white)](https://replit.com/github/sheikhtamimlover/ST-BOT)
[![Visitors](https://visitor-badge.laobi.icu/badge?page_id=sheikhtamimlover.ST-BOT)](https://github.com/sheikhtamimlover/ST-BOT)

**Enhanced version of GoatBot V2** - Modified and maintained by **Sheikh Tamim**

[![Instagram](https://img.shields.io/badge/Instagram-@sheikh.tamim__lover-E4405F?style=for-the-badge&logo=instagram&logoColor=white)](https://www.instagram.com/sheikh.tamim_lover/)
[![GitHub](https://img.shields.io/badge/GitHub-sheikhtamimlover-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/sheikhtamimlover)

---

</div>

## 📖 Table of Contents

- [Features](#-features)
- [Command Structure](#-command-structure)
- [Configuration Guide](#-configuration-guide)
- [Installation & Setup](#-installation--setup)
- [Premium System](#-premium-system)
- [ST-FCA (Custom Facebook API)](#-st-fca-custom-facebook-api)
- [Advanced Features](#-advanced-features)
- [Dashboard](#-dashboard)
- [ST Handlers Store](#-st-handlers-store)
- [AI Command (STAI)](#-ai-command-stai)
- [Support & Community](#-support--community)
- [License](#-license)

---

## 🚀 Features

- **Modular Command System** - Easy to add/remove commands
- **Premium System** - Advanced premium user management
- **Fast and Scalable** - Optimized bot core for high performance
- **Auto-restart and Watchdog** - Self-healing capabilities
- **MongoDB/SQLite Support** - Flexible database options
- **Dynamic Command Loader** - Hot-reload commands without restart
- **Thread Approval System** - Control bot access to groups
- **Anti-React System** - Advanced message management
- **Real-time Dashboard** - Live monitoring with WebSocket
- **Easy Deployment** - One-click deployment on Replit & Render
- **Custom ST-FCA** - Optimized Facebook Chat API
- **Bot Logging System** - Comprehensive logging configuration
- **Prefix Management** - Global and per-thread prefix control
- **Bio Update System** - Automatic bio updates
- **Startup Notifications** - Configurable startup messages

---

## 📝 Command Structure

<img src="https://i.ibb.co.com/4RDdwr1q/IMG-7416.jpg" alt="Command Structure" width="600">

Every command in ST-BOT follows a standardized structure for consistency and ease of development:

### Command Configuration

```javascript
module.exports = {
  config: {
    name: "commandname",           // Command name (lowercase)
    aliases: ["alias1", "alias2"], // Alternative names
    version: "1.0.0",              // Command version
    author: "Your Name",           // Author name
    countDown: 5,                  // Cooldown in seconds
    role: 0,                       // 0: Everyone, 1: Group Admin, 2: Bot Admin
    premium: false,                // true: Premium only, false: Everyone
    usePrefix: true,               // true: Requires prefix, false: No prefix needed
    description: "Command description",
    category: "category name",
    guide: "{pn} <usage guide>"    // Usage instructions
  },

  langs: {
    en: {
      success: "Command executed successfully!",
      error: "An error occurred!"
    }
  },

  onStart: async function({ message, args, event, api, getLang }) {
    // Main command logic
    message.reply(getLang("success"));
  },

  onReply: async function({ message, Reply, event, api }) {
    // Handle user replies to bot messages
  },

  onChat: async function({ message, event, args }) {
    // Listen to all messages (without prefix)
  },

  onReaction: async function({ message, Reaction, event, api }) {
    // Handle reactions to bot messages
  }
};
```

### Available Functions

- **`message.reply(text)`** - Reply to user messages
- **`message.send(text, threadID)`** - Send message to specific thread
- **`message.unsend(messageID)`** - Unsend a message
- **`message.reaction(emoji, messageID)`** - React to a message
- **`api.sendMessage()`** - Direct API message sending
- **`getLang(key, ...args)`** - Get localized text
- **`usersData.get(userID)`** - Get user data
- **`threadsData.get(threadID)`** - Get thread data

---

## ⚙️ Configuration Guide

<img src="https://i.ibb.co.com/RGH2h5LZ/IMG-7415.jpg" alt="Prefix Configuration" width="600">

### Global Prefix System

Configure prefix usage in `config.json`:

```json
{
  "prefix": "!",
  "usePrefix": {
    "enable": true,                    // Global prefix requirement
    "adminUsePrefix": {
      "enable": true,                  // Admin prefix requirement
      "specificUids": []               // Specific users who need prefix
    }
  }
}
```

**Options:**
- `usePrefix.enable: true` - All users must use prefix
- `usePrefix.enable: false` - No prefix required globally
- `adminUsePrefix.enable: true` - Admins must use prefix
- `adminUsePrefix.enable: false` - Admins don't need prefix
- `specificUids: ["uid1", "uid2"]` - Specific users affected by admin rules

### Bot Account Configuration

Login credentials are set in `config.json`:

```json
{
  "botAccount": {
    "email": "your_email@example.com",
    "password": "your_password",
    "userAgent": "Mozilla/5.0...",
    "autoUseWhenEmpty": true
  }
}
```

**Note:** If `account.txt` is empty, the bot will automatically use credentials from `config.json` to fetch cookies.

---

## 🔧 Installation & Setup

### 🖥 Method 1: Local Setup

1. **Clone the repository**:
```bash
git clone https://github.com/sheikhtamimlover/ST-BOT.git && cp -r ST-BOT/. . && rm -rf ST-BOT
```

2. **Install dependencies**:
```bash
npm install
```

3. **Configure the bot**:
   - Set your **Admin UID** in `config.json` → `adminBot` array
   - Add your **Facebook email/password** in `config.json` → `botAccount`
   - Or add cookies directly in `account.txt` (JSON format)

4. **Start the bot**:
```bash
npm start
```

### 🌐 Method 2: Deploy on Render (Recommended)

[![Deploy on Render](https://img.shields.io/badge/Deploy%20on-Render-667881?style=for-the-badge&logo=render&logoColor=white)](https://render.com)

1. Click the "Deploy on Render" button above
2. Configure your bot in `config.json`
3. Click the **Run** button - Render handles everything automatically!

---

## 💎 Premium System

<img src="https://i.ibb.co.com/SYnXPfm/IMG-7399.jpg" alt="Premium System" width="600">

The bot includes a comprehensive premium user management system.

### How Premium Works

**For Users:**
- Request premium access: `.premium request <message>`
- Premium users get exclusive command access

**For Admins:**
- Add premium: `.premium add <uid/@mention>`
- Remove premium: `.premium remove <uid/@mention>`
- View premium users: `.premium list`
- Check pending requests: `.premium pending`

### Creating Premium Commands

```javascript
module.exports = {
  config: {
    name: "premiumcommand",
    premium: true,  // Makes this command premium-only
    role: 0,
    // ... other config
  },

  onStart: async function({ message }) {
    message.reply("🌟 This is a premium feature!");
  }
};
```

---

## 🔌 ST-FCA (Custom Facebook API)

ST-BOT uses **ST-FCA** - an optimized, custom-built Facebook Chat API for better performance and reliability.

### Installation

```bash
npm install stfca
```

### GitHub Repository

🔗 [https://github.com/sheikhtamimlover/ST-FCA.git](https://github.com/sheikhtamimlover/ST-FCA.git)

### Features

- ✅ Better stability and performance
- ✅ Optimized for ST-BOT
- ✅ Regular updates and bug fixes
- ✅ Enhanced error handling
- ✅ Improved cookie management

---

## 🎯 Advanced Features

### Thread Approval System

<img src="https://i.ibb.co.com/JwGKNzFp/IMG-7405.jpg" alt="Thread Approval 1" width="600">
<img src="https://i.ibb.co.com/hxFwcf30/IMG-7404.jpg" alt="Thread Approval 2" width="600">

Control which groups can use your bot:

```json
{
  "threadApproval": {
    "enable": true,
    "adminNotificationThreads": ["thread_id"],
    "autoApproveExisting": true,
    "sendNotifications": true,
    "sendThreadMessage": true,
    "autoApprovedThreads": []
  }
}
```

**Commands:**
- `!threadapprove list` - View all threads
- `!threadapprove approve <tid>` - Approve a thread
- `!threadapprove unapprove <tid>` - Unapprove a thread
- `!threadapprove pending` - View pending threads

### Bot Logging System

<img src="https://i.ibb.co.com/B23tJ0JN/IMG-7413.jpg" alt="Bot Logging" width="600">

Configure comprehensive logging:

```json
{
  "botLogging": {
    "enable": true,
    "sendToThreads": true,
    "logThreadIds": ["thread_id"],
    "sendToAdmins": false,
    "silentOnDisabledThreads": true,
    "logBotAdded": false,
    "logBotKicked": true
  }
}
```

### Anti-React System

Admin-only message management through reactions:

```json
{
  "antiReact": {
    "enable": true,
    "reactByUnsend": {
      "enable": true,
      "emojis": ["👍"]
    },
    "reactByRemove": {
      "enable": true,
      "emoji": "⚠"
    },
    "onlyAdminBot": true
  }
}
```

### Bio Update System

<img src="https://i.ibb.co.com/HTm9jymD/IMG-7411.jpg" alt="Bio Update 1" width="600">
<img src="https://i.ibb.co.com/TDBnzRVt/IMG-7412.jpg" alt="Bio Update 2" width="600">

Automatically update bot bio:

```json
{
  "bioUpdate": {
    "enable": true,
    "bioText": "ST Bot - Your custom bio here",
    "updateOnce": true
  }
}
```

### Startup Notifications

<img src="https://i.ibb.co.com/nNbvwfwZ/IMG-7396.jpg" alt="Startup Notification" width="600">

Send notifications when bot starts:

```json
{
  "botStartupNotification": {
    "enable": true,
    "sendToThreads": {
      "enable": true,
      "threadIds": ["thread_id"]
    },
    "sendToAdmin": {
      "enable": false,
      "adminId": ""
    },
    "message": "🤖 Bot is now online!"
  }
}
```

---

## 📊 Dashboard

<img src="https://i.ibb.co.com/MkHNNYnZ/Screenshot-2025-10-16-090815.png" alt="Dashboard" width="800">

Access the powerful web dashboard with enhanced security:

```json
{
  "dashBoard": {
    "enable": true,
    "port": 3021,
    "passwordProtection": {
      "enable": true,
      "password": "your_secure_password"
    }
  }
}
```

**Features:**
- 📊 Real-time statistics
- 👥 User management
- 💎 Premium user control
- 📝 Thread management
- 📈 Command analytics
- 🔧 System monitoring

---

## 🛍️ ST Handlers Store

<img src="https://i.ibb.co.com/B2xZPTxL/IMG-7414.jpg" alt="ST Handlers" width="600">

Browse, install, and share commands, events, and APIs!

### Usage

```bash
!sthandlers                    # Open main menu
!sthandlers <filename>         # Install from store
!sthandlers <name> <code>      # Upload command
!sthandlers -e <name> <code>   # Upload event
!sthandlers -p <filename>      # Upload from file path
```

### Features

- ✅ Browse commands by category
- ✅ Install commands instantly
- ✅ Share your own creations
- ✅ Version control
- ✅ Auto-load installed commands
- ✅ Community-driven content

---

## 🤖 AI Command (STAI)

<img src="https://i.ibb.co.com/t7ZgxMP/IMG-7398.jpg" alt="STAI Command" width="600">

The most advanced AI command with code generation and bug fixing capabilities!

### Features

- 🧠 Generate commands and events
- 🐛 Fix bugs in existing code
- 💡 Code suggestions and improvements
- 🔧 Auto-formatting and optimization
- 📝 Documentation generation

### Usage

```bash
!stai generate command <description>
!stai generate event <description>
!stai fix <command_name>
!stai improve <code>
```

---

## 📞 Support & Community

### Need Help?

- 📱 **Messenger Group**: [Join Support Group](https://m.me/j/AbYvFRTzENblDU94/)
- 📸 **Instagram**: [@sheikh.tamim_lover](https://www.instagram.com/sheikh.tamim_lover/)
- 💬 **Facebook**: [m.me/tormairedusi](https://m.me/tormairedusi)
- 🐛 **Report Issues**: Use `!streport <your issue>` command

### Regular Updates

- ✅ Active development and maintenance
- ✅ Regular feature additions
- ✅ Bug fixes and improvements
- ✅ Community-driven enhancements

### Report Issues

Use the built-in report command:
```bash
!streport <describe your issue or feature request>
```

Your report will be sent directly to the developer!

---

## 📋 Essential Commands

| Command | Description | Access |
|---------|-------------|---------|
| `!help` | View all commands | All Users |
| `!prefix` | View/change prefix | Group Admin |
| `!premium request` | Request premium | All Users |
| `!premium add` | Add premium user | Bot Admin |
| `!threadapprove` | Manage thread approval | Bot Admin |
| `!botlog` | Configure bot logging | Bot Admin |
| `!sthandlers` | Access command store | All Users |
| `!stai` | AI assistant | All Users |
| `!streport` | Report issues | All Users |
| `!update` | Update bot | Bot Admin |

---

## 🔄 Regular Updates & Maintenance

This project receives regular updates with:
- 🆕 New Features
- 🐛 Bug Fixes  
- 🔒 Security Patches
- ⚡ Performance Optimizations
- 💎 Premium Features

**Stay updated** by:
- ⭐ Starring this repository
- 👀 Watching for releases
- 📱 Following on Instagram
- 💬 Joining the support group

---

## 📄 License

This project is licensed under the MIT License. You are free to use, modify, and distribute this software, but please maintain the original credits.

**Original GoatBot V2** by NTKhang  
**Enhanced & Maintained** by Sheikh Tamim

---

## ❤️ Support the Project

If you find this project helpful:
- ⭐ Star this repository
- 🍴 Fork and contribute
- 📢 Share with others
- 💬 Join our community
- 🔗 Follow on Instagram: [@sheikh.tamim_lover](https://www.instagram.com/sheikhtamimlover/)

---

<div align="center">

**Happy Botting! 🤖✨**

*Made with ❤️ by Sheikh Tamim*

**GitHub:** [sheikhtamimlover/ST-BOT](https://github.com/sheikhtamimlover/ST-BOT)  
**ST-FCA:** [sheikhtamimlover/ST-FCA](https://github.com/sheikhtamimlover/ST-FCA)

</div>
