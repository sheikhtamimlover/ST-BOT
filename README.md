
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

---

## 👨‍💻 About the Developer

**Sheikh Tamim** is actively maintaining and regularly updating this project. This bot framework is reliable, easy to use, and can be deployed without hesitation on Render with no deployment issues.

### 📞 Contact & Support

- **Instagram**: [![Instagram](https://img.shields.io/badge/@sheikh.tamim__lover-E4405F?style=flat&logo=instagram&logoColor=white)](https://www.instagram.com/sheikh.tamim_lover/)
- **Messenger Group**: [Join Support Group](https://m.me/j/AbYvFRTzENblDU94/)
- **Facebook**: [m.me/tormairedusi](https://m.me/tormairedusi)
- **GitHub**: [sheikhtamimlover](https://github.com/sheikhtamimlover)

For any support, feature requests, or issues, feel free to message me or join the Messenger group!

---

## 🔧 Installation & Setup

### 🖥 Method 1: Local Setup

1. **Clone the repository**:
```bash
git clone https://github.com/sheikhtamimlover/ST-BOT.git
cd ST-BOT
```

2. **Install dependencies**:
```bash
npm install
```

3. **Configure the bot**:
   - Set your **Admin UID** in `config.json` → `adminBot` array
   - Add your **Facebook cookies** in `account.txt` (JSON format)
   - Configure database settings in `config.json`

4. **Start the bot**:
```bash
npm start
```

### 🌐 Method 2: Deploy on Render (Recommended)

[![Deploy on Render]((https://img.shields.io/badge/Deploy%20on-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://replit.com/github/sheikhtamimlover/ST-BOT)

1. **One-Click Deployment**:
   - Click the "Deploy on Render" button above
   - Or fork/import this repository to Render
   - Simply click the **Run** button - Render handles everything automatically

2. **Configuration**:
   - Add your Admin UID in `config.json`
   - Add Facebook cookies in `account.txt`
   - Dashboard will be available at your Replit URL

3. **24/7 Operation**:
   - Use Render's "Always On" feature for continuous operation
   - Built-in SSL and global CDN included



1. **Quick Deploy**:
   - Connect your GitHub account to Render
   - Select this repository
   - Choose "Web Service"
   
2. **Configuration**:
   ```yaml
   Build Command: npm install
   Start Command: npm start
   Environment: Node
   ```

3. **Environment Variables** (Optional):
   - Set any sensitive configuration as environment variables
   - Dashboard will be accessible via your Render URL

---

## 💎 Premium System

The bot includes a comprehensive premium user management system that allows you to offer exclusive features to premium users.

### 🎯 How Premium System Works

**For Users:**
- Use `.premium request [message]` to request premium access
- Premium users get access to exclusive commands
- Status is saved permanently in the database

**For Admins:**
- Manage premium requests through `.premium` commands
- Add/remove premium users instantly
- View all premium users and pending requests

### 📋 Premium Commands

| Command | Description | Access |
|---------|-------------|---------|
| `.premium request [message]` | Request premium access | All Users |
| `.premium add <uid/@mention>` | Add user to premium | Admins Only |
| `.premium remove <uid/@mention>` | Remove user from premium | Admins Only |
| `.premium list [page]` | View premium users list | Admins Only |
| `.premium pending` | View pending requests | Admins Only |

### 🛠 Creating Premium Commands

To make a command premium-only, add `premium: true` to the command config:

```javascript
module.exports = {
    config: {
        name: "premiumcommand",
        premium: true, // This makes the command premium-only
        version: "1.0.0",
        author: "Your Name",
        role: 0,
        description: "Premium exclusive command",
        category: "premium"
    },

    onStart: async function({ message, getLang }) {
        // Your premium command logic here
        message.reply("🌟 This is a premium feature!");
    }
};
```

### 💡 Premium Features

- **Automatic Validation**: Bot automatically checks premium status
- **Database Integration**: Premium status synced across all platforms
- **Request Management**: Organized system for handling premium requests
- **Flexible Access**: Admins can grant/revoke access instantly
- **Error Handling**: Graceful handling of premium restrictions

---

## 📋 Essential Configuration

Before starting, make sure to configure:

1. **Admin UID**: Add your Facebook user ID to `config.json`:
```json
"adminBot": ["YOUR_FACEBOOK_UID_HERE"]
```

2. **Facebook Cookies**: Replace content in `account.txt` with your Facebook cookies in JSON format

3. **Database**: Choose between SQLite (default) or MongoDB in `config.json`

4. **Bot Settings**: Customize prefix, language, timezone in `config.json`

---

## ⭐ Special Features

### 🔐 Thread Approval System
Control which groups the bot can respond in:

```json
"threadApproval": {
  "enable": true,
  "adminNotificationThreads": ["thread_id_1", "thread_id_2"],
  "autoApproveExisting": true
}
```

### 🚀 Bot Startup Notifications
Get notified when your bot comes online:

```json
"botStartupNotification": {
  "enable": false,
  "sendToThreads": {
    "enable": true,
    "threadIds": ["thread_id_1", "thread_id_2"]
  },
  "message": "🤖 Bot is now online and ready to serve!"
}
```

### ⚡ AntiReact System
Advanced message management through reactions:

```json
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
```

### 🌐 Web Dashboard
Protected dashboard with password authentication:

```json
"dashBoard": {
  "enable": true,
  "port": 3021,
  "passwordProtection": {
    "enable": true,
    "password": "your_secure_password"
  }
}
```

---

## 🎮 Creating Custom Commands

### Command Structure

Commands are located in `scripts/cmds/` directory. Each command follows this structure:

```javascript
module.exports = {
    config: {
        name: "commandname",           // Command name (lowercase)
        aliases: ["alias1", "alias2"], // Alternative names
        version: "1.0.0",             // Command version
        author: "Your Name",          // Your name
        countDown: 5,                 // Cooldown in seconds
        role: 0,                      // 0: Everyone, 1: Group Admin, 2: Bot Admin
        premium: false,               // true: Premium only, false: Everyone
        description: "Command description",
        category: "category name",
        guide: "{pn} <usage guide>"   // Usage instructions
    },

    langs: {
        en: {
            success: "Command executed successfully!",
            error: "An error occurred!"
        }
    },

    onStart: async function({ message, args, event, api, getLang }) {
        // Main command logic here
        try {
            // Your command code
            message.reply(getLang("success"));
        } catch (error) {
            message.reply(getLang("error"));
        }
    }
};
```

### Example Premium Command

```javascript
module.exports = {
    config: {
        name: "premiumfeature",
        aliases: ["pf"],
        version: "1.0.0",
        author: "Sheikh Tamim",
        countDown: 3,
        role: 0,
        premium: true, // Premium only command
        description: "Exclusive premium feature",
        category: "premium",
        guide: "{pn} - Access premium features"
    },

    onStart: async function({ message, args }) {
        message.reply("🌟 Welcome to premium features! You have exclusive access.");
    }
};
```

---

## 🌐 Web Dashboard

The bot includes a real-time web dashboard accessible via your deployment URL. Features include:

- **Live Statistics** - Real-time bot metrics
- **User Management** - View and manage users
- **Premium Management** - Handle premium requests
- **Group Management** - Monitor group activities
- **Command Analytics** - Track command usage
- **System Monitoring** - Server status and performance

---

## 📚 Command Categories

- **Admin** - Bot administration commands
- **Premium** - Exclusive premium features
- **Fun** - Entertainment and games
- **Utility** - Useful tools and information
- **Economy** - Virtual currency system
- **Media** - Image, video, audio processing
- **AI** - Artificial intelligence integrations
- **Group** - Group management features

---

## 🔄 Regular Updates

This project receives regular updates with:
- **New Features** - Enhanced functionality
- **Bug Fixes** - Stability improvements
- **Security Patches** - Keep your bot safe
- **Performance Optimizations** - Faster response times
- **Premium Features** - Exclusive new commands

Stay updated by watching this repository or joining our support group!

---

## 📊 Project Statistics

<div align="center">

![GitHub Stats](https://github-readme-stats.vercel.app/api?username=sheikhtamimlover&repo=ST-BOT&show_icons=true&theme=radical)

![Top Languages](https://github-readme-stats.vercel.app/api/top-langs/?username=sheikhtamimlover&layout=compact&theme=radical)

</div>

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
- 🔗 Follow on Instagram: [@sheikh.tamim_lover](https://www.instagram.com/sheikh.tamim_lover/)

<div align="center">

**Happy Botting! 🤖✨**

*Made with ❤️ by Sheikh Tamim*

</div>
