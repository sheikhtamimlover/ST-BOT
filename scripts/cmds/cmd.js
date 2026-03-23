const axios = require("axios");
const { execSync } = require("child_process");
const fs = require("fs-extra");
const path = require("path");
const cheerio = require("cheerio");
const { client } = global;

const { configCommands } = global.GoatBot;
const { log, loading, removeHomeDir, getPrefix } = global.utils;

function getDomain(url) {
	const regex = /^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:/\n]+)/im;
	const match = url.match(regex);
	return match ? match[1] : null;
}

function isURL(str) {
	try {
		new URL(str);
		return true;
	}
	catch (e) {
		return false;
	}
}

module.exports = {
	config: {
		name: "cmd",
		version: "2.4.78",
		author: "ST",
		countDown: 5,
		role: 2,
		description: {
			vi: "Quản lý các tệp lệnh của bạn",
			en: "Manage your command files"
		},
		category: "owner",
		guide: {
			vi: "   {pn} load <tên file lệnh>"
				+ "\n   {pn} loadAll"
				+ "\n   {pn} unload <tên file lệnh>"
				+ "\n   {pn} del <tên file lệnh>: Xóa file lệnh"
				+ "\n   {pn} install <url> <tên file lệnh>: Tải xuống và cài đặt một tệp lệnh từ một url, url là đường dẫn đến tệp lệnh (raw)"
				+ "\n   {pn} install <tên file lệnh> <code>: Tải xuống và cài đặt một tệp lệnh từ một code, code là mã của lệnh",
			en: "   {pn} load <command file name>"
				+ "\n   {pn} loadAll"
				+ "\n   {pn} unload <command file name>"
				+ "\n   {pn} del <command file name>: Delete command file"
				+ "\n   {pn} install <url> <command file name>: Download and install a command file from a url, url is the path to the file (raw)"
				+ "\n   {pn} install <command file name> <code>: Download and install a command file from a code, code is the code of the command"
		}
	},

	langs: {
		vi: {
			missingFileName: "⚠️ | Vui lòng nhập vào tên lệnh bạn muốn reload",
			loaded: "✅ | Đã load command \"%1\" thành công",
			loadedError: "❌ | Load command \"%1\" thất bại với lỗi\n%2: %3",
			loadedSuccess: "✅ | Đã load thành công (%1) command",
			loadedFail: "❌ | Load thất bại (%1) command\n%2",
			openConsoleToSeeError: "👀 | Hãy mở console để xem chi tiết lỗi",
			missingCommandNameUnload: "⚠️ | Vui lòng nhập vào tên lệnh bạn muốn unload",
			unloaded: "✅ | Đã unload command \"%1\" thành công",
			unloadedError: "❌ | Unload command \"%1\" thất bại với lỗi\n%2: %3",
			missingUrlCodeOrFileName: "⚠️ | Vui lòng nhập vào url hoặc code và tên file lệnh bạn muốn cài đặt",
			missingUrlOrCode: "⚠️ | Vui lòng nhập vào url hoặc code của tệp lệnh bạn muốn cài đặt",
			missingFileNameInstall: "⚠️ | Vui lòng nhập vào tên file để lưu lệnh (đuôi .js)",
			invalidUrl: "⚠️ | Vui lòng nhập vào url hợp lệ",
			invalidUrlOrCode: "⚠️ | Không thể lấy được mã lệnh",
			alreadExist: "⚠️ | File lệnh đã tồn tại, bạn có chắc chắn muốn ghi đè lên file lệnh cũ không?\nThả cảm xúc bất kì vào tin nhắn này để tiếp tục",
			installed: "✅ | Đã cài đặt command \"%1\" thành công, file lệnh được lưu tại %2",
			installedError: "❌ | Cài đặt command \"%1\" thất bại với lỗi\n%2: %3",
			missingFile: "⚠️ | Không tìm thấy tệp lệnh \"%1\"",
			invalidFileName: "⚠️ | Tên tệp lệnh không hợp lệ",
			unloadedFile: "✅ | Đã unload lệnh \"%1\"",
			deletedFile: "✅ | Đã xóa file lệnh \"%1\" thành công",
			deleteError: "❌ | Xóa file lệnh \"%1\" thất bại với lỗi: %2",
			confirmDelete: "⚠️ | Bạn có chắc chắn muốn xóa file lệnh \"%1\" không?\nThả cảm xúc bất kì vào tin nhắn này để xác nhận"
		},
		en: {
			missingFileName: "⚠️ | Please enter the command name you want to reload",
			loaded: "✅ | Loaded command \"%1\" successfully",
			loadedError: "❌ | Failed to load command \"%1\" with error\n%2: %3",
			loadedSuccess: "✅ | Loaded successfully (%1) command",
			loadedFail: "❌ | Failed to load (%1) command\n%2",
			openConsoleToSeeError: "👀 | Open console to see error details",
			missingCommandNameUnload: "⚠️ | Please enter the command name you want to unload",
			unloaded: "✅ | Unloaded command \"%1\" successfully",
			unloadedError: "❌ | Failed to unload command \"%1\" with error\n%2: %3",
			missingUrlCodeOrFileName: "⚠️ | Please enter the url or code and command file name you want to install",
			missingUrlOrCode: "⚠️ | Please enter the url or code of the command file you want to install",
			missingFileNameInstall: "⚠️ | Please enter the file name to save the command (with .js extension)",
			invalidUrl: "⚠️ | Please enter a valid url",
			invalidUrlOrCode: "⚠️ | Unable to get command code",
			alreadExist: "⚠️ | The command file already exists, are you sure you want to overwrite the old command file?\nReact to this message to continue",
			installed: "✅ | Installed command \"%1\" successfully, the command file is saved at %2",
			installedError: "❌ | Failed to install command \"%1\" with error\n%2: %3",
			missingFile: "⚠️ | Command file \"%1\" not found",
			invalidFileName: "⚠️ | Invalid command file name",
			unloadedFile: "✅ | Unloaded command \"%1\"",
			deletedFile: "✅ | Deleted command file \"%1\" successfully",
			deleteError: "❌ | Failed to delete command file \"%1\" with error: %2",
			confirmDelete: "⚠️ | Are you sure you want to delete command file \"%1\"?\nReact to this message to confirm"
		}
	},

	ST: async ({ args, message, api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, event, commandName, getLang }) => {
		const { unloadScripts, loadScripts } = global.utils;
		if (
			args[0] == "load"
			&& args.length == 2
		) {
			if (!args[1])
				return message.reply(getLang("missingFileName"));
			const infoLoad = loadScripts("cmds", args[1], log, configCommands, api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getLang);
			if (infoLoad.status == "success")
				message.reply(getLang("loaded", infoLoad.name));
			else {
				message.reply(
					getLang("loadedError", infoLoad.name, infoLoad.error.name, infoLoad.error.message)
					+ "\n" + infoLoad.error.stack
				);
				console.log(infoLoad.errorWithThoutRemoveHomeDir);
			}
		}
		else if (
			(args[0] || "").toLowerCase() == "loadall"
			|| (args[0] == "load" && args.length > 2)
		) {
			const fileNeedToLoad = args[0].toLowerCase() == "loadall" ?
				fs.readdirSync(__dirname)
					.filter(file =>
						file.endsWith(".js") &&
						!file.match(/(eg)\.js$/g) &&
						!configCommands.commandUnload?.includes(file)
					)
					.map(item => item = item.split(".")[0]) :
				args.slice(1);
			const arraySucces = [];
			const arrayFail = [];

			for (const fileName of fileNeedToLoad) {
				const infoLoad = loadScripts("cmds", fileName, log, configCommands, api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getLang);
				if (infoLoad.status == "success")
					arraySucces.push(fileName);
				else
					arrayFail.push(` ❗ ${fileName} => ${infoLoad.error.name}: ${infoLoad.error.message}`);
			}

			let msg = "";
			if (arraySucces.length > 0)
				msg += getLang("loadedSuccess", arraySucces.length);
			if (arrayFail.length > 0) {
				msg += (msg ? "\n" : "") + getLang("loadedFail", arrayFail.length, arrayFail.join("\n"));
				msg += "\n" + getLang("openConsoleToSeeError");
			}

			message.reply(msg);
		}
		else if (args[0] == "unload") {
			if (!args[1])
				return message.reply(getLang("missingCommandNameUnload"));
			const infoUnload = unloadScripts("cmds", args[1], configCommands, getLang);
			infoUnload.status == "success" ?
				message.reply(getLang("unloaded", infoUnload.name)) :
				message.reply(getLang("unloadedError", infoUnload.name, infoUnload.error.name, infoUnload.error.message));
		}
		else if (args[0] == "del" || args[0] == "delete") {
			if (!args[1])
				return message.reply(getLang("missingCommandNameUnload"));

			const fileName = args[1].endsWith('.js') ? args[1] : args[1] + '.js';
			const filePath = path.join(__dirname, fileName);

			if (!fs.existsSync(filePath))
				return message.reply(getLang("missingFile", fileName));

			// If user provided "confirm" as third argument, delete immediately
			if (args[2] && args[2].toLowerCase() === "confirm") {
				try {
					// First unload the command if it's loaded
					try {
						const commandNameFromFile = fileName.endsWith('.js') ? fileName.slice(0, -3) : fileName;
						unloadScripts("cmds", commandNameFromFile, configCommands, getLang);
					} catch (unloadError) {
						// Continue with deletion even if unload fails
					}

					// Then delete the file
					if (fs.existsSync(filePath)) {
						// GitHub sync before deletion
						const githubSync = global.utils.getGitHubSync();
						if (githubSync && githubSync.enabled) {
							await githubSync.syncFile("delete", filePath);
						}

						fs.unlinkSync(filePath);
						message.reply(getLang("deletedFile", fileName));
					} else {
						message.reply(getLang("missingFile", fileName));
					}
				} catch (error) {
					message.reply(getLang("deleteError", fileName, error.message));
				}
			}

			// Otherwise, ask for confirmation via reaction or reply
			return message.reply(getLang("confirmDelete", fileName) + "\n\n💡 You can also reply 'yes' to confirm or use: " + getPrefix(event.threadID) + "cmd del " + args[1] + " confirm", (err, info) => {
				global.GoatBot.onReaction.set(info.messageID, {
					commandName,
					messageID: info.messageID,
					type: "delete",
					author: event.senderID,
					data: {
						fileName: args[1],
						filePath
					}
				});

				global.GoatBot.onReply.set(info.messageID, {
					commandName: "cmd",
					messageID: info.messageID,
					type: "delete",
					author: event.senderID,
					data: {
						fileName: args[1],
						filePath
					}
				});
			});
		}
		else if (args[0] == "install") {
			let url = args[1];
			let fileName = args[2];
			let rawCode;

			// Check if user is replying to a message with URL
			if (event.messageReply && event.messageReply.body) {
				const repliedText = event.messageReply.body.trim();
				
				// If replying with a URL and filename is provided in command
				if (isURL(repliedText) && args[1] && args[1].endsWith('.js')) {
					url = repliedText;
					fileName = args[1];
				}
			}

			// If only filename is provided, ask for URL via reply
			if (args[1] && !args[2] && args[1].endsWith('.js') && !isURL(args[1]) && !event.messageReply) {
				fileName = args[1];
				return message.reply(`📥 Please reply to this message with the URL of the command file to install as "${fileName}"`, (err, info) => {
					global.GoatBot.onReply.set(info.messageID, {
						commandName: "cmd",
						messageID: info.messageID,
						type: "install_url",
						author: event.senderID,
						data: {
							fileName
						}
					});
				});
			}

			if (!url || !fileName)
				return message.reply(getLang("missingUrlCodeOrFileName"));

			if (
				url.endsWith(".js")
				&& !isURL(url)
			) {
				const tmp = fileName;
				fileName = url;
				url = tmp;
			}

			if (url.match(/(https?:\/\/(?:www\.|(?!www)))/)) {
				console.log("install", "url", url);
				if (!fileName || !fileName.endsWith(".js"))
					return message.reply(getLang("missingFileNameInstall"));

				const domain = getDomain(url);
				if (!domain)
					return message.reply(getLang("invalidUrl"));

				if (domain == "pastebin.com") {
					const regex = /https:\/\/pastebin\.com\/(?!raw\/)(.*)/;
					if (url.match(regex))
						url = url.replace(regex, "https://pastebin.com/raw/$1");
					if (url.endsWith("/"))
						url = url.slice(0, -1);
				}
				else if (domain == "github.com") {
					const regex = /https:\/\/github\.com\/(.*)\/blob\/(.*)/;
					if (url.match(regex))
						url = url.replace(regex, "https://raw.githubusercontent.com/$1/$2");
				}

				rawCode = (await axios.get(url)).data;

				if (domain == "savetext.net") {
					const $ = cheerio.load(rawCode);
					rawCode = $("#content").text();
				}
			}
			else {
				console.log("install", "code", args.slice(1).join(" "));
				if (args[args.length - 1].endsWith(".js")) {
					fileName = args[args.length - 1];
					rawCode = event.body.slice(event.body.indexOf('install') + 7, event.body.indexOf(fileName) - 1);
				}
				else if (args[1].endsWith(".js")) {
					fileName = args[1];
					rawCode = event.body.slice(event.body.indexOf(fileName) + fileName.length + 1);
				}
				else
					return message.reply(getLang("missingFileNameInstall"));
			}

			if (!rawCode)
				return message.reply(getLang("invalidUrlOrCode"));

			if (fs.existsSync(path.join(__dirname, fileName)))
				return message.reply(getLang("alreadExist"), (err, info) => {
					global.GoatBot.onReaction.set(info.messageID, {
						commandName,
						messageID: info.messageID,
						type: "install",
						author: event.senderID,
						data: {
							fileName,
							rawCode
						}
					});
				});
			else {
				const infoLoad = loadScripts("cmds", fileName, log, configCommands, api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getLang, rawCode);

				if (infoLoad.status == "success") {
					const filePath = path.join(__dirname, fileName);
					message.reply(getLang("installed", infoLoad.name, filePath.replace(process.cwd(), "")));

					// GitHub sync
					try {
						const githubSync = global.utils.getGitHubSync();
						if (githubSync && githubSync.enabled && githubSync.autoCommit) {
							await githubSync.syncFile("upload", filePath, rawCode);
						}
					} catch (syncError) {
						console.log("GitHub sync warning:", syncError.message);
					}
				} else {
					message.reply(getLang("installedError", infoLoad.name, infoLoad.error.name, infoLoad.error.message));
				}
			}
		}
		else
			message.SyntaxError();
	},

	onReply: async function ({ Reply, message, event, api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getLang }) {
		const { author, type, data } = Reply;

		// Check if the user replying is the same as the author of the original command
		if (event.senderID != author) {
			return message.reply("❌ Only the original command author can confirm this action");
		}

		// Check if user is bot admin
		const { config } = global.GoatBot;
		const userID = event.senderID;
		const isAdminBot = config.adminBot.includes(userID.toString()) || config.adminBot.includes(userID);

		if (!isAdminBot) {
			return message.reply("❌ Only bot's admin can use this command");
		}

		const userResponse = event.body.trim();

		// Handle install via URL reply
		if (type == "install_url") {
			const { fileName } = data;
			const url = userResponse;

			// Delete the reply message
			Reply.delete();

			// Check if response is a valid URL
			if (!isURL(url)) {
				return message.reply("❌ Invalid URL. Please provide a valid URL to the command file.");
			}

			try {
				let rawCode;
				const domain = getDomain(url);
				let processedUrl = url;

				if (!domain) {
					return message.reply(getLang("invalidUrl"));
				}

				// Process different URL types
				if (domain == "pastebin.com") {
					const regex = /https:\/\/pastebin\.com\/(?!raw\/)(.*)/;
					if (processedUrl.match(regex))
						processedUrl = processedUrl.replace(regex, "https://pastebin.com/raw/$1");
					if (processedUrl.endsWith("/"))
						processedUrl = processedUrl.slice(0, -1);
				}
				else if (domain == "github.com") {
					const regex = /https:\/\/github\.com\/(.*)\/blob\/(.*)/;
					if (processedUrl.match(regex))
						processedUrl = processedUrl.replace(regex, "https://raw.githubusercontent.com/$1/$2");
				}

				// Fetch the code
				rawCode = (await axios.get(processedUrl)).data;

				if (domain == "savetext.net") {
					const $ = cheerio.load(rawCode);
					rawCode = $("#content").text();
				}

				if (!rawCode) {
					return message.reply(getLang("invalidUrlOrCode"));
				}

				// Check if file already exists
				if (fs.existsSync(path.join(__dirname, fileName))) {
					return message.reply(getLang("alreadExist"), (err, info) => {
						global.GoatBot.onReaction.set(info.messageID, {
							commandName: "cmd",
							messageID: info.messageID,
							type: "install",
							author: event.senderID,
							data: {
								fileName,
								rawCode
							}
						});
					});
				}

				// Install the command
				const { loadScripts } = global.utils;
				const { configCommands } = global.GoatBot;
				const infoLoad = loadScripts("cmds", fileName, log, configCommands, api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getLang, rawCode);

				if (infoLoad.status == "success") {
					const filePath = path.join(__dirname, fileName);
					message.reply(getLang("installed", infoLoad.name, filePath.replace(process.cwd(), "")));

					// GitHub sync
					try {
						const githubSync = global.utils.getGitHubSync();
						if (githubSync && githubSync.enabled && githubSync.autoCommit) {
							await githubSync.syncFile("upload", filePath, rawCode);
						}
					} catch (syncError) {
						console.log("GitHub sync warning:", syncError.message);
					}
				} else {
					message.reply(getLang("installedError", infoLoad.name, infoLoad.error.name, infoLoad.error.message));
				}

			} catch (error) {
				message.reply(`❌ Failed to install command: ${error.message}`);
			}
		}
		// Handle delete confirmation
		else if (type == "delete" && (userResponse.toLowerCase() === "yes" || userResponse.toLowerCase() === "y" || userResponse.toLowerCase() === "confirm")) {
			const { unloadScripts } = global.utils;
			const { fileName, filePath } = data;
			const { configCommands } = global.GoatBot;

			// Delete the reply message
			Reply.delete();

			try {
				// First unload the command if it's loaded
				try {
					const commandNameFromFile = fileName.endsWith('.js') ? fileName.slice(0, -3) : fileName;
					unloadScripts("cmds", commandNameFromFile, configCommands, getLang);
				} catch (unloadError) {
					// Continue with deletion even if unload fails
				}

				// Then delete the file
				if (fs.existsSync(filePath)) {
					// GitHub sync before deletion
					const githubSync = global.utils.getGitHubSync();
					if (githubSync && githubSync.enabled) {
						await githubSync.syncFile("delete", filePath);
					}

					fs.unlinkSync(filePath);
					message.reply(getLang("deletedFile", fileName));
				} else {
					message.reply(getLang("missingFile", fileName));
				}
			} catch (error) {
				message.reply(getLang("deleteError", fileName, error.message));
			}
		} else if (type == "delete") {
			Reply.delete();
			message.reply("❌ Deletion cancelled. Please reply with 'yes' or 'confirm' to delete the file.");
		}
	},

	onReaction: async function ({ Reaction, message, event, api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getLang }) {
		const { loadScripts, unloadScripts } = global.utils;
		const { author, type, data } = Reaction;

		// Check if user is bot admin first
		const { config } = global.GoatBot;
		const userID = event.userID;
		const isAdminBot = config.adminBot.includes(userID.toString()) || config.adminBot.includes(userID);

		if (!isAdminBot) {
			return message.reply("❌ Only bot's admin can use the reaction function of the command 'cmd'");
		}

		// For cmd command, allow any admin to react, not just the author
		// This is because cmd is an admin-only command

		// Delete the reaction message after processing
		Reaction.delete();

		if (type == "install") {
			const { fileName, rawCode } = data;
			const { configCommands } = global.GoatBot;
			const infoLoad = loadScripts("cmds", fileName, log, configCommands, api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getLang, rawCode);
			infoLoad.status == "success" ?
				message.reply(getLang("installed", infoLoad.name, path.join(__dirname, fileName).replace(process.cwd(), ""))) :
				message.reply(getLang("installedError", infoLoad.name, infoLoad.error.name, infoLoad.error.message));
		}
		else if (type == "delete") {
			const { fileName, filePath } = data;
			const { configCommands } = global.GoatBot;
			try {
				// First unload the command if it's loaded
				try {
					const commandNameFromFile = fileName.endsWith('.js') ? fileName.slice(0, -3) : fileName;
					unloadScripts("cmds", commandNameFromFile, configCommands, getLang);
				} catch (unloadError) {
					// Continue with deletion even if unload fails
				}

				// Then delete the file
				if (fs.existsSync(filePath)) {
					// GitHub sync before deletion
					const githubSync = global.utils.getGitHubSync();
					if (githubSync && githubSync.enabled) {
						await githubSync.syncFile("delete", filePath);
					}

					fs.unlinkSync(filePath);
					message.reply(getLang("deletedFile", fileName));
				} else {
					message.reply(getLang("missingFile", fileName));
				}
			} catch (error) {
				message.reply(getLang("deleteError", fileName, error.message));
			}
		}
	}
};

// do not edit this code because it use for obfuscate code
const packageAlready = [];
const spinner = "\\|/-";
let count = 0;

function loadScripts(folder, fileName, log, configCommands, api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getLang, rawCode) {
	// global.GoatBot[folderModules == "cmds" ? "commandFilesPath" : "eventCommandsFilesPath"].push({
	// 	filePath: pathCommand,
	// 	commandName: [commandName, ...validAliases]
	// });
	const storageCommandFilesPath = global.GoatBot[folder == "cmds" ? "commandFilesPath" : "eventCommandsFilesPath"];

	try {
		if (rawCode) {
			fileName = fileName.slice(0, -3);
			fs.writeFileSync(path.normalize(`${process.cwd()}/scripts/${folder}/${fileName}.js`), rawCode);
		}
		const regExpCheckPackage = /require(\s+|)\((\s+|)[`'"]([^`'"]+)[`'"](\s+|)\)/g;
		const { GoatBot } = global;
		const { onFirstChat: allOnFirstChat, onChat: allOnChat, onEvent: allOnEvent, onAnyEvent: allOnAnyEvent } = GoatBot;
		let setMap, typeEnvCommand, commandType;
		if (folder == "cmds") {
			typeEnvCommand = "envCommands";
			setMap = "commands";
			commandType = "command";
		}
		else if (folder == "events") {
			typeEnvCommand = "envEvents";
			setMap = "eventCommands";
			commandType = "event command";
		}
		// const pathCommand = path.normalize(path.normalize(process.cwd() + `/${folder}/${fileName}.js`));
		let pathCommand;
		pathCommand = path.normalize(process.cwd() + `/scripts/${folder}/${fileName}.js`);

		// ————————————————— CHECK PACKAGE ————————————————— //
		const contentFile = fs.readFileSync(pathCommand, "utf8");
		let allPackage = contentFile.match(regExpCheckPackage);
		if (allPackage) {
			allPackage = allPackage
				.map(p => p.match(/[`'"]([^`'"]+)[`'"]/)[1])
				.filter(p => p.indexOf("/") !== 0 && p.indexOf("./") !== 0 && p.indexOf("../") !== 0 && p.indexOf(__dirname) !== 0);
			for (let packageName of allPackage) {
				// @user/abc => @user/abc
				// @user/abc/dist/xyz.js => @user/abc
				// @user/abc/dist/xyz => @user/abc
				if (packageName.startsWith('@'))
					packageName = packageName.split('/').slice(0, 2).join('/');
				else
					packageName = packageName.split('/')[0];

				if (!packageAlready.includes(packageName)) {
					packageAlready.push(packageName);
					if (!fs.existsSync(`${process.cwd()}/node_modules/${packageName}`)) {
						let wating;
						try {
							wating = setInterval(() => {
								count++;
								loading.info("PACKAGE", `Installing ${packageName} ${spinner[count % spinner.length]}`);
							}, 80);
							execSync(`npm install ${packageName} --save`, { stdio: "pipe" });
							clearInterval(wating);
							process.stderr.clearLine();
						}
						catch (error) {
							clearInterval(wating);
							process.stderr.clearLine();
							throw new Error(`Can't install package ${packageName}`);
						}
					}
				}
			}
		}
		// ———————————————— GET OLD COMMAND ———————————————— //
		const oldCommand = require(pathCommand);
		const oldCommandName = oldCommand?.config?.name;
		// —————————————— CHECK COMMAND EXIST ——————————————— //
		if (!oldCommandName) {
			if (GoatBot[setMap].get(oldCommandName)?.location != pathCommand)
				throw new Error(`${commandType} name "${oldCommandName}" is already exist in command "${removeHomeDir(GoatBot[setMap].get(oldCommandName)?.location || "")}"`);
		}
		// ————————————————— CHECK ALIASES ————————————————— //
		if (oldCommand.config.aliases) {
			let oldAliases = oldCommand.config.aliases;
			if (typeof oldAliases == "string")
				oldAliases = [oldAliases];
			for (const alias of oldAliases)
				GoatBot.aliases.delete(alias);
		}
		// ——————————————— DELETE OLD COMMAND ——————————————— //
		delete require.cache[require.resolve(pathCommand)];
		// —————————————————————————————————————————————————— //



		// ———————————————— GET NEW COMMAND ———————————————— //
		const command = require(pathCommand);
		command.location = pathCommand;
		const configCommand = command.config;
		if (!configCommand || typeof configCommand != "object")
			throw new Error("config of command must be an object");
		// —————————————————— CHECK SYNTAX —————————————————— //
		const scriptName = configCommand.name;

		// Check onChat function
		const indexOnChat = allOnChat.findIndex(item => item == oldCommandName);
		if (indexOnChat != -1)
			allOnChat.splice(indexOnChat, 1);

		// Check onFirstChat function
		const indexOnFirstChat = allOnChat.findIndex(item => item == oldCommandName);
		let oldOnFirstChat;
		if (indexOnFirstChat != -1) {
			oldOnFirstChat = allOnFirstChat[indexOnFirstChat];
			allOnFirstChat.splice(indexOnFirstChat, 1);
		}

		// Check onEvent function
		const indexOnEvent = allOnEvent.findIndex(item => item == oldCommandName);
		if (indexOnEvent != -1)
			allOnEvent.splice(indexOnEvent, 1);

		// Check onAnyEvent function
		const indexOnAnyEvent = allOnAnyEvent.findIndex(item => item == oldCommandName);
		if (indexOnAnyEvent != -1)
			allOnAnyEvent.splice(indexOnAnyEvent, 1);

		// Check onLoad function
		if (command.onLoad)
			command.onLoad({ api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData });

		const { envGlobal, envConfig } = configCommand;
		if (!command.onStart && !command.ST)
			throw new Error(`onStart or ST function of ${commandType} "${scriptName}" is required`);
		if (command.onStart && typeof command.onStart !== "function")
			throw new Error(`onStart of ${commandType} "${scriptName}" must be a function`);
		if (command.ST && typeof command.ST !== "function")
			throw new Error(`ST of ${commandType} "${scriptName}" must be a function`);
		if (!scriptName)
			throw new Error('Name of command is missing!');
		// ————————————————— CHECK ALIASES ————————————————— //
		if (configCommand.aliases) {
			let { aliases } = configCommand;
			if (typeof aliases == "string")
				aliases = [aliases];
			for (const alias of aliases) {
				if (aliases.filter(item => item == alias).length > 1)
					throw new Error(`alias "${alias}" duplicate in ${commandType} "${scriptName}" with file name "${removeHomeDir(pathCommand || "")}"`);
				if (GoatBot.aliases.has(alias))
					throw new Error(`alias "${alias}" is already exist in ${commandType} "${GoatBot.aliases.get(alias)}" with file name "${removeHomeDir(GoatBot[setMap].get(GoatBot.aliases.get(alias))?.location || "")}"`);
				GoatBot.aliases.set(alias, scriptName);
			}
		}
		// ————————————————— CHECK ENVCONFIG ————————————————— //
		// env Global
		if (envGlobal) {
			if (typeof envGlobal != "object" || Array.isArray(envGlobal))
				throw new Error("envGlobal must be an object");
			for (const key in envGlobal)
				configCommands.envGlobal[key] = envGlobal[key];
		}
		// env Config
		if (envConfig && typeof envConfig == "object" && !Array.isArray(envConfig)) {
			if (!configCommands[typeEnvCommand][scriptName])
				configCommands[typeEnvCommand][scriptName] = {};
			configCommands[typeEnvCommand][scriptName] = envConfig;
		}
		GoatBot[setMap].delete(oldCommandName);
		GoatBot[setMap].set(scriptName, command);
		fs.writeFileSync(client.dirConfigCommands, JSON.stringify(configCommands, null, 2));
		const keyUnloadCommand = folder == "cmds" ? "commandUnload" : "commandEventUnload";
		const findIndex = (configCommands[keyUnloadCommand] || []).indexOf(`${fileName}.js`);
		if (findIndex != -1)
			configCommands[keyUnloadCommand].splice(findIndex, 1);
		fs.writeFileSync(client.dirConfigCommands, JSON.stringify(configCommands, null, 2));


		if (command.onChat)
			allOnChat.push(scriptName);

		if (command.onFirstChat)
			allOnFirstChat.push({ commandName: scriptName, threadIDsChattedFirstTime: oldOnFirstChat?.threadIDsChattedFirstTime || [] });

		if (command.onEvent)
			allOnEvent.push(scriptName);

		if (command.onAnyEvent)
			allOnAnyEvent.push(scriptName);

		const indexStorageCommandFilesPath = storageCommandFilesPath.findIndex(item => item.filePath == pathCommand);
		if (indexStorageCommandFilesPath != -1)
			storageCommandFilesPath.splice(indexStorageCommandFilesPath, 1);
		storageCommandFilesPath.push({
			filePath: pathCommand,
			commandName: [scriptName, ...configCommand.aliases || []]
		});

		return {
			status: "success",
			name: fileName,
			command
		};
	}
	catch (err) {
		const defaultError = new Error();
		defaultError.name = err.name;
		defaultError.message = err.message;
		defaultError.stack = err.stack;

		err.stack ? err.stack = removeHomeDir(err.stack || "") : "";
		fs.writeFileSync(global.client.dirConfigCommands, JSON.stringify(configCommands, null, 2));
		return {
			status: "failed",
			name: fileName,
			error: err,
			errorWithThoutRemoveHomeDir: defaultError
		};
	}
}

function unloadScripts(folder, fileName, configCommands, getLang) {
	const pathCommand = `${process.cwd()}/scripts/${folder}/${fileName}.js`;
	if (!fs.existsSync(pathCommand)) {
		const err = new Error(getLang("missingFile", `${fileName}.js`));
		err.name = "FileNotFound";
		throw err;
	}
	const command = require(pathCommand);
	const commandName = command.config?.name;
	if (!commandName)
		throw new Error(getLang("invalidFileName", `${fileName}.js`));
	const { GoatBot } = global;
	const { onChat: allOnChat, onEvent: allOnEvent, onAnyEvent: allOnAnyEvent } = GoatBot;
	const indexOnChat = allOnChat.findIndex(item => item == commandName);
	if (indexOnChat != -1)
		allOnChat.splice(indexOnChat, 1);
	const indexOnEvent = allOnEvent.findIndex(item => item == commandName);
	if (indexOnEvent != -1)
		allOnEvent.splice(indexOnEvent, 1);
	const indexOnAnyEvent = allOnAnyEvent.findIndex(item => item == commandName);
	if (indexOnAnyEvent != -1)
		allOnAnyEvent.splice(indexOnAnyEvent, 1);
	// ————————————————— CHECK ALIASES ————————————————— //
	if (command.config.aliases) {
		let aliases = command.config?.aliases || [];
		if (typeof aliases == "string")
			aliases = [aliases];
		for (const alias of aliases)
			GoatBot.aliases.delete(alias);
	}
	const setMap = folder == "cmds" ? "commands" : "eventCommands";
	delete require.cache[require.resolve(pathCommand)];
	GoatBot[setMap].delete(commandName);
	log.master("UNLOADED", getLang("unloaded", commandName));
	const commandUnload = configCommands[folder == "cmds" ? "commandUnload" : "commandEventUnload"] || [];
	if (!commandUnload.includes(`${fileName}.js`))
		commandUnload.push(`${fileName}.js`);
	configCommands[folder == "cmds" ? "commandUnload" : "commandEventUnload"] = commandUnload;
	fs.writeFileSync(global.client.dirConfigCommands, JSON.stringify(configCommands, null, 2));
	return {
		status: "success",
		name: fileName
	};
}

global.utils.loadScripts = loadScripts;
global.utils.unloadScripts = unloadScripts;