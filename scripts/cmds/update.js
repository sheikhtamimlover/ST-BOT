const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const execSync = require("child_process").execSync;

const REPO = "sheikhtamimlover/ST-BOT";
const PER_PAGE = 10;
const dirBootLogTemp = path.join(__dirname, "tmp", "rebootUpdated.txt");
const dirUpdateResult = path.join(__dirname, "tmp", "updateResult.json");

module.exports = {
    config: {
        name: "update",
        version: "2.4.80",
        author: "ST | Sheikh Tamim",
        role: 2,
        description: {
            en: "Check for/install updates, view version history, rollback to previous versions."
        },
        category: "owner",
        guide: {
            en: "  {pn} - Check and install updates\n  {pn} list - View version history (paginated)\n  {pn} list <page> - Go to specific page\n  {pn} <version> - View details of a version"
        }
    },

    langs: {
        en: {
            noUpdates: "✅ You are using the latest version of ST | BOT (v%1).",
            updateConfirmed: "🚀 Confirmed! Running update...\nCheck your terminal for live progress.",
            updateComplete: "✅ Update done! Want to restart now?\nReply 'yes' or 'y' to confirm.",
            botWillRestart: "🔄 Restarting bot now!",
            updateTooFast: "⭕ Last commit was %1m %2s ago. Cooldown: %3m %4s remaining.",
            rollbackNoBackup: "❌ No backup found for v%1.\nBackups exist only for versions you previously updated through.",
            rollbackSuccess: "✅ Rolled back to v%1! Restarting...",
            rollbackFailed: "❌ Rollback failed: %1",
            invalidSerial: "❌ Invalid serial number. Valid range: 1-%1",
            invalidPage: "❌ Invalid page number. Valid range: 1-%1"
        }
    },

    onLoad: async function ({ api }) {
        fs.ensureDirSync(path.join(__dirname, "tmp"));

        if (fs.existsSync(dirBootLogTemp)) {
            const threadID = fs.readFileSync(dirBootLogTemp, "utf-8").trim();
            fs.removeSync(dirBootLogTemp);
            if (threadID) api.sendMessage("✅ Bot restarted successfully!", threadID);
        }

        if (fs.existsSync(dirUpdateResult)) {
            try {
                const result = JSON.parse(fs.readFileSync(dirUpdateResult, "utf-8"));
                fs.removeSync(dirUpdateResult);

                const config = global.GoatBot?.config || require("../../config.json");
                const mainThreadId = config.mainThreadId;
                if (!mainThreadId) return;

                let msg = `🎉 ST BOT Updated to v${result.version}!\n`;
                if (result.note) msg += `\n📝 ${result.note}\n`;
                msg += `\n📊 ${result.updatedCount} file(s) updated, ${result.deletedCount} file(s) deleted`;
                if ((result.imageUrls || []).length + (result.videoUrls || []).length + (result.audioUrls || []).length > 0) {
                    msg += `\n📎 Media attachments included`;
                }
                msg += `\n\nReply "details" to see the full file list.`;

                const attachments = [];
                const allMedia = [...(result.imageUrls || []), ...(result.videoUrls || [])].slice(0, 4);
                for (const url of allMedia) {
                    try {
                        const res = await axios.get(url, { responseType: "stream", timeout: 10000 });
                        attachments.push(res.data);
                    } catch (e) {}
                }

                const msgOpts = { body: msg };
                if (attachments.length > 0) msgOpts.attachment = attachments;

                api.sendMessage(msgOpts, mainThreadId, (err, info) => {
                    if (err || !info) return;
                    global.GoatBot.onReply.set(info.messageID, {
                        messageID: info.messageID,
                        threadID: info.threadID,
                        authorID: null,
                        commandName: "update",
                        type: "updateDetails",
                        data: result
                    });
                });
            } catch (e) {
                console.error("[UPDATE] Failed to send update result:", e.message);
            }
        }
    },

    ST: async function ({ message, getLang, commandName, event, args }) {
        const arg0 = (args[0] || "").toLowerCase();

        if (arg0 === "list") {
            const page = parseInt(args[1]) || 1;
            return await showVersionList({ message, event, commandName, page });
        }

        if (arg0 && !isNaN(parseFloat(arg0)) && arg0.includes(".")) {
            return await showVersionDetails({ message, args });
        }

        await checkForUpdates({ message, getLang, commandName, event });
    },

    onReaction: async function ({ message, getLang, Reaction, event, commandName }) {
        const reactorID = event.userID || event.senderID;
        if (Reaction.authorID && reactorID !== Reaction.authorID) return;

        if (Reaction.type === "updateConfirm") {
            try {
                const { data: lastCommit } = await axios.get(`https://api.github.com/repos/${REPO}/commits/main`);
                const age = Date.now() - new Date(lastCommit.commit.committer.date).getTime();
                const cooldown = 5 * 60 * 1000;
                if (age < cooldown) {
                    const remain = cooldown - age;
                    const rm = Math.floor(remain / 60000);
                    const rs = Math.floor((remain % 60000) / 1000);
                    const am = Math.floor(age / 60000);
                    const as2 = Math.floor((age % 60000) / 1000);
                    return message.reply(getLang("updateTooFast", am, as2, rm, rs));
                }
            } catch (e) {}

            await message.reply(getLang("updateConfirmed"));
            execSync("node updater", { stdio: "inherit" });

            fs.ensureDirSync(path.join(__dirname, "tmp"));
            fs.writeFileSync(dirBootLogTemp, event.threadID);

            message.reply(getLang("updateComplete"), (err, info) => {
                if (err || !info) return;
                global.GoatBot.onReply.set(info.messageID, {
                    messageID: info.messageID,
                    threadID: info.threadID,
                    authorID: reactorID,
                    commandName,
                    type: "restartConfirm"
                });
            });
            return;
        }

        if (Reaction.type === "rollbackConfirm") {
            const { version } = Reaction;
            try {
                await message.reply(`🔄 Rolling back to v${version}... Check terminal for progress.`);
                execSync(`node restoreBackup.js ${version}`, { stdio: "inherit" });
                fs.ensureDirSync(path.join(__dirname, "tmp"));
                fs.writeFileSync(dirBootLogTemp, event.threadID);
                await message.reply(getLang("rollbackSuccess", version));
                process.exit(2);
            } catch (e) {
                message.reply(getLang("rollbackFailed", e.message));
            }
            return;
        }
    },

    onReply: async function ({ message, getLang, event, Reply, commandName }) {
        const body = (event.body || "").trim();
        const senderID = event.senderID;

        if (Reply.type === "updateDetails") {
            if (body.toLowerCase() !== "details") return;
            const d = Reply.data;
            let msg = `📋 Update Details — v${d.version}\n━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
            if (d.updatedFilesList && d.updatedFilesList.length > 0) {
                msg += `\n⬆️ Updated (${d.updatedFilesList.length}):\n`;
                msg += d.updatedFilesList.map(f => ` - ${f}`).join("\n");
            }
            if (d.deletedFilesList && d.deletedFilesList.length > 0) {
                msg += `\n\n🗑️ Deleted (${d.deletedFilesList.length}):\n`;
                msg += d.deletedFilesList.map(f => ` - ${f}`).join("\n");
            }
            if (!d.updatedFilesList?.length && !d.deletedFilesList?.length) {
                msg += "\nNo file detail information available for this update.";
            }
            return message.reply(msg);
        }

        if (Reply.type === "restartConfirm") {
            if (senderID !== Reply.authorID) return;
            if (["yes", "y"].includes(body.toLowerCase())) {
                await message.reply(getLang("botWillRestart"));
                process.exit(2);
            }
            return;
        }

        if (Reply.type === "versionList") {
            const { totalPages, totalVersions } = Reply;

            const pageMatch = body.match(/^p\s*(\d+)$/i);
            if (pageMatch) {
                const newPage = parseInt(pageMatch[1]);
                if (newPage < 1 || newPage > totalPages) {
                    return message.reply(getLang("invalidPage", totalPages));
                }
                try { message.unsend(Reply.messageID); } catch (e) {}
                return await showVersionList({ message, event, commandName, page: newPage });
            }

            const serialNum = parseInt(body);
            if (!isNaN(serialNum) && String(serialNum) === body) {
                if (serialNum < 1 || serialNum > totalVersions) {
                    return message.reply(getLang("invalidSerial", totalVersions));
                }

                const { data: versions } = await axios.get(`https://raw.githubusercontent.com/${REPO}/refs/heads/main/versions.json`);
                const selectedVersion = versions[serialNum - 1];
                delete require.cache[require.resolve("../../package.json")];
                const currentVersion = require("../../package.json").version;

                if (selectedVersion.version === currentVersion) {
                    return message.reply(`ℹ️ v${selectedVersion.version} is already your current version.`);
                }

                const backupPath = path.join(process.cwd(), "backups", `backup_${selectedVersion.version}`);
                if (!fs.existsSync(backupPath)) {
                    return message.reply(getLang("rollbackNoBackup", selectedVersion.version));
                }

                let confirmMsg = `⚠️ Rollback to v${selectedVersion.version}?\n`;
                if (selectedVersion.note) {
                    const short = selectedVersion.note.length > 150 ? selectedVersion.note.slice(0, 147) + "..." : selectedVersion.note;
                    confirmMsg += `\n📝 ${short}\n`;
                }
                confirmMsg += `\n✅ Backup found — current files will be saved first.\nReact to this message to confirm rollback.`;

                message.reply(confirmMsg, (err, info) => {
                    if (err || !info) return;
                    global.GoatBot.onReaction.set(info.messageID, {
                        messageID: info.messageID,
                        threadID: info.threadID,
                        authorID: senderID,
                        commandName,
                        type: "rollbackConfirm",
                        version: selectedVersion.version
                    });
                });
                return;
            }
        }
    }
};

async function checkForUpdates({ message, getLang, commandName, event }) {
    const [pkgRes, versionsRes] = await Promise.all([
        axios.get(`https://raw.githubusercontent.com/${REPO}/refs/heads/main/package.json`),
        axios.get(`https://raw.githubusercontent.com/${REPO}/refs/heads/main/versions.json`)
    ]);

    const latestVersion = pkgRes.data.version;
    const versions = versionsRes.data;
    delete require.cache[require.resolve("../../package.json")];
    const currentVersion = require("../../package.json").version;

    if (compareVersion(latestVersion, currentVersion) < 1) {
        return message.reply(getLang("noUpdates", currentVersion));
    }

    const currentIdx = versions.findIndex(v => v.version === currentVersion);
    const newVersions = versions.slice(currentIdx + 1);

    const filesToUpdate = new Set();
    const filesToDelete = new Set();
    for (const v of newVersions) {
        for (const f of Object.keys(v.files || {})) { filesToUpdate.add(f); filesToDelete.delete(f); }
        for (const f of Object.keys(v.deleteFiles || {})) { filesToDelete.add(f); filesToUpdate.delete(f); }
    }

    const latestNote = [...newVersions].reverse().find(v => v.note)?.note || "";
    const allImages = newVersions.flatMap(v => v.imageUrl || []);
    const allVideos = newVersions.flatMap(v => v.videoUrl || []);
    const allAudio = newVersions.flatMap(v => v.audioUrl || []);
    const allMedia = [...allImages, ...allVideos, ...allAudio];

    let body = `💫 New update available!\n`;
    body += `\n📌 v${currentVersion}  →  v${latestVersion}\n`;
    if (latestNote) {
        const short = latestNote.length > 200 ? latestNote.slice(0, 197) + "..." : latestNote;
        body += `📝 ${short}\n`;
    }
    body += `\n📊 ${filesToUpdate.size} file(s) to update, ${filesToDelete.size} to delete`;
    if (allImages.length) body += `\n🖼️ Images: ${allImages.length}`;
    if (allVideos.length) body += `\n🎥 Videos: ${allVideos.length}`;
    if (allAudio.length) body += `\n🎵 Audio: ${allAudio.length}`;
    body += `\n\nReact to this message to confirm update.`;

    const attachments = [];
    for (const url of allMedia.slice(0, 5)) {
        try {
            const res = await axios.get(url, { responseType: "stream", timeout: 10000 });
            attachments.push(res.data);
        } catch (e) {}
    }

    const msgOpts = { body };
    if (attachments.length > 0) msgOpts.attachment = attachments;

    message.reply(msgOpts, (err, info) => {
        if (err || !info) return;
        global.GoatBot.onReaction.set(info.messageID, {
            messageID: info.messageID,
            threadID: info.threadID,
            authorID: event.senderID,
            commandName: "update",
            type: "updateConfirm"
        });
    });
}

async function showVersionList({ message, event, commandName, page = 1 }) {
    const { data: versions } = await axios.get(`https://raw.githubusercontent.com/${REPO}/refs/heads/main/versions.json`);
    delete require.cache[require.resolve("../../package.json")];
    const currentVersion = require("../../package.json").version;

    const totalVersions = versions.length;
    const totalPages = Math.ceil(totalVersions / PER_PAGE);
    page = Math.max(1, Math.min(page, totalPages));

    const reversed = [...versions].reverse();
    const startIdx = (page - 1) * PER_PAGE;
    const pageVersions = reversed.slice(startIdx, startIdx + PER_PAGE);

    let msg = `📋 ST BOT Version History (Page ${page}/${totalPages})\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

    for (let i = 0; i < pageVersions.length; i++) {
        const v = pageVersions[i];
        const serialNo = totalVersions - startIdx - i;
        const isCurrent = v.version === currentVersion;
        msg += `\n#${serialNo} v${v.version}${isCurrent ? " ✅ (Current)" : ""}`;
        if (v.note) {
            const short = v.note.length > 90 ? v.note.slice(0, 87) + "..." : v.note;
            msg += `\n   📝 ${short}`;
        }
    }

    msg += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━`;
    if (totalPages > 1) msg += `\nNavigate: reply "p 1" to "p ${totalPages}"`;
    msg += `\nRollback: reply the serial number (e.g. "3")`;

    message.reply(msg, (err, info) => {
        if (err || !info) return;
        global.GoatBot.onReply.set(info.messageID, {
            messageID: info.messageID,
            threadID: info.threadID,
            authorID: event.senderID,
            commandName: "update",
            type: "versionList",
            totalPages,
            totalVersions
        });
    });
}

async function showVersionDetails({ message, args }) {
    const version = args[0];
    const { data: versions } = await axios.get(`https://raw.githubusercontent.com/${REPO}/refs/heads/main/versions.json`);
    const v = versions.find(x => x.version === version);
    if (!v) return message.reply(`❌ Version v${version} not found in version history.`);

    const serialNo = versions.indexOf(v) + 1;
    let msg = `📌 v${v.version} — Details (Serial #${serialNo})\n━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    if (v.note) msg += `\n📝 Note:\n${v.note}\n`;

    const files = Object.keys(v.files || {});
    const deleted = Object.keys(v.deleteFiles || {});

    if (files.length > 0) {
        msg += `\n⬆️ Updated Files (${files.length}):\n`;
        msg += files.map(f => ` - ${f}`).join("\n");
    }
    if (deleted.length > 0) {
        msg += `\n\n🗑️ Deleted Files (${deleted.length}):\n`;
        msg += deleted.map(f => ` - ${f}`).join("\n");
    }
    if (v.sha) msg += `\n\n🔑 Commit SHA: ${v.sha.slice(0, 12)}...`;

    const imgs = (v.imageUrl || []).length;
    const vids = (v.videoUrl || []).length;
    const audio = (v.audioUrl || []).length;
    if (imgs || vids || audio) msg += `\n📎 Media: ${imgs} image(s), ${vids} video(s), ${audio} audio`;

    return message.reply(msg);
}

function compareVersion(v1, v2) {
    const a = v1.split(".").map(Number);
    const b = v2.split(".").map(Number);
    for (let i = 0; i < 3; i++) {
        if (a[i] > b[i]) return 1;
        if (a[i] < b[i]) return -1;
    }
    return 0;
}
