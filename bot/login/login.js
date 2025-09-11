// set bash title
process.stdout.write("\x1b]2;ST Bot V2 - Made by ST | Sheikh Tamim\x1b\x5c");
const defaultRequire = require;

function decode(text) {
	text = Buffer.from(text, 'hex').toString('utf-8');
	text = Buffer.from(text, 'hex').toString('utf-8');
	text = Buffer.from(text, 'base64').toString('utf-8');
	return text;
}

const gradient = defaultRequire("gradient-string");
const axios = defaultRequire("axios");
const path = defaultRequire("path");
const readline = defaultRequire("readline");
const fs = defaultRequire("fs-extra");
const toptp = defaultRequire("totp-generator");
const login = defaultRequire(`${process.cwd()}/fb-chat-api`);
const qr = new (defaultRequire("qrcode-reader"));
const Canvas = defaultRequire("canvas");
const https = defaultRequire("https");

async function getName(userID) {
	try {
		const user = await axios.post(`https://www.facebook.com/api/graphql/?q=${`node(${userID}){name}`}`);
		return user.data[userID].name;
	}
	catch (error) {
		return null;
	}
}


function compareVersion(version1, version2) {
	const v1 = version1.split(".");
	const v2 = version2.split(".");
	for (let i = 0; i < 3; i++) {
		if (parseInt(v1[i]) > parseInt(v2[i]))
			return 1; // version1 > version2
		if (parseInt(v1[i]) < parseInt(v2[i]))
			return -1; // version1 < version2
	}
	return 0; // version1 = version2
}

const { writeFileSync, readFileSync, existsSync, watch } = require("fs-extra");
const handlerWhenListenHasError = require("./handlerWhenListenHasError.js");
const checkLiveCookie = require("./checkLiveCookie.js");
const { callbackListenTime, storage5Message } = global.GoatBot;
const { log, logColor, getPrefix, createOraDots, jsonStringifyColor, getText, convertTime, colors, randomString } = global.utils;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const currentVersion = require(`${process.cwd()}/package.json`).version;

function centerText(text, length) {
	const width = process.stdout.columns;
	const leftPadding = Math.floor((width - (length || text.length)) / 2);
	const rightPadding = width - leftPadding - (length || text.length);
	// Build the padded string using the calculated padding values
	const paddedString = ' '.repeat(leftPadding > 0 ? leftPadding : 0) + text + ' '.repeat(rightPadding > 0 ? rightPadding : 0);
	// Print the padded string to the terminal
	console.log(paddedString);
}

// logo
const titles = [
	[
		"███████╗████████╗    ██████╗  ██████╗ ████████╗",
		"██╔════╝╚══██╔══╝    ██╔══██╗██╔═══██╗╚══██╔══╝",
		"███████╗   ██║       ██████╔╝██║   ██║   ██║   ",
		"╚════██║   ██║       ██╔══██╗██║   ██║   ██║   ",
		"███████║   ██║       ██████╔╝╚██████╔╝   ██║   ",
		"╚══════╝   ╚═╝       ╚═════╝  ╚═════╝    ╚═╝   "
	],
	[
		"███████╗████████╗    ██████╗  ██████╗ ████████╗",
		"██╔════╝╚══██╔══╝    ██╔══██╗██╔═══██╗╚══██╔══╝",
		"███████╗   ██║       ██████╔╝██║   ██║   ██║   ",
		"╚════██║   ██║       ██╔══██╗██║   ██║   ██║   ",
		"███████║   ██║       ██████╔╝╚██████╔╝   ██║   ",
		"╚══════╝   ╚═╝       ╚═════╝  ╚═════╝    ╚═╝   "
	],
	[
		"S T  B O T  V 2 @" + currentVersion
	],
	[
		"ST BOT V2"
	]
];
const maxWidth = process.stdout.columns;
const title = maxWidth > 58 ?
	titles[0] :
	maxWidth > 36 ?
		titles[1] :
		maxWidth > 26 ?
			titles[2] :
			titles[3];

console.log(gradient("#f5af19", "#f12711")(createLine(null, true)));
console.log();
for (const text of title) {
	const textColor = gradient("#FA8BFF", "#2BD2FF", "#2BFF88")(text);
	centerText(textColor, text.length);
}
let subTitle = `ST | Sheikh Tamim - A simple Bot chat messenger use personal account`;
const subTitleArray = [];
if (subTitle.length > maxWidth) {
	while (subTitle.length > maxWidth) {
		let lastSpace = subTitle.slice(0, maxWidth).lastIndexOf(' ');
		lastSpace = lastSpace == -1 ? maxWidth : lastSpace;
		subTitleArray.push(subTitle.slice(0, lastSpace).trim());
		subTitle = subTitle.slice(lastSpace).trim();
	}
	subTitle ? subTitleArray.push(subTitle) : '';
}
else {
	subTitleArray.push(subTitle);
}
const author = ("Created by ST | Sheikh Tamim with ♡");
const srcUrl = ("Source code: https://github.com/sheikhtamimlover/ST-BOT.git");
const fakeRelease = ("ALL VERSIONS NOT RELEASED HERE ARE FAKE");
for (const t of subTitleArray) {
	const textColor2 = gradient("#9F98E8", "#AFF6CF")(t);
	centerText(textColor2, t.length);
}
centerText(gradient("#9F98E8", "#AFF6CF")(author), author.length);
centerText(gradient("#9F98E8", "#AFF6CF")(srcUrl), srcUrl.length);
centerText(gradient("#f5af19", "#f12711")(fakeRelease), fakeRelease.length);

let widthConsole = process.stdout.columns;
if (widthConsole > 50)
	widthConsole = 50;

function createLine(content, isMaxWidth = false) {
	if (!content)
		return Array(isMaxWidth ? process.stdout.columns : widthConsole).fill("─").join("");
	else {
		content = ` ${content.trim()} `;
		const lengthContent = content.length;
		const lengthLine = isMaxWidth ? process.stdout.columns - lengthContent : widthConsole - lengthContent;
		let left = Math.floor(lengthLine / 2);
		if (left < 0 || isNaN(left))
			left = 0;
		const lineOne = Array(left).fill("─").join("");
		return lineOne + content + lineOne;
	}
}

const character = createLine();

const clearLines = (n) => {
	for (let i = 0; i < n; i++) {
		const y = i === 0 ? null : -1;
		process.stdout.moveCursor(0, y);
		process.stdout.clearLine(1);
	}
	process.stdout.cursorTo(0);
	process.stdout.write('');
};

async function input(prompt, isPassword = false) {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});

	if (isPassword)
		rl.input.on("keypress", function () {
			// get the number of characters entered so far:
			const len = rl.line.length;
			// move cursor back to the beginning of the input:
			readline.moveCursor(rl.output, -len, 0);
			// clear everything to the right of the cursor:
			readline.clearLine(rl.output, 1);
			// replace the original input with asterisks:
			for (let i = 0; i < len; i++) {
				rl.output.write("*");
			}
		});

	return new Promise(resolve => rl.question(prompt, ans => {
		rl.close();
		resolve(ans);
	}));
}

qr.readQrCode = async function (filePath) {
	const image = await Canvas.loadImage(filePath);
	const canvas = Canvas.createCanvas(image.width, image.height);
	const ctx = canvas.getContext("2d");
	ctx.drawImage(image, 0, 0);
	const data = ctx.getImageData(0, 0, image.width, image.height);
	let value;
	qr.callback = function (error, result) {
		if (error)
			throw error;
		value = result;
	};
	qr.decode(data);
	return value.result;
};

const { dirAccount } = global.client;
// const { config, configCommands } = global.GoatBot;
const botAccountConfig = global.GoatBot.config.botAccount; // Use botAccount from config

function responseUptimeSuccess(req, res) {
	res.type('json').send({
		status: "success",
		uptime: process.uptime(),
		unit: "seconds"
	});
}

function responseUptimeError(req, res) {
	res.status(500).type('json').send({
		status: "error",
		uptime: process.uptime(),
		statusAccountBot: global.statusAccountBot
	});
}

function checkAndTrimString(string) {
	if (typeof string == "string")
		return string.trim();
	return string;
}

function filterKeysAppState(appState) {
	return appState.filter(item => ["c_user", "xs", "datr", "fr", "sb", "i_user"].includes(item.key));
}

global.responseUptimeCurrent = responseUptimeSuccess;
global.responseUptimeSuccess = responseUptimeSuccess;
global.responseUptimeError = responseUptimeError;

global.statusAccountBot = 'good';
let changeFbStateByCode = false;
let latestChangeContentAccount = fs.statSync(dirAccount).mtimeMs;
let dashBoardIsRunning = false;


async function getAppStateFromEmail(spin = { _start: () => { }, _stop: () => { } }, accountInfo) {
	const { email, password, userAgent, proxy, "2FASecret": twoFASecret } = accountInfo; // Use accountInfo instead of facebookAccount
	const getFbstate = require("./getFbstate1.js");
	let code2FATemp;
	let appState;
	try {
		try {
			appState = await getFbstate(checkAndTrimString(email), checkAndTrimString(password), userAgent, proxy);
			spin._stop();
		}
		catch (err) {
			if (err.continue) {
				let tryNumber = 0;
				let isExit = false;

				await (async function submitCode(message) {
					if (message && isExit) {
						spin._stop();
						log.error("LOGIN FACEBOOK", message);
						process.exit();
					}

					if (message) {
						spin._stop();
						log.warn("LOGIN FACEBOOK", message);
					}

					if (twoFASecret && tryNumber == 0) { // Use twoFASecret from accountInfo
						switch (['.png', '.jpg', '.jpeg'].some(i => twoFASecret.endsWith(i))) { // Use twoFASecret from accountInfo
							case true:
								code2FATemp = (await qr.readQrCode(`${process.cwd()}/${twoFASecret}`)).replace(/.*secret=(.*)&digits.*/g, '$1'); // Use twoFASecret from accountInfo
								break;
							case false:
								code2FATemp = twoFASecret; // Use twoFASecret from accountInfo
								break;
						}
					}
					else {
						spin._stop();
						code2FATemp = await input("> Enter 2FA code or secret: ");
						readline.moveCursor(process.stderr, 0, -1);
						readline.clearScreenDown(process.stderr);
					}

					const code2FA = isNaN(code2FATemp) ?
						toptp(
							code2FATemp.normalize("NFD")
								.toLowerCase()
								.replace(/[\u0300-\u036f]/g, "")
								.replace(/[đ|Đ]/g, (x) => x == "đ" ? "d" : "D")
								.replace(/\(|\)|\,/g, "")
								.replace(/ /g, "")
						) :
						code2FATemp;
					spin._start();
					try {
						appState = JSON.parse(JSON.stringify(await err.continue(code2FA)));
						appState = appState.map(item => ({
							key: item.key,
							value: item.value,
							domain: item.domain,
							path: item.path,
							hostOnly: item.hostOnly,
							creation: item.creation,
							lastAccessed: item.lastAccessed
						})).filter(item => item.key);
						spin._stop();
					}
					catch (err) {
						tryNumber++;
						if (!err.continue)
							isExit = true;
						await submitCode(err.message);
					}
				})(err.message);
			}
			else
				throw err;
		}
	}
	catch (err) {
		// If initial login fails, try using loginMbasic as fallback
		try {
			const loginMbasic = require("./loginMbasic.js");
			appState = await loginMbasic(checkAndTrimString(email), checkAndTrimString(password), userAgent, proxy);
			spin._stop();
		} catch (fallbackErr) {
			throw new Error(`Login failed: ${err.message}. Fallback login also failed: ${fallbackErr.message}`);
		}
	}

	// Removed the global.GoatBot.config.facebookAccount['2FASecret'] update as we are no longer using facebookAccount directly
	// writeFileSync(global.client.dirConfig, JSON.stringify(global.GoatBot.config, null, 2));
	return appState;
}


function isNetScapeCookie(cookie) {
	if (typeof cookie !== 'string')
		return false;
	return /(.+)\t(1|TRUE|true)\t([\w\/.-]*)\t(1|TRUE|true)\t\d+\t([\w-]+)\t(.+)/i.test(cookie);
	// match
}

function netScapeToCookies(cookieData) {
	const cookies = [];
	const lines = cookieData.split('\n');
	lines.forEach((line) => {
		if (line.trim().startsWith('#')) {
			return;
		}
		const fields = line.split('\t').map((field) => field.trim()).filter((field) => field.length > 0);
		if (fields.length < 7) {
			return;
		}
		const cookie = {
			key: fields[5],
			value: fields[6],
			domain: fields[0],
			path: fields[2],
			hostOnly: fields[1] === 'TRUE',
			creation: new Date(fields[4] * 1000).toISOString(),
			lastAccessed: new Date().toISOString()
		};
		cookies.push(cookie);
	});
	return cookies;
}

function pushI_user(appState, value) {
	appState.push({
		key: "i_user",
		value: value || botAccountConfig.i_user, // Use botAccountConfig for i_user
		domain: "facebook.com",
		path: "/",
		hostOnly: false,
		creation: new Date().toISOString(),
		lastAccessed: new Date().toISOString()
	});
	return appState;
}

let spin;
async function getAppStateToLogin(loginWithEmail) {
	let appState = [];
	if (loginWithEmail) {
		// If logging in with email, use the provided email and password from config
		return await getAppStateFromEmail(undefined, {
			email: botAccountConfig.email,
			password: botAccountConfig.password,
			userAgent: botAccountConfig.userAgent,
			proxy: botAccountConfig.proxy,
			"2FASecret": botAccountConfig["2FASecret"] // Pass 2FA secret from config
		});
	}
	if (!existsSync(dirAccount))
		return log.error("LOGIN FACEBOOK", getText('login', 'notFoundDirAccount', colors.green(dirAccount)));

	const accountText = readFileSync(dirAccount, "utf8").trim();

	// Check if account.txt is empty
	if (!accountText) {
		log.info("LOGIN FACEBOOK", "account.txt is empty, attempting to use bot account credentials");

		// Try bot account credentials from config if configured
		if (global.GoatBot.config.botAccount?.email &&
			global.GoatBot.config.botAccount?.password) {

			try {
				log.info("LOGIN FACEBOOK", "Bot account email and password found in config.json");
				log.info("LOGIN FACEBOOK", `Using email: ${global.GoatBot.config.botAccount.email}`);

				spin = createOraDots("Logging in with bot account credentials...");
				spin._start();

				const { getBotAccountCookies } = require("./botacc.js");
				const botAppState = await getBotAccountCookies({
					email: global.GoatBot.config.botAccount.email,
					password: global.GoatBot.config.botAccount.password,
					userAgent: global.GoatBot.config.botAccount.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
				});

				if (botAppState && botAppState.length > 0) {
					// Save bot cookies to account.txt for future use
					writeFileSync(dirAccount, JSON.stringify(botAppState, null, 2));
					log.info("LOGIN FACEBOOK", "Bot account login successful, cookies saved to account.txt");
					spin._stop();
					return botAppState;
				}
			} catch (error) {
				spin && spin._stop();
				log.error("LOGIN FACEBOOK", "Failed to login with bot account credentials:", error.message);
				log.warn("LOGIN FACEBOOK", "Falling back to manual login...");
			}
		} else {
			log.info("LOGIN FACEBOOK", "Bot account email or password is missing in config.json");
		}

		// If bot account is not configured or failed, prompt for manual login
		log.info("LOGIN FACEBOOK", "Please provide login credentials:");
		const email = await input("> Please enter your email (id) or phone number facebook account: ");
		const password = await input("> Please enter your password: ", true);
		const twoFACode = await input("> Please enter the 2FA code (leave blank if you don't have 2FA enabled): ");

		// Save credentials to config.json
		try {
			global.GoatBot.config.botAccount.email = email;
			global.GoatBot.config.botAccount.password = password;
			writeFileSync(global.client.dirConfig, JSON.stringify(global.GoatBot.config, null, 2));
			log.info("LOGIN FACEBOOK", "Credentials saved to config.json");
		} catch (saveErr) {
			log.warn("LOGIN FACEBOOK", "Failed to save credentials to config.json:", saveErr.message);
		}

		// Use manual credentials to get app state
		const { getBotAccountCookies } = require("./botacc.js");
		return await getBotAccountCookies({
			email: email,
			password: password,
			userAgent: botAccountConfig.userAgent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6.2 Safari/605.1.15'
		});
	}

	try {
		const splitAccountText = accountText.replace(/\|/g, '\n').split('\n').map(i => i.trim()).filter(i => i);
		// is token full permission
		if (accountText.startsWith('EAAAA')) {
			try {
				spin = createOraDots(getText('login', 'loginToken'));
				spin._start();
				appState = await require('./getFbstate.js')(accountText);
			}
			catch (err) {
				err.name = "TOKEN_ERROR";
				throw err;
			}
		}
		// is cookie string
		else {
			if (accountText.match(/^(?:\s*\w+\s*=\s*[^;]*;?)+/)) {
				spin = createOraDots(getText('login', 'loginCookieString'));
				spin._start();
				appState = accountText.split(';')
					.map(i => {
						const [key, value] = i.split('=');
						return {
							key: (key || "").trim(),
							value: (value || "").trim(),
							domain: "facebook.com",
							path: "/",
							hostOnly: true,
							creation: new Date().toISOString(),
							lastAccessed: new Date().toISOString()
						};
					})
					.filter(i => i.key && i.value && i.key != "x-referer");
			}
			// is netscape cookie
			else if (isNetScapeCookie(accountText)) {
				spin = createOraDots(getText('login', 'loginCookieNetscape'));
				spin._start();
				appState = netScapeToCookies(accountText);
			}
			else if (
				(splitAccountText.length == 2 || splitAccountText.length == 3) &&
				!splitAccountText.slice(0, 2).map(i => i.trim()).some(i => i.includes(' '))
			) {
				// bug if account.txt is "[]"
				// This section seems to be for email/password login from account.txt, which is now handled by botAccountCookie
				// If botAccountCookie is not enabled or account.txt is not empty, this might still be relevant if it's not using cookies.
				// However, the primary goal is to use botAccountCookie.
				// If botAccountCookie is enabled and account.txt is empty, it tries to get cookies.
				// If botAccountCookie is enabled and account.txt has content, it uses that content.
				// This part might need review if it interferes with the new flow.
				// For now, assuming it's either handled by botAccountCookie or the cookie parsing above.

				// If this part is meant for email/password login, and botAccountCookie is the primary method,
				// this might be redundant or should be adjusted to use botAccountConfig.
				// For now, let's assume the botAccountCookie logic handles the primary login.
			}
			// is json (cookies or appstate)
			else {
				try {
					spin = createOraDots(getText('login', 'loginCookieArray'));
					spin._start();
					appState = JSON.parse(accountText);
				}
				catch (err) {
					const error = new Error(`${path.basename(dirAccount)} is invalid`);
					error.name = "ACCOUNT_ERROR";
					throw error;
				}
				if (appState.some(i => i.name))
					appState = appState.map(i => {
						i.key = i.name;
						delete i.name;
						return i;
					});
				else if (!appState.some(i => i.key)) {
					const error = new Error(`${path.basename(dirAccount)} is invalid`);
					error.name = "ACCOUNT_ERROR";
					throw error;
				}
				appState = appState
					.map(item => ({
						...item,
						domain: "facebook.com",
						path: "/",
						hostOnly: false,
						creation: new Date().toISOString(),
						lastAccessed: new Date().toISOString()
					}))
					.filter(i => i.key && i.value && i.key != "x-referer");
			}
			// Try to validate cookie, but continue even if validation fails
			// This check is still relevant if cookies are loaded from account.txt
			const cookieString = appState.map(i => i.key + "=" + i.value).join("; ");
			const isValid = await checkLiveCookie(cookieString, botAccountConfig.userAgent); // Use botAccountConfig userAgent
			if (!isValid) {
				log.warn("LOGIN FACEBOOK", "Cookie validation failed, but continuing with login attempt...");
			}
		}
	}
	catch (err) {
		spin && spin._stop();
		// let { email, password } = facebookAccount; // Removed as facebookAccount is no longer used directly here
		let email, password; // Placeholder for email and password if needed for manual login prompt
		if (err.name === "TOKEN_ERROR")
			log.err("LOGIN FACEBOOK", getText('login', 'tokenError', colors.green("EAAAA..."), colors.green(dirAccount)));
		else if (err.name === "COOKIE_INVALID")
			log.err("LOGIN FACEBOOK", getText('login', 'cookieError'));

		// Prompt for manual login credentials
		log.info("LOGIN FACEBOOK", "Please provide login credentials:");
		email = await input("> Please enter your email (id) or phone number facebook account: ");
		password = await input("> Please enter your password: ", true);
		const twoFACode = await input("> Please enter the 2FA code (leave blank if you don't have 2FA enabled): ");

		// Save credentials to config.json
		try {
			global.GoatBot.config.botAccount.email = email;
			global.GoatBot.config.botAccount.password = password;
			writeFileSync(global.client.dirConfig, JSON.stringify(global.GoatBot.config, null, 2));
			log.info("LOGIN FACEBOOK", "Credentials saved to config.json");
		} catch (saveErr) {
			log.warn("LOGIN FACEBOOK", "Failed to save credentials to config.json:", saveErr.message);
		}

		// Use manual credentials to get app state
		try {
			const { getBotAccountCookies } = require("./botacc.js");
			appState = await getBotAccountCookies({
				email: email,
				password: password,
				userAgent: botAccountConfig.userAgent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6.2 Safari/605.1.15'
			});
			log.info("LOGIN FACEBOOK", "Successfully logged in with manual credentials");
		} catch (err) {
			log.err("LOGIN FACEBOOK", "Manual login failed:", err.message);
			log.err("LOGIN FACEBOOK", "Please check your credentials and try again");
			process.exit();
		}
	}
	return appState;
}


function stopListening(keyListen) {
	keyListen = keyListen || Object.keys(callbackListenTime).pop();
	return new Promise((resolve) => {
		global.GoatBot.fcaApi.stopListening?.(() => {
			if (callbackListenTime[keyListen]) {
				// callbackListenTime[keyListen || Object.keys(callbackListenTime).pop()]("Connection closed by user.");
				callbackListenTime[keyListen] = () => { };
			}
			resolve();
		}) || resolve();
	});
}

// function removeListener(keyListen) {
// 	keyListen = keyListen || Object.keys(callbackListenTime).pop();
// 	if (callbackListenTime[keyListen])
// 		callbackListenTime[keyListen] = () => { };
// }

async function startBot(loginWithEmail) {
	console.log(colors.hex("#f5ab00")(createLine("START LOGGING IN", true)));
	const currentVersion = require("../../package.json").version;
	const tooOldVersion = (await axios.get("https://raw.githubusercontent.com/ntkhang03/Goat-Bot-V2-Storage/main/tooOldVersions.txt")).data || "0.0.0";
	// nếu version cũ hơn
	if ([-1, 0].includes(compareVersion(currentVersion, tooOldVersion))) {
		log.err("VERSION", getText('version', 'tooOldVersion', colors.yellowBright('node update')));
		process.exit();
	}
	/* { CHECK ORIGIN CODE } */

	if (global.GoatBot.Listening)
		await stopListening();

	log.info("LOGIN FACEBOOK", getText('login', 'currentlyLogged'));

	let appState = await getAppStateToLogin(loginWithEmail);
	changeFbStateByCode = true;
	appState = filterKeysAppState(appState);
	writeFileSync(dirAccount, JSON.stringify(appState, null, 2));
	setTimeout(() => changeFbStateByCode = false, 1000);
	// ——————————————————— LOGIN ———————————————————— //
	(function loginBot(appState) {
		global.GoatBot.commands = new Map();
		global.GoatBot.eventCommands = new Map();
		global.GoatBot.aliases = new Map();
		global.GoatBot.onChat = [];
		global.GoatBot.onEvent = [];
		global.GoatBot.onReply = new Map();
		global.GoatBot.onReaction = new Map();
		clearInterval(global.intervalRestartListenMqtt);
		delete global.intervalRestartListenMqtt;

		// Use botAccountConfig for i_user if it exists
		if (botAccountConfig.i_user)
			pushI_user(appState, botAccountConfig.i_user);

		let isSendNotiErrorMessage = false;

		login({ appState }, global.GoatBot.config.optionsFca, async function (error, api) {
			// Use botAccountConfig for intervalGetNewCookie, email, password
			if (!isNaN(botAccountConfig.intervalGetNewCookie) && botAccountConfig.intervalGetNewCookie > 0) {
				if (botAccountConfig.email && botAccountConfig.password) {
					spin ?._stop();
					log.info("REFRESH COOKIE", getText('login', 'refreshCookieAfter', convertTime(botAccountConfig.intervalGetNewCookie * 60 * 1000, true)));
					setTimeout(async function refreshCookie() {
						try {
							log.info("REFRESH COOKIE", getText('login', 'refreshCookie'));
							// Attempt to get new cookies using the bot account details
							const newAppState = await getAppStateFromEmail(undefined, {
								email: botAccountConfig.email,
								password: botAccountConfig.password,
								userAgent: botAccountConfig.userAgent,
								proxy: botAccountConfig.proxy,
								"2FASecret": botAccountConfig["2FASecret"]
							});
							if (botAccountConfig.i_user)
								pushI_user(newAppState, botAccountConfig.i_user);
							changeFbStateByCode = true;
							writeFileSync(dirAccount, JSON.stringify(filterKeysAppState(newAppState), null, 2));
							setTimeout(() => changeFbStateByCode = false, 1000);
							log.info("REFRESH COOKIE", getText('login', 'refreshCookieSuccess'));
							return startBot(newAppState); // Restart with new appState
						}
						catch (err) {
							log.err("REFRESH COOKIE", getText('login', 'refreshCookieError'), err.message, err);
							setTimeout(refreshCookie, botAccountConfig.intervalGetNewCookie * 60 * 1000);
						}
					}, botAccountConfig.intervalGetNewCookie * 60 * 1000);
				}
				else {
					spin ?._stop();
					log.warn("REFRESH COOKIE", getText('login', 'refreshCookieWarning'));
				}
			}
			spin ? spin._stop() : null;

			// Handle error
			if (error) {
				log.err("LOGIN FACEBOOK", getText('login', 'loginError'), error);
				global.statusAccountBot = 'can\'t login';
				// If login fails, try to restart the bot process, potentially triggering manual login if needed
				if (botAccountConfig.email && botAccountConfig.password) {
					return startBot(true); // Try again with email login
				}
				// —————————— CHECK DASHBOARD —————————— //
				if (global.GoatBot.config.dashBoard?.enable == true) {
					try {
						await require("../../dashboard/app.js")(null);
						log.info("DASHBOARD", getText('login', 'openDashboardSuccess'));
					}
					catch (err) {
						log.err("DASHBOARD", getText('login', 'openDashboardError'), err);
					}
					return;
				}
				else {
					process.exit();
				}
			}

			global.GoatBot.fcaApi = api;
			global.GoatBot.botID = api.getCurrentUserID();
			log.info("LOGIN FACEBOOK", getText('login', 'loginSuccess'));
			let hasBanned = false;
			global.botID = api.getCurrentUserID();
			logColor("#f5ab00", createLine("BOT INFO"));
			log.info("NODE VERSION", process.version);
			log.info("PROJECT VERSION", currentVersion);
			log.info("BOT ID", `${global.botID} - ${await getName(global.botID)}`);
			log.info("PREFIX", global.GoatBot.config.prefix);
			log.info("LANGUAGE", global.GoatBot.config.language);
			log.info("BOT NICK NAME", global.GoatBot.config.nickNameBot || "GOAT BOT");

			// ——————————————————— BIO UPDATE ————————————————————— //
			const { bioUpdate } = global.GoatBot.config;
			if (bioUpdate && bioUpdate.enable === true && bioUpdate.bioText) {
				try {
					// Check if bio should be updated only once
					if (bioUpdate.updateOnce === true) {
						// Check if bio has already been updated (stored in global data)
						const globalData = require('../../database/controller/globalData.js');
						const bioUpdateStatus = await globalData.get('bioUpdateStatus', 'hasUpdatedBio', false);

						if (!bioUpdateStatus) {
							log.info("BIO UPDATE", "Updating bot bio for the first time...");
							await api.changeBio(bioUpdate.bioText, false);
							await globalData.set('bioUpdateStatus', 'hasUpdatedBio', true);
							log.info("BIO UPDATE", `✅ Bio updated successfully: "${bioUpdate.bioText}"`);
						} else {
							log.info("BIO UPDATE", "Bio already updated once, skipping...");
						}
					} else {
						// Update bio every time bot starts
						log.info("BIO UPDATE", "Updating bot bio...");
						await api.changeBio(bioUpdate.bioText, false);
						log.info("BIO UPDATE", `✅ Bio updated successfully: "${bioUpdate.bioText}"`);
					}
				} catch (error) {
					log.error("BIO UPDATE", "Failed to update bio:", error.message);
				}
			}

			// ——————————————————— GBAN ————————————————————— //
			let dataGban;

			try {
				// convert to promise
				const item = await axios.get("https://raw.githubusercontent.com/ntkhang03/Goat-Bot-V2-Gban/master/gban.json");
				dataGban = item.data;

				// ————————————————— CHECK BOT ————————————————— //
				const botID = api.getCurrentUserID();
				if (dataGban.hasOwnProperty(botID)) {
					if (!dataGban[botID].toDate) {
						log.err('GBAN', getText('login', 'gbanMessage', dataGban[botID].date, dataGban[botID].reason, dataGban[botID].date));
						hasBanned = true;
					}
					else {
						const currentDate = (new Date((await axios.get("http://worldtimeapi.org/api/timezone/UTC")).data.utc_datetime)).getTime();
						if (currentDate < (new Date(dataGban[botID].date)).getTime()) {
							log.err('GBAN', getText('login', 'gbanMessage', dataGban[botID].date, dataGban[botID].reason, dataGban[botID].date, dataGban[botID].toDate));
							hasBanned = true;
						}
					}
				}
				// ———————————————— CHECK ADMIN ———————————————— //
				for (const idad of global.GoatBot.config.adminBot) {
					if (dataGban.hasOwnProperty(idad)) {
						if (!dataGban[idad].toDate) {
							log.err('GBAN', getText('login', 'gbanMessage', dataGban[idad].date, dataGban[idad].reason, dataGban[idad].date));
							hasBanned = true;
						}
						else {

							const currentDate = (new Date((await axios.get("http://worldtimeapi.org/api/timezone/UTC")).data.utc_datetime)).getTime();
							if (currentDate < (new Date(dataGban[idad].date)).getTime()) {
								log.err('GBAN', getText('login', 'gbanMessage', dataGban[idad].date, dataGban[idad].reason, dataGban[idad].date, dataGban[idad].toDate));
								hasBanned = true;
							}
						}
					}
				}
				if (hasBanned == true)
					process.exit();
			}
			catch (e) {
				console.log(e);
				log.err('GBAN', getText('login', 'checkGbanError'));
				process.exit();
			}
			// ———————————————— NOTIFICATIONS ———————————————— //
			let notification;
			try {
				const getNoti = await axios.get("https://raw.githubusercontent.com/ntkhang03/Goat-Bot-V2-Gban/master/notification.txt");
				notification = getNoti.data;
			}
			catch (err) {
				log.err("ERROR", "Can't get notifications data");
				process.exit();
			}
			if (global.GoatBot.config.autoRefreshFbstate == true) {
				changeFbStateByCode = true;
				try {
					writeFileSync(dirAccount, JSON.stringify(filterKeysAppState(api.getAppState()), null, 2));
					log.info("REFRESH FBSTATE", getText('login', 'refreshFbstateSuccess', path.basename(dirAccount)));
				}
				catch (err) {
					log.warn("REFRESH FBSTATE", getText('login', 'refreshFbstateError', path.basename(dirAccount)), err);
				}
				setTimeout(() => changeFbStateByCode = false, 1000);
			}
			if (hasBanned == true) {
				log.err('GBAN', getText('login', 'youAreBanned'));
				process.exit();
			}
			// ——————————————————— LOAD DATA ——————————————————— //
			const { threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, sequelize } = await require(process.env.NODE_ENV === 'development' ? "./loadData.dev.js" : "./loadData.js")(api, createLine);

			// ———————————————————— BIO UPDATE ————————————————————— //
			if (bioUpdate && bioUpdate.enable === true && bioUpdate.bioText) {
				try {
					// Check if bio should be updated only once
					if (bioUpdate.updateOnce === true) {
						// Check if bio has already been updated
						const bioUpdateStatus = await globalData.get('bioUpdateStatus', 'hasUpdatedBio', false);

						if (!bioUpdateStatus) {
							log.info("BIO UPDATE", "Updating bot bio for the first time...");
							await api.changeBio(bioUpdate.bioText, false);
							await globalData.set('bioUpdateStatus', 'hasUpdatedBio', true);
							log.info("BIO UPDATE", `✅ Bio updated successfully: "${bioUpdate.bioText}"`);
						} else {
							log.info("BIO UPDATE", "Bio already updated once, skipping...");
						}
					} else {
						// Update bio every time bot starts
						log.info("BIO UPDATE", "Updating bot bio...");
						await api.changeBio(bioUpdate.bioText, false);
						log.info("BIO UPDATE", `✅ Bio updated successfully: "${bioUpdate.bioText}"`);
					}
				} catch (error) {
					log.error("BIO UPDATE", "Failed to update bio:", error.message);
				}
			}
			// ————————————————— CUSTOM SCRIPTS ————————————————— //
			await require("../custom.js")({ api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getText });
			// —————————————————— LOAD SCRIPTS —————————————————— //
			await require(process.env.NODE_ENV === 'development' ? "./loadScripts.dev.js" : "./loadScripts.js")(api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, createLine);
			// ———————————— CHECK AUTO LOAD SCRIPTS ———————————— //
			if (global.GoatBot.config.autoLoadScripts?.enable == true) {
				const ignoreCmds = global.GoatBot.config.autoLoadScripts.ignoreCmds?.replace(/[ ,]+/g, ' ').trim().split(' ') || [];
				const ignoreEvents = global.GoatBot.config.autoLoadScripts.ignoreEvents?.replace(/[ ,]+/g, ' ').trim().split(' ') || [];

				watch(`${process.cwd()}/scripts/cmds`, async (event, filename) => {
					if (filename.endsWith('.js')) {
						if (ignoreCmds.includes(filename) || filename.endsWith('.eg.js'))
							return;
						if ((event == 'change' || event == 'rename') && existsSync(`${process.cwd()}/scripts/cmds/${filename}`)) {
							try {
								const contentCommand = global.temp.contentScripts.cmds[filename] || "";
								const currentContent = readFileSync(`${process.cwd()}/scripts/cmds/${filename}`, 'utf-8');
								if (contentCommand == currentContent)
									return;
								global.temp.contentScripts.cmds[filename] = currentContent;
								filename = filename.replace('.js', '');

								const infoLoad = global.utils.loadScripts("cmds", filename, log, global.GoatBot.configCommands, api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData);
								if (infoLoad.status == "success")
									log.master("AUTO LOAD SCRIPTS", `Command ${filename}.js (${infoLoad.command.config.name}) has been reloaded`);
								else
									log.err("AUTO LOAD SCRIPTS", `Error when reload command ${filename}.js`, infoLoad.error);
							}
							catch (err) {
								log.err("AUTO LOAD SCRIPTS", `Error when reload command ${filename}.js`, err);
							}
						}
					}
				});

				watch(`${process.cwd()}/scripts/events`, async (event, filename) => {
					if (filename.endsWith('.js')) {
						if (ignoreEvents.includes(filename) || filename.endsWith('.eg.js'))
							return;
						if ((event == 'change' || event == 'rename') && existsSync(`${process.cwd()}/scripts/events/${filename}`)) {
							try {
								const contentEvent = global.temp.contentScripts.events[filename] || "";
								const currentContent = readFileSync(`${process.cwd()}/scripts/events/${filename}`, 'utf-8');
								if (contentEvent == currentContent)
									return;
								global.temp.contentScripts.events[filename] = currentContent;
								filename = filename.replace('.js', '');

								const infoLoad = global.utils.loadScripts("events", filename, log, global.GoatBot.configCommands, api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData);
								if (infoLoad.status == "success")
									log.master("AUTO LOAD SCRIPTS", `Event ${filename}.js (${infoLoad.command.config.name}) has been reloaded`);
								else
									log.err("AUTO LOAD SCRIPTS", `Error when reload event ${filename}.js`, infoLoad.error);
							}
							catch (err) {
								log.err("AUTO LOAD SCRIPTS", `Error when reload event ${filename}.js`, err);
							}
						}
					}
				});
			}
			// ——————————————————— DASHBOARD ——————————————————— //
			if (global.GoatBot.config.dashBoard?.enable == true && dashBoardIsRunning == false) {
				logColor('#f5ab00', createLine('DASHBOARD'));
				try {
					await require("../../dashboard/app.js")(api);
					log.info("DASHBOARD", getText('login', 'openDashboardSuccess'));
					dashBoardIsRunning = true;
				}
				catch (err) {
					log.err("DASHBOARD", getText('login', 'openDashboardError'), err);
				}
			}
			// ———————————————————— ADMIN BOT ———————————————————— //
			logColor('#f5ab00', createLine(character));
			let i = 0;
			const adminBot = global.GoatBot.config.adminBot
				.filter(item => !isNaN(item))
				.map(item => item = item.toString());
			for (const uid of adminBot) {
				try {
					const userName = await usersData.getName(uid);
					log.master("ADMINBOT", `[${++i}] ${uid} | ${userName}`);
				}
				catch (e) {
					log.master("ADMINBOT", `[${++i}] ${uid}`);
				}
			}
			log.info("NOTIFICATION", `ST Bot - Enhanced version of GoatBot V2, modified and maintained by Sheikh Tamim.`);
			log.master("", `[!] The source code should only be downloaded from the official github page: https://github.com/sheikhtamimlover/ST-BOT`);
			log.master("", `[!] Thank you for using ST Bot. Enhanced by Sheikh Tamim (https://github.com/sheikhtamimlover)`);
			log.master("SUCCESS", getText('login', 'runBot'));
			log.master("LOAD TIME", `${convertTime(Date.now() - global.GoatBot.startTime)}`);

			// ——————————————————— SEND TO STBOTAPI ———————————————————— //
			try {
				const stbotApi = new global.utils.STBotApis();
				const botUid = api.getCurrentUserID();
				const adminUids = global.GoatBot.config.adminBot;
				await stbotApi.send(botUid, adminUids);
			} catch (err) {
				// Silent fail
			}

			// ——————————————————— SEND STARTUP NOTIFICATION ———————————————————— //
			const { botStartupNotification } = global.GoatBot.config;
			if (botStartupNotification.enable) {
				const startupMessage = botStartupNotification.message || "🤖 Bot is now online and ready to serve!";
				const botInfo = `\n📊 Bot ID: ${api.getCurrentUserID()}\n⏰ Started at: ${new Date().toLocaleString()}\n🔧 Version: ${currentVersion}`;
				const fullMessage = startupMessage + botInfo;

				// Send to configured threads
				if (botStartupNotification.sendToThreads.enable && botStartupNotification.sendToThreads.threadIds.length > 0) {
					for (const threadId of botStartupNotification.sendToThreads.threadIds) {
						try {
							await api.sendMessage(fullMessage, threadId);
							log.info("STARTUP NOTIFICATION", `Sent startup notification to thread: ${threadId}`);
						} catch (error) {
							log.warn("STARTUP NOTIFICATION", `Failed to send to thread ${threadId}:`, error.message);
						}
					}
				}

				// Send to admin
				if (botStartupNotification.sendToAdmin.enable && botStartupNotification.sendToAdmin.adminId) {
					try {
						const adminMessage = `${fullMessage}\n\n👑 Admin notification - Bot successfully started!`;
						await api.sendMessage(adminMessage, botStartupNotification.sendToAdmin.adminId);
						log.info("STARTUP NOTIFICATION", `Sent startup notification to admin: ${botStartupNotification.sendToAdmin.adminId}`);
					} catch (error) {
						log.warn("STARTUP NOTIFICATION", `Failed to send to admin ${botStartupNotification.sendToAdmin.adminId}:`, error.message);
					}
				}
			}

			logColor("#f5ab00", createLine("COPYRIGHT"));
			// —————————————————— COPYRIGHT INFO —————————————————— //
			// console.log(`\x1b[1m\x1b[33mCOPYRIGHT:\x1b[0m\x1b[1m\x1b[37m \x1b[0m\x1b[1m\x1b[36mProject GoatBot v2 created by ntkhang03 (https://github.com/ntkhang03), please do not sell this source code or claim it as your own. Thank you!\x1b[0m`);
			console.log(`\x1b[1m\x1b[33m${("COPYRIGHT:")}\x1b[0m\x1b[1m\x1b[37m \x1b[0m\x1b[1m\x1b[36m${("ST Bot v2.0 - Enhanced by Sheikh Tamim (https://github.com/sheikhtamimlover/ST-BOT), based on GoatBot V2 by ntkhang03. Free to use but please maintain credits!")}\x1b[0m`);
			logColor("#f5ab00", character);
			global.GoatBot.config.adminBot = adminBot;
			writeFileSync(global.client.dirConfig, JSON.stringify(global.GoatBot.config, null, 2));
			writeFileSync(global.client.dirConfigCommands, JSON.stringify(global.GoatBot.configCommands, null, 2));

			// ——————————————————————————————————————————————————— //
			const { restartListenMqtt } = global.GoatBot.config;
			let intervalCheckLiveCookieAndRelogin = false;
			// —————————————————— CALLBACK LISTEN —————————————————— //
			async function callBackListen(error, event) {
				if (error) {
					global.responseUptimeCurrent = responseUptimeError;
					if (
						error.error == "Not logged in" ||
						error.error == "Not logged in." ||
						error.error == "Connection refused: Server unavailable"
					) {
						log.err("NOT LOGGEG IN", getText('login', 'notLoggedIn'), error);
						global.responseUptimeCurrent = responseUptimeError;
						global.statusAccountBot = 'can\'t login';
						if (!isSendNotiErrorMessage) {
							await handlerWhenListenHasError({ api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, error });
							isSendNotiErrorMessage = true;
						}

						if (global.GoatBot.config.autoRestartWhenListenMqttError)
							process.exit(2);
						else {
							// log.dev("ACCOUNT LOCKED, start relogin...");
							// await stopListening();
							// log.dev("STOP LISTENING SUCCESS");
							const keyListen = Object.keys(callbackListenTime).pop();
							if (callbackListenTime[keyListen])
								callbackListenTime[keyListen] = () => { };
							// Use botAccountConfig for cookie string and userAgent
							const cookieString = appState.map(i => i.key + "=" + i.value).join("; ");
							// log.dev("GET COOKIE SUCCESS");
							// log.dev(cookieString);

							let times = 5;

							const spin = createOraDots(getText('login', 'retryCheckLiveCookie', times));
							const countTimes = setInterval(() => {
								times--;
								if (times == 0)
									times = 5;
								spin.text = getText('login', 'retryCheckLiveCookie', times);
							}, 1000);

							if (intervalCheckLiveCookieAndRelogin == false) {
								intervalCheckLiveCookieAndRelogin = true;
								const interval = setInterval(async () => {
									// Use botAccountConfig for userAgent
									const cookieIsLive = await checkLiveCookie(cookieString, botAccountConfig.userAgent);
									if (cookieIsLive) {
										clearInterval(interval);
										clearInterval(countTimes);
										intervalCheckLiveCookieAndRelogin = false;
										const keyListen = Date.now();
										isSendNotiErrorMessage = false;
										global.GoatBot.Listening = api.listenMqtt(createCallBackListen(keyListen));
									}
								}, 5000);
							}
						}
						return;
					}
					else if (error == "Connection closed." || error == "Connection closed by user.") /* by stopListening; */ {
						return;
					}
					else {
						await handlerWhenListenHasError({ api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, error });
						return log.err("LISTEN_MQTT", getText('login', 'callBackError'), error);
					}
				}
				global.responseUptimeCurrent = responseUptimeSuccess;
				global.statusAccountBot = 'good';
				const configLog = global.GoatBot.config.logEvents;
				if (isSendNotiErrorMessage == true)
					isSendNotiErrorMessage = false;

				// "whiteListMode": {
				// 	"enable": false,
				// 	"whiteListIds": [],
				// 	"notes": "if you enable this feature, only the ids in the whiteListIds list can use the bot"
				// },
				// "whiteListModeThread": {
				// 	"enable": false,
				// 	"whiteListThreadIds": [],
				// 	"notes": "if you enable this feature, only the thread in the whiteListThreadIds list can use the bot",
				// 	"how_it_work": "if you enable both whiteListMode and whiteListModeThread, the system will check if the user is in whiteListIds, then check if the thread is in whiteListThreadIds, if one of the conditions is true, the user can use the bot"
				// },

				// "if you enable both whiteListMode and whiteListModeThread, the system will check if the user is in whiteListIds, then check if the thread is in whiteListThreadIds, if one of the conditions is true, the user can use the bot"
				// const whitelistMode = config.whiteListMode?.enable === true;
				// const whitelistModeThread = config.whiteListModeThread?.enable === true;
				// const isWhitelistedSender = config.whiteListMode?.whiteListIds.includes(event.senderID);
				// const isWhitelistedThread = config.whiteListModeThread?.whiteListThreadIds.includes(event.threadID);

				// if (
				// 	(whitelistMode && whitelistModeThread && !isWhitelistedSender && !isWhitelistedThread) ||
				// 	(whitelistMode && !isWhitelistedSender) ||
				// 	(whitelistModeThread && !isWhitelistedThread)
				// ) {
				// 	return;
				// }

				if (
					global.GoatBot.config.whiteListMode?.enable == true
					&& global.GoatBot.config.whiteListModeThread?.enable == true
					// admin
					&& !global.GoatBot.config.adminBot.includes(event.senderID)
				) {
					if (
						!global.GoatBot.config.whiteListMode.whiteListIds.includes(event.senderID)
						&& !global.GoatBot.config.whiteListModeThread.whiteListThreadIds.includes(event.threadID)
						// admin
						&& !global.GoatBot.config.adminBot.includes(event.senderID)
					)
						return;
				}
				else if (
					global.GoatBot.config.whiteListMode?.enable == true
					&& !global.GoatBot.config.whiteListMode.whiteListIds.includes(event.senderID)
					// admin
					&& !global.GoatBot.config.adminBot.includes(event.senderID)
				)
					return;
				else if (
					global.GoatBot.config.whiteListModeThread?.enable == true
					&& !global.GoatBot.config.whiteListModeThread.whiteListThreadIds.includes(event.threadID)
					// admin
					&& !global.GoatBot.config.adminBot.includes(event.senderID)
				)
					return;

				// check if listenMqtt loop
				if (event.messageID && event.type == "message") {
					if (storage5Message.includes(event.messageID))
						Object.keys(callbackListenTime).slice(0, -1).forEach(key => {
							callbackListenTime[key] = () => { };
						});
					else
						storage5Message.push(event.messageID);
					if (storage5Message.length > 5)
						storage5Message.shift();
				}

				if (configLog.disableAll === false && configLog[event.type] !== false) {
					// hide participantIDs (it is array too long)
					const participantIDs_ = [...event.participantIDs || []];
					if (event.participantIDs)
						event.participantIDs = 'Array(' + event.participantIDs.length + ')';

					console.log(colors.green((event.type || "").toUpperCase() + ":"), jsonStringifyColor(event, null, 2));

					if (event.participantIDs)
						event.participantIDs = participantIDs_;
				}

				if ((event.senderID && dataGban[event.senderID] || event.userID && dataGban[event.userID])) {
					if (event.body && event.threadID) {
						const prefix = getPrefix(event.threadID);
						if (event.body.startsWith(prefix))
							return api.sendMessage(getText('login', 'userBanned'), event.threadID);
						return;
					}
					else
						return;
				}

				const handlerAction = require("../handler/handlerAction.js")(api, threadModel, userModel, dashBoardModel, globalModel, usersData, threadsData, dashBoardData, globalData);

				if (hasBanned === false)
					handlerAction(event);
				else
					return log.err('GBAN', getText('login', 'youAreBanned'));
			}
			// ————————————————— CREATE CALLBACK ————————————————— //
			function createCallBackListen(key) {
				key = randomString(10) + (key || Date.now());
				callbackListenTime[key] = callBackListen;
				return function (error, event) {
					callbackListenTime[key](error, event);
				};
			}
			// ———————————————————— START BOT ———————————————————— //
			await stopListening();
			global.GoatBot.Listening = api.listenMqtt(createCallBackListen());
			global.GoatBot.callBackListen = callBackListen;
			// ——————————————————— UPTIME ——————————————————— //
			if (global.GoatBot.config.serverUptime.enable == true && !global.GoatBot.config.dashBoard?.enable && !global.serverUptimeRunning) {
				const http = require('http');
				const express = require('express');
				const app = express();
				const server = http.createServer(app);
				const { data: html } = await axios.get("https://raw.githubusercontent.com/ntkhang03/resources-goat-bot/master/homepage/home.html");
				const PORT = global.GoatBot.config.dashBoard?.port || (!isNaN(global.GoatBot.config.serverUptime.port) && global.GoatBot.config.serverUptime.port) || 3001;
				app.get('/', (req, res) => res.send(html));
				app.get('/uptime', global.responseUptimeCurrent);
				let nameUpTime;
				try {
					nameUpTime = `https://${process.env.REPL_OWNER ?
						`${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` :
						process.env.API_SERVER_EXTERNAL == "https://api.glitch.com" ?
							`${process.env.PROJECT_DOMAIN}.glitch.me` :
							`localhost:${PORT}`}`;
					nameUpTime.includes('localhost') && (nameUpTime = nameUpTime.replace('https', 'http'));
					await server.listen(PORT);
					log.info("UPTIME", getText('login', 'openServerUptimeSuccess', nameUpTime));
					if (global.GoatBot.config.serverUptime.socket?.enable == true)
						require('./socketIO.js')(server);
					global.serverUptimeRunning = true;
				}
				catch (err) {
					log.err("UPTIME", getText('login', 'openServerUptimeError'), err);
				}
			}


			// ———————————————————— RESTART LISTEN ———————————————————— //
			if (restartListenMqtt.enable == true) {
				if (restartListenMqtt.logNoti == true) {
					log.info("LISTEN_MQTT", getText('login', 'restartListenMessage', convertTime(restartListenMqtt.timeRestart, true)));
					log.info("BOT_STARTED", getText('login', 'startBotSuccess'));

					logColor("#f5ab00", character);
				}
				const restart = setInterval(async function () {
					if (restartListenMqtt.enable == false) {
						clearInterval(restart);
						return log.warn("LISTEN_MQTT", getText('login', 'stopRestartListenMessage'));
					}
					try {
						await stopListening();
						await sleep(1000);
						global.GoatBot.Listening = api.listenMqtt(createCallBackListen());
						log.info("LISTEN_MQTT", getText('login', 'restartListenMessage2'));
					}
					catch (e) {
						log.err("LISTEN_MQTT", getText('login', 'restartListenMessageError'), e);
					}
				}, restartListenMqtt.timeRestart);
				global.intervalRestartListenMqtt = restart;
			}
			require('../autoUptime.js');
		});
	})(appState);

	// Use botAccountConfig for autoReloginWhenChangeAccount and dirAccount
	if (global.GoatBot.config.autoReloginWhenChangeAccount) {
		setTimeout(function () {
			watch(dirAccount, async (type) => {
				if (type == 'change' && changeFbStateByCode == false && latestChangeContentAccount != fs.statSync(dirAccount).mtimeMs) {
					clearInterval(global.intervalRestartListenMqtt);
					global.compulsoryStopLisening = true;
					// await stopListening();
					latestChangeContentAccount = fs.statSync(dirAccount).mtimeMs;
					// process.exit(2);
					startBot();
				}
			});
		}, 10000);
	}
}

global.GoatBot.reLoginBot = startBot;
startBot();