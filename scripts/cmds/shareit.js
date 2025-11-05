
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
	config: {
		name: "shareit",
		version: "2.4.70",
		author: "ST",
		countDown: 5,
		role: 2,
		description: {
			en: "Share command/event files with other ST Bot users"
		},
		category: "owner",
		guide: {
			en: "   {pn} <botUid|mention|reply> <filename1> <filename2> ...\n"
				+ "   {pn} -e <botUid|mention|reply> <filename1> <filename2> ...\n"
				+ "   {pn} -m <botUid|mention|reply> <filename> <code>\n"
				+ "   {pn} receive - View pending received files\n"
				+ "   Reply with: a/accept <numbers> - Accept files (e.g., a 1 2 3 or accept all)"
		}
	},

	langs: {
		en: {
			invalidSyntax: "⚠️ Invalid syntax!\nUse: {pn} <botUid|mention|reply> <filename1> <filename2> ...",
			fileNotFound: "❌ File \"%1\" not found in %2 folder",
			fileSent: "✅ Sent %1 file(s) to %2",
			sendError: "❌ This ShareIt option is only for ST BOT users. Other versions may not work.",
			noReceivedFiles: "📭 No pending files to receive",
			receivedFilesList: "📬 Pending Received Files:\n%1\n\n💡 Reply with:\n• a/accept <numbers> - Accept (e.g., a 1 2 3)\n• a/accept all - Accept all\n• r/reject <numbers> - Reject",
			invalidReply: "⚠️ Invalid reply. Use: a/accept <numbers> or r/reject <numbers>",
			selectFolder: "📁 Select folder:\n1️⃣ Commands\n2️⃣ Events\n\nReply with 1 or 2",
			fileExists: "⚠️ Files already exist:\n%1\n\n🔄 React to replace all\n💬 Reply with numbers to rename (e.g., 1 2 for first two files)",
			filesInstalled: "✅ Installed %1 file(s) successfully!",
			installError: "❌ Failed to install: %1",
			fileRejected: "✅ Rejected %1 file(s)",
			rejectError: "❌ Failed to reject file: %1",
			invalidBotUid: "❌ Invalid bot UID. Must be a valid user.",
			invalidNumber: "⚠️ Invalid number.",
			fileNotInList: "❌ File not found in pending list.",
			renamePrompt: "✏️ Rename file #%1 (%2):\nReply with new name:"
		}
	},

	ST: async function ({ args, message, event, api, getLang, commandName, usersData }) {
		const { STBotApis } = global.utils;
		const stbotApi = new STBotApis();
		const senderBotUid = api.getCurrentUserID();

		// Handle receive command
		if (args[0] === "receive") {
			try {
				const response = await axios.get(`${stbotApi.baseURL}/api/shareit/received/${senderBotUid}`);
				
				if (!response.data.success || response.data.total === 0) {
					return message.reply(getLang("noReceivedFiles"));
				}

				const files = response.data.data.filter(f => f.status === "pending");
				
				if (files.length === 0) {
					return message.reply(getLang("noReceivedFiles"));
				}

				let filesList = "";
				for (let i = 0; i < files.length; i++) {
					const file = files[i];
					let senderName = "Unknown";
					try {
						const userInfo = await api.getUserInfo(file.senderBotUid);
						senderName = userInfo[file.senderBotUid]?.name || file.senderBotUid;
					} catch (err) {
						senderName = file.senderBotUid;
					}
					filesList += `${i + 1}. 📤 From: ${senderName}\n   📄 ${file.filename}\n   ⏰ ${file.sharedAt}\n\n`;
				}

				const sentMsg = await message.reply(getLang("receivedFilesList", filesList));
				
				global.GoatBot.onReply.set(sentMsg.messageID, {
					commandName,
					messageID: sentMsg.messageID,
					author: event.senderID,
					type: "selectFile",
					data: { files: files }
				});
			} catch (error) {
				message.reply(getLang("sendError"));
			}
			return;
		}

		// Handle send command
		let isEvent = false;
		let isManual = false;
		let receiverBotUid = "";
		let filenames = [];

		// Parse arguments
		if (args[0] === "-e") {
			isEvent = true;
			args.shift();
		} else if (args[0] === "-m") {
			isManual = true;
			args.shift();
		}

		// Get receiver UID from mention, reply, or direct input
		if (Object.keys(event.mentions).length > 0) {
				// Get the first mentioned user ID
				receiverBotUid = Object.keys(event.mentions)[0];

				// Start with the full message body
				let cleanBody = event.body;

				// Remove all mention texts (@User or multi-word mentions)
				for (const [uid, name] of Object.entries(event.mentions)) {
						// remove both "@name" and name variations safely
						const regex = new RegExp(`@?${name}`, "gi");
						cleanBody = cleanBody.replace(regex, "").trim();
				}

				// Split cleaned body by spaces
				let bodyParts = cleanBody.split(/\s+/);

				// Remove command name
				bodyParts.shift();

				// Remove flags if present (-e or -m)
				if (bodyParts[0] === "-e" || bodyParts[0] === "-m") {
						bodyParts.shift();
				}

				// Remaining are filenames
				filenames = bodyParts.filter(arg => arg && arg.trim() !== "");
		} else if (event.messageReply) {
			receiverBotUid = event.messageReply.senderID;
			filenames = args.filter(arg => arg && arg.trim() !== '');
		} else if (args[0] && !isNaN(args[0])) {
			receiverBotUid = args[0];
			args.shift();
			filenames = args.filter(arg => arg && arg.trim() !== '');
		} else {
			return message.reply(getLang("invalidSyntax"));
		}

		// Validate receiver UID
		try {
			await api.getUserInfo(receiverBotUid);
		} catch (error) {
			return message.reply(getLang("invalidBotUid"));
		}

		// Validate filenames
		if (filenames.length === 0) {
			return message.reply(getLang("invalidSyntax"));
		}

		// Validate .js extension for filenames (except in manual mode where we add it)
		if (!isManual) {
			const invalidFiles = filenames.filter(f => !f.endsWith('.js'));
			if (invalidFiles.length > 0) {
				return message.reply(`❌ Invalid file(s): ${invalidFiles.join(', ')}\n\n💡 All files must end with .js extension`);
			}
		}

		// Handle manual code input
		if (isManual) {
			const filename = filenames[0];
			const code = filenames.slice(1).join(" ");
			if (!filename || !code) {
				return message.reply(getLang("invalidSyntax"));
			}
			// Ensure manual filename has .js extension
			if (!filename.endsWith('.js')) {
				filenames = [filename + '.js'];
			} else {
				filenames = [filename];
			}
		}

		const folder = isEvent ? "events" : "cmds";
		let successCount = 0;
		let failedFiles = [];

		// Send each file
		for (let fname of filenames) {
			// Filename should already have .js, but add if missing
			if (!fname.endsWith(".js")) {
				fname += ".js";
			}

			let fileContent = "";
			const filePath = path.join(__dirname, "..", folder, fname);

			if (isManual) {
				fileContent = filenames.slice(1).join(" ");
			} else {
				if (!fs.existsSync(filePath)) {
					failedFiles.push(`${fname} (not found)`);
					continue;
				}
				fileContent = fs.readFileSync(filePath, "utf-8");
			}

			// Send file via API
			try {
				const response = await axios.post(`${stbotApi.baseURL}/api/shareit/send`, {
					senderBotUid: senderBotUid,
					receiverBotUid: receiverBotUid,
					filename: fname,
					code: fileContent,
					description: `Shared via ShareIt - ${folder}`
				}, {
					headers: {
						'Content-Type': 'application/json'
					}
				});

				if (response.data.success) {
					successCount++;
				} else {
					// Check if error is due to non-ST BOT user
					if (response.data.error && response.data.error.includes('not registered')) {
						const receiverName = await usersData.getName(receiverBotUid) || receiverBotUid;
						return message.reply(`❌ ShareIt Failed\n\n🚫 ${receiverName} is not a registered ST BOT user.\n\n💡 ShareIt features are only available for ST BOT users. The receiver must be using ST BOT to receive shared files.`);
					}
					failedFiles.push(fname);
				}
			} catch (error) {
				// Check if it's a network/API error indicating non-ST user
				if (error.response?.data?.error?.includes('not registered') || error.response?.status === 404) {
					const receiverName = await usersData.getName(receiverBotUid) || receiverBotUid;
					return message.reply(`❌ ShareIt Failed\n\n🚫 ${receiverName} is not a registered ST BOT user.\n\n💡 ShareIt features are only available for ST BOT users. The receiver must be using ST BOT to receive shared files.`);
				}
				failedFiles.push(fname);
			}
		}

		// Send summary message
		const receiverName = await usersData.getName(receiverBotUid) || receiverBotUid;
		let resultMsg = `✅ Sent ${successCount} file(s) to ${receiverName}`;
		if (failedFiles.length > 0) {
			resultMsg += `\n❌ Failed: ${failedFiles.join(', ')}`;
		}
		await message.reply(resultMsg);
	},

	onReply: async function ({ Reply, message, event, api, getLang, commandName, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData }) {
		const { author, type, data } = Reply;

		if (event.senderID !== author) return;

		const userReply = event.body.toLowerCase().trim();

		if (type === "selectFile") {
			if (!data || !data.files) {
				return message.reply(getLang("invalidReply"));
			}

			const { files } = data;
			
			// Parse accept/reject command
			const words = userReply.split(/\s+/);
			const action = words[0];
			
			if (!["a", "accept", "r", "reject"].includes(action)) {
				return message.reply(getLang("invalidReply"));
			}

			let selectedFiles = [];
			
			// Check if "all" is specified
			if (words[1] === "all") {
				selectedFiles = files;
			} else {
				// Parse individual numbers
				const numbers = words.slice(1).map(n => parseInt(n) - 1);
				
				for (const idx of numbers) {
					if (idx >= 0 && idx < files.length) {
						selectedFiles.push(files[idx]);
					}
				}
				
				if (selectedFiles.length === 0) {
					return message.reply(getLang("invalidNumber"));
				}
			}

			if (action === "r" || action === "reject") {
				// Reject files
				try {
					const { STBotApis } = global.utils;
					const stbotApi = new STBotApis();
					
					for (const file of selectedFiles) {
						await axios.post(`${stbotApi.baseURL}/api/shareit/reject`, {
							shareId: file.shareId,
							botUid: api.getCurrentUserID()
						}, {
							headers: {
								'Content-Type': 'application/json'
							}
						});
					}

					global.GoatBot.onReply.delete(Reply.messageID);
					message.reply(getLang("fileRejected", selectedFiles.length));
				} catch (error) {
					message.reply(getLang("rejectError", "Network error"));
				}
			} else {
				// Accept files - ask for folder selection
				global.GoatBot.onReply.delete(Reply.messageID);
				const sentMsg = await message.reply(getLang("selectFolder"));
				
				global.GoatBot.onReply.set(sentMsg.messageID, {
					commandName,
					messageID: sentMsg.messageID,
					author: event.senderID,
					type: "selectFolder",
					data: { files: selectedFiles }
				});
			}
		} else if (type === "selectFolder") {
			if (!data || !data.files) {
				return message.reply(getLang("invalidReply"));
			}

			const { files } = data;
			const folderChoice = userReply.trim();

			let folder = "";
			if (folderChoice === "1") {
				folder = "cmds";
			} else if (folderChoice === "2") {
				folder = "events";
			} else {
				return message.reply(getLang("invalidReply"));
			}

			global.GoatBot.onReply.delete(Reply.messageID);

			// Check for conflicts
			const conflictFiles = [];
			const nonConflictFiles = [];
			
			for (const file of files) {
				const savePath = path.join(__dirname, "..", folder, file.filename);
				if (fs.existsSync(savePath)) {
					conflictFiles.push({ file, folder, savePath });
				} else {
					nonConflictFiles.push({ file, folder, savePath });
				}
			}

			// Install non-conflict files
			let installedCount = 0;
			for (const item of nonConflictFiles) {
				const success = await installFile(item.file, item.folder, item.savePath, message, api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getLang, true);
				if (success) installedCount++;
			}

			if (installedCount > 0) {
				message.reply(getLang("filesInstalled", installedCount));
			}

			// Handle conflicts
			if (conflictFiles.length > 0) {
				let conflictList = "";
				for (let i = 0; i < conflictFiles.length; i++) {
					conflictList += `${i + 1}. ${conflictFiles[i].file.filename}\n`;
				}
				
				const sentMsg = await message.reply(getLang("fileExists", conflictList));
				
				global.GoatBot.onReaction.set(sentMsg.messageID, {
					commandName: "shareit",
					messageID: sentMsg.messageID,
					author: event.senderID,
					type: "replaceAll",
					data: { conflicts: conflictFiles }
				});

				global.GoatBot.onReply.set(sentMsg.messageID, {
					commandName: "shareit",
					messageID: sentMsg.messageID,
					author: event.senderID,
					type: "renameConflicts",
					data: { conflicts: conflictFiles }
				});
			}
		} else if (type === "renameConflicts") {
			if (!data || !data.conflicts) {
				return message.reply(getLang("invalidReply"));
			}

			const { conflicts } = data;
			const numbers = userReply.split(/\s+/).map(n => parseInt(n) - 1).filter(n => !isNaN(n));
			
			if (numbers.length === 0) {
				return message.reply(getLang("invalidNumber"));
			}

			global.GoatBot.onReply.delete(Reply.messageID);

			// Start rename process for selected files
			const toRename = numbers.filter(idx => idx >= 0 && idx < conflicts.length).map(idx => conflicts[idx]);
			
			if (toRename.length > 0) {
				const sentMsg = await message.reply(getLang("renamePrompt", 1, toRename[0].file.filename));
				
				global.GoatBot.onReply.set(sentMsg.messageID, {
					commandName: "shareit",
					messageID: sentMsg.messageID,
					author: event.senderID,
					type: "renameFileStep",
					data: { 
						conflicts: toRename,
						currentIndex: 0
					}
				});
			}
		} else if (type === "renameFileStep") {
			if (!data || !data.conflicts) {
				return message.reply(getLang("invalidReply"));
			}

			const { conflicts, currentIndex } = data;
			let newFilename = userReply.trim();

			if (!newFilename.endsWith(".js")) {
				newFilename += ".js";
			}

			const currentConflict = conflicts[currentIndex];
			const newSavePath = path.join(__dirname, "..", currentConflict.folder, newFilename);
			
			currentConflict.file.filename = newFilename;
			currentConflict.savePath = newSavePath;
			
			await installFile(currentConflict.file, currentConflict.folder, newSavePath, message, api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getLang);

			global.GoatBot.onReply.delete(Reply.messageID);

			// Check if there are more files to rename
			if (currentIndex + 1 < conflicts.length) {
				const sentMsg = await message.reply(getLang("renamePrompt", currentIndex + 2, conflicts[currentIndex + 1].file.filename));
				
				global.GoatBot.onReply.set(sentMsg.messageID, {
					commandName: "shareit",
					messageID: sentMsg.messageID,
					author: event.senderID,
					type: "renameFileStep",
					data: { 
						conflicts: conflicts,
						currentIndex: currentIndex + 1
					}
				});
			}
		}
	},

	onReaction: async function ({ Reaction, message, event, api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getLang }) {
		const { author, type, data } = Reaction;

		if (event.userID !== author) return;

		if (type === "replaceAll") {
			if (!data || !data.conflicts) {
				return;
			}

			const { conflicts } = data;
			
			global.GoatBot.onReaction.delete(Reaction.messageID);
			global.GoatBot.onReply.delete(Reaction.messageID);
			
			let installedCount = 0;
			for (const conflict of conflicts) {
				const success = await installFile(conflict.file, conflict.folder, conflict.savePath, message, api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getLang, true);
				if (success) installedCount++;
			}

			if (installedCount > 0) {
				message.reply(getLang("filesInstalled", installedCount));
			}
		}
	}
};

async function installFile(file, folder, savePath, message, api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getLang, silent = false) {
	try {
		const { STBotApis } = global.utils;
		const stbotApi = new STBotApis();
		
		const acceptResponse = await axios.post(`${stbotApi.baseURL}/api/shareit/accept`, {
			shareId: file.shareId,
			botUid: api.getCurrentUserID()
		}, {
			headers: {
				'Content-Type': 'application/json'
			}
		});

		if (!acceptResponse.data.success) {
			throw new Error("Failed to accept file");
		}

		const codeResponse = await axios.get(acceptResponse.data.rawUrl);
		const code = codeResponse.data;

		fs.writeFileSync(savePath, code);

		const { loadScripts } = global.utils;
		const { configCommands } = global.GoatBot;
		const { log } = global.utils;

		const scriptType = folder === "cmds" ? "cmds" : "events";
		const filename = file.filename.replace(".js", "");
		
		loadScripts(scriptType, filename, log, configCommands, api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getLang);

		return true;
	} catch (error) {
		if (!silent) {
			message.reply(getLang("installError", error.message));
		}
		return false;
	}
}
