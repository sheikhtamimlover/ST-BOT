const defaultRequire = require;

function decode(text) {
  text = Buffer.from(text, 'hex').toString('utf-8');
  text = Buffer.from(text, 'hex').toString('utf-8');
  text = Buffer.from(text, 'base64').toString('utf-8');
  return text;
}

const axios = defaultRequire("axios");
const path = defaultRequire("path");
const readline = defaultRequire("readline");
const fs = defaultRequire("fs-extra");
const toptp = defaultRequire("totp-generator");

const config = require(`${process.cwd()}/config.json`);
const login = require(`stfca`);
if (!global.GoatBot) global.GoatBot = {};
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

const restartNoticePath = path.join(process.cwd(), "scripts", "cmds", "tmp", "restart.txt");
global.GoatBot.e2eeFullyReady = false;
global.GoatBot.pendingE2eeRestartNotifications = fs.existsSync(restartNoticePath)
  ? (global.GoatBot.pendingE2eeRestartNotifications || [])
  : [];

function readPendingE2eeRestartFile() {
  if (!fs.existsSync(restartNoticePath))
    return null;

  const raw = fs.readFileSync(restartNoticePath, "utf8").trim();
  if (!raw)
    return null;

  try {
    const data = JSON.parse(raw);
    if (data && typeof data.threadID === "string" && data.threadID.includes("@")) {
      return {
        ...data,
        time: Number(data.time) || Date.now(),
        pathFile: restartNoticePath,
        source: "restart-file"
      };
    }
  }
  catch (_) {
    // Support restart files written by older restart.js: "threadID time".
  }

  const [threadID, time] = raw.split(" ");
  if (typeof threadID === "string" && threadID.includes("@")) {
    return {
      threadID,
      time: Number(time) || Date.now(),
      isE2EE: true,
      pathFile: restartNoticePath,
      source: "restart-file"
    };
  }

  return null;
}

async function sendE2eeRestartMessage(api, threadID, text) {
  const bridge = typeof api.getE2EEBridge === "function"
    ? api.getE2EEBridge()
    : api._e2eeBridge;

  if (bridge && typeof bridge.sendMessage === "function")
    return bridge.sendMessage(threadID, text, {});

  throw new Error("E2EE bridge is not ready");
}

global.GoatBot.sendPendingE2eeRestartNotifications = async function sendPendingE2eeRestartNotifications(api) {
  if (global.GoatBot.e2eeRestartNotificationSending)
    return;
  global.GoatBot.e2eeRestartNotificationSending = true;

  try {
    const pending = global.GoatBot.pendingE2eeRestartNotifications || [];
    const fromFile = readPendingE2eeRestartFile();

    if (!fromFile) {
      if (pending.length)
        log.info("E2EE RESTART", "No restart.txt found, clearing stale E2EE restart notification queue");
      global.GoatBot.pendingE2eeRestartNotifications = [];
      return;
    }

    const queue = [fromFile];

    const sentThreads = new Set();
    for (const item of queue) {
      if (!item || !item.threadID || typeof item.threadID !== "string" || !item.threadID.includes("@")) {
        continue;
      }
      if (sentThreads.has(item.threadID))
        continue;
      if (!fs.existsSync(restartNoticePath))
        continue;

      try {
        sentThreads.add(item.threadID);
        const time = Number(item.time) || Date.now();
        await sendE2eeRestartMessage(api, item.threadID, `✅ | Bot restarted\n⏰ | Time: ${(Date.now() - time) / 1000}s`);
        log.info("E2EE RESTART", `Sent restart notification to ${item.threadID}`);
      }
      catch (err) {
        log.warn("E2EE RESTART", `Dropped failed restart notification for ${item.threadID}:`, err && err.message ? err.message : err);
      }
      finally {
        fs.removeSync(restartNoticePath);
      }
    }

    global.GoatBot.pendingE2eeRestartNotifications = [];
  }
  finally {
    global.GoatBot.e2eeRestartNotificationSending = false;
  }
};

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
    // If initial login fails, try using botacc fallback
    try {
      const { getBotAccountCookies } = require("./botacc.js");
      const loginResult = await getBotAccountCookies({
        email: checkAndTrimString(email),
        password: checkAndTrimString(password),
        userAgent: userAgent
      });

      // Extract cookies array from the result
      appState = loginResult.cookies || loginResult;
      spin._stop();
    } catch (fallbackErr) {
      throw new Error(`Login failed: ${err.message}. Fallback login also failed: ${fallbackErr.message}`);
    }
  }

  // Ensure we always return an array
  if (!Array.isArray(appState)) {
    if (appState && appState.cookies && Array.isArray(appState.cookies)) {
      return appState.cookies;
    }
    throw new Error("Invalid appState format: expected array but got " + typeof appState);
  }

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
async function getAppStateToLogin(loginWithEmail, useSecondaryAccount = false) {
  let appState = [];
  const twoIdMode = global.GoatBot.config.twoIdMode;

  // Determine account file path based on which account is being used
  let accountFilePath = dirAccount; // Default to account.txt for primary
  if (twoIdMode && twoIdMode.enable && useSecondaryAccount) {
    accountFilePath = path.normalize(`${__dirname}/../../account.txt2`);
    log.info("TWO ACCOUNT MODE", "Using account.txt2 for secondary account");
  }

  if (loginWithEmail) {
    // Primary account always uses botAccount config
    // Secondary account uses twoIdMode.secondaryAccount
    let accountToUse = botAccountConfig;

    if (twoIdMode && twoIdMode.enable && useSecondaryAccount && twoIdMode.secondaryAccount.email) {
      accountToUse = twoIdMode.secondaryAccount;
      log.info("TWO ACCOUNT MODE", "Fetching cookies for secondary account from credentials");

      spin = createOraDots("Logging in with secondary account credentials...");
      spin._start();

      // Fetch cookies for secondary account
      const secondaryAppState = await getAppStateFromEmail(spin, {
        email: accountToUse.email,
        password: accountToUse.password,
        userAgent: accountToUse.userAgent,
        proxy: accountToUse.proxy,
        "2FASecret": accountToUse.twoFactorCode || accountToUse["2FASecret"]
      });

      spin._stop();

      // Save to account.txt2
      const secondaryAccountPath = path.normalize(`${__dirname}/../../account.txt2`);
      writeFileSync(secondaryAccountPath, JSON.stringify(secondaryAppState, null, 2));
      log.info("TWO ACCOUNT MODE", "Secondary account cookies saved to account.txt2");

      return secondaryAppState;
    } else {
      log.info("TWO ACCOUNT MODE", "Using primary account credentials (botAccount)");

      spin = createOraDots("Logging in with primary account credentials...");
      spin._start();

      const primaryAppState = await getAppStateFromEmail(spin, {
        email: accountToUse.email,
        password: accountToUse.password,
        userAgent: accountToUse.userAgent,
        proxy: accountToUse.proxy,
        "2FASecret": accountToUse.twoFactorCode || accountToUse["2FASecret"]
      });

      spin._stop();
      return primaryAppState;
    }
  }

  // If using secondary account, check account.txt2 first
  if (useSecondaryAccount && twoIdMode && twoIdMode.enable) {
    // Check if account.txt2 exists and has cookies
    if (existsSync(accountFilePath)) {
      const accountText = readFileSync(accountFilePath, "utf8").trim();
      if (accountText) {
        log.info("TWO ACCOUNT MODE", "Found cookies in account.txt2, attempting to use them");
        // Continue to parse cookies below
      } else {
        // account.txt2 is empty, try to fetch from credentials
        log.info("TWO ACCOUNT MODE", "account.txt2 is empty, fetching from credentials");
        if (twoIdMode.secondaryAccount.email && twoIdMode.secondaryAccount.password) {
          spin = createOraDots("Fetching cookies for secondary account...");
          spin._start();

          const secondaryAppState = await getAppStateFromEmail(spin, {
            email: twoIdMode.secondaryAccount.email,
            password: twoIdMode.secondaryAccount.password,
            userAgent: twoIdMode.secondaryAccount.userAgent,
            proxy: twoIdMode.secondaryAccount.proxy,
            "2FASecret": twoIdMode.secondaryAccount.twoFactorCode || twoIdMode.secondaryAccount["2FASecret"]
          });

          spin._stop();

          // Save to account.txt2
          writeFileSync(accountFilePath, JSON.stringify(secondaryAppState, null, 2));
          log.info("TWO ACCOUNT MODE", "Secondary account cookies saved to account.txt2");

          return secondaryAppState;
        } else {
          log.err("TWO ACCOUNT MODE", "Secondary account credentials not configured in config.json");
          throw new Error("Secondary account not configured");
        }
      }
    } else {
      // account.txt2 doesn't exist, create it from credentials
      log.info("TWO ACCOUNT MODE", "account.txt2 not found, creating from credentials");
      if (twoIdMode.secondaryAccount.email && twoIdMode.secondaryAccount.password) {
        spin = createOraDots("Fetching cookies for secondary account...");
        spin._start();

        const secondaryAppState = await getAppStateFromEmail(spin, {
          email: twoIdMode.secondaryAccount.email,
          password: twoIdMode.secondaryAccount.password,
          userAgent: twoIdMode.secondaryAccount.userAgent,
          proxy: twoIdMode.secondaryAccount.proxy,
          "2FASecret": twoIdMode.secondaryAccount.twoFactorCode || twoIdMode.secondaryAccount["2FASecret"]
        });

        spin._stop();

        // Save to account.txt2
        writeFileSync(accountFilePath, JSON.stringify(secondaryAppState, null, 2));
        log.info("TWO ACCOUNT MODE", "Secondary account cookies saved to account.txt2");

        return secondaryAppState;
      } else {
        log.err("TWO ACCOUNT MODE", "Secondary account credentials not configured in config.json");
        throw new Error("Secondary account not configured");
      }
    }
  }
  if (!existsSync(accountFilePath))
    return log.error("LOGIN FACEBOOK", getText('login', 'notFoundDirAccount', colors.green(accountFilePath)));

  const accountText = readFileSync(accountFilePath, "utf8").trim();

  // Check if account.txt is empty (only for primary account)
  if (!accountText && !useSecondaryAccount) {
    log.info("LOGIN FACEBOOK", "account.txt is empty, attempting to use bot account credentials");

    // Try bot account credentials from config if configured
    if (global.GoatBot.config.botAccount?.email &&
      global.GoatBot.config.botAccount?.password) {

      try {
        log.info("LOGIN FACEBOOK", "Bot account email and password found in config.json");
        log.info("LOGIN FACEBOOK", `Using email: ${global.GoatBot.config.botAccount.email}`);

        spin = createOraDots("Logging in with bot account credentials...");
        spin._start();

        const { getBotAccountCookies, handle2FAFlow } = require("./botacc.js");
        let twoFactorCode = global.GoatBot.config.botAccount.twoFactorCode || null;

        const loginResult = await getBotAccountCookies({
          email: global.GoatBot.config.botAccount.email,
          password: global.GoatBot.config.botAccount.password,
          userAgent: global.GoatBot.config.botAccount.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }, twoFactorCode);

        // Handle 2FA if required
        if (loginResult.requires2FA) {
          spin._stop();
          log.warn("LOGIN FACEBOOK", "2FA checkpoint detected");

          // Retry callback for invalid codes
          const retry2FA = async (errorMsg) => {
            spin._stop();
            if (errorMsg) {
              log.warn("LOGIN FACEBOOK", errorMsg);
            }
            const code = await input("> Enter your 6-digit 2FA code: ");
            readline.moveCursor(process.stderr, 0, -1);
            readline.clearScreenDown(process.stderr);
            spin._start();
            return code;
          };

          // If no code in config, prompt for it
          if (!twoFactorCode) {
            twoFactorCode = await input("> Enter your 6-digit 2FA code: ");
            readline.moveCursor(process.stderr, 0, -1);
            readline.clearScreenDown(process.stderr);
          }

          spin._start();
          const result2FA = await handle2FAFlow(loginResult, twoFactorCode, retry2FA);

          if (result2FA.success) {
            // Save the working 2FA code to config
            global.GoatBot.config.botAccount.twoFactorCode = twoFactorCode;
            writeFileSync(global.client.dirConfig, JSON.stringify(global.GoatBot.config, null, 2));
            log.info("LOGIN FACEBOOK", "2FA code saved to config.json");

            const botAppState = result2FA.cookies;
            writeFileSync(dirAccount, JSON.stringify(botAppState, null, 2));
            log.info("LOGIN FACEBOOK", "Bot account login successful with 2FA, cookies saved to account.txt");
            spin._stop();
            return botAppState;
          }
        } else if (loginResult.cookies && loginResult.cookies.length > 0) {
          // Normal login without 2FA
          writeFileSync(dirAccount, JSON.stringify(loginResult.cookies, null, 2));
          log.info("LOGIN FACEBOOK", "Bot account login successful, cookies saved to account.txt");
          spin._stop();
          return loginResult.cookies;
        }
      } catch (error) {
        spin && spin._stop();
        log.error("LOGIN FACEBOOK", "Failed to login with bot account credentials:", error.message);
        log.warn("LOGIN FACEBOOK", "Falling back to manual login...");
      }
    } else {
      log.info("LOGIN FACEBOOK", "Bot account email or password is not configured in config.json");
    }

    // If bot account is not configured or failed, prompt for manual login
    log.info("LOGIN FACEBOOK", "Please provide login credentials:");
    const email = await input("> Please enter your email (id) or phone number facebook account: ");
    const password = await input("> Please enter your password: ", true);

    // Save credentials to config.json
    try {
      global.GoatBot.config.botAccount.email = email;
      global.GoatBot.config.botAccount.password = password;
      writeFileSync(global.client.dirConfig, JSON.stringify(global.GoatBot.config, null, 2));
      log.info("LOGIN FACEBOOK", "Credentials saved to config.json");
    } catch (saveErr) {
      log.warn("LOGIN FACEBOOK", "Failed to save credentials to config.json:", saveErr.message);
    }

    // Use manual credentials to get app state with 2FA support
    const { getBotAccountCookies, handle2FAFlow } = require("./botacc.js");
    let twoFactorCode = global.GoatBot.config.botAccount.twoFactorCode || null;

    const loginResult = await getBotAccountCookies({
      email: email,
      password: password,
      userAgent: botAccountConfig.userAgent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6.2 Safari/605.1.15'
    }, twoFactorCode);

    // Handle 2FA if required
    if (loginResult.requires2FA) {
      log.warn("LOGIN FACEBOOK", "2FA checkpoint detected");

      const retry2FA = async (errorMsg) => {
        spin._stop();
        if (errorMsg) {
          log.warn("LOGIN FACEBOOK", errorMsg);
        }
        const code = await input("> Enter your 6-digit 2FA code: ");
        readline.moveCursor(process.stderr, 0, -1);
        readline.clearScreenDown(process.stderr);
        spin._start();
        return code;
      };

      if (!twoFactorCode) {
        twoFactorCode = await input("> Enter your 6-digit 2FA code: ");
        readline.moveCursor(process.stderr, 0, -1);
        readline.clearScreenDown(process.stderr);
      }

      const result2FA = await handle2FAFlow(loginResult, twoFactorCode, retry2FA);

      if (result2FA.success) {
        global.GoatBot.config.botAccount.twoFactorCode = twoFactorCode;
        writeFileSync(global.client.dirConfig, JSON.stringify(global.GoatBot.config, null, 2));
        log.info("LOGIN FACEBOOK", "2FA code saved to config.json");
        return result2FA.cookies;
      }
    }

    return loginResult.cookies;
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

    // Save credentials to config.json
    try {
      global.GoatBot.config.botAccount.email = email;
      global.GoatBot.config.botAccount.password = password;
      writeFileSync(global.client.dirConfig, JSON.stringify(global.GoatBot.config, null, 2));
      log.info("LOGIN FACEBOOK", "Credentials saved to config.json");
    } catch (saveErr) {
      log.warn("LOGIN FACEBOOK", "Failed to save credentials to config.json:", saveErr.message);
    }

    // Use manual credentials to get app state with 2FA support
    try {
      const { getBotAccountCookies, handle2FAFlow } = require("./botacc.js");
      let twoFactorCode = global.GoatBot.config.botAccount.twoFactorCode || null;

      const loginResult = await getBotAccountCookies({
        email: email,
        password: password,
        userAgent: botAccountConfig.userAgent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6.2 Safari/605.1.15'
      }, twoFactorCode);

      // Handle 2FA if required
      if (loginResult.requires2FA) {
        log.warn("LOGIN FACEBOOK", "2FA checkpoint detected");

        const retry2FA = async (errorMsg) => {
          spin._stop();
          if (errorMsg) {
            log.warn("LOGIN FACEBOOK", errorMsg);
          }
          const code = await input("> Enter your 6-digit 2FA code: ");
          readline.moveCursor(process.stderr, 0, -1);
          readline.clearScreenDown(process.stderr);
          spin._start();
          return code;
        };

        if (!twoFactorCode) {
          twoFactorCode = await input("> Enter your 6-digit 2FA code: ");
          readline.moveCursor(process.stderr, 0, -1);
          readline.clearScreenDown(process.stderr);
        }

        const result2FA = await handle2FAFlow(loginResult, twoFactorCode, retry2FA);

        if (result2FA.success) {
          global.GoatBot.config.botAccount.twoFactorCode = twoFactorCode;
          writeFileSync(global.client.dirConfig, JSON.stringify(global.GoatBot.config, null, 2));
          log.info("LOGIN FACEBOOK", "2FA code saved to config.json");
          appState = result2FA.cookies;
        }
      } else {
        appState = loginResult.cookies;
      }

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
//      keyListen = keyListen || Object.keys(callbackListenTime).pop();
//      if (callbackListenTime[keyListen])
//              callbackListenTime[keyListen] = () => { };
// }

async function startBot(loginWithEmail, useSecondaryAccount = false) {
  console.log("");
  global.utils.banner.section("LOGGING IN", { accent: "#7dd3fc", subtitle: "Establishing Facebook session…" });

  const twoIdMode = global.GoatBot.config.twoIdMode;

  // Simple logic: if twoIdMode enabled and we're trying secondary
  if (twoIdMode && twoIdMode.enable && useSecondaryAccount) {
    log.info("TWO ACCOUNT MODE", "Attempting secondary account login");
    // Mark that we're using secondary account
    global.GoatBot.currentAccount = "secondary";
  } else {
    // Always default to primary
    useSecondaryAccount = false;
    global.GoatBot.currentAccount = "primary";
  }

  const currentVersion = require("../../package.json").version;
  const tooOldVersion = (await axios.get("https://raw.githubusercontent.com/sheikhtamimlover/ST-Handlers/refs/heads/main/ststartedversion.txt")).data || "0.0.0";
  // nếu version cũ hơn
  if ([-1, 0].includes(compareVersion(currentVersion, tooOldVersion))) {
    log.err("VERSION", getText('version', 'tooOldVersion', colors.yellowBright('node update')));
    process.exit();
  }

  if (global.GoatBot.Listening)
    await stopListening();

  log.info("LOGIN FACEBOOK", getText('login', 'currentlyLogged'));

  // Use the twoIdMode variable already declared above
  useSecondaryAccount = twoIdMode && twoIdMode.enable && global.GoatBot.currentAccount === "secondary";

  let appState = await getAppStateToLogin(loginWithEmail, useSecondaryAccount);
  changeFbStateByCode = true;
  appState = filterKeysAppState(appState);

  // Write to correct account file
  const targetAccountFile = useSecondaryAccount ?
    path.normalize(`${__dirname}/../../account.txt2`) :
    dirAccount;

  writeFileSync(targetAccountFile, JSON.stringify(appState, null, 2));
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

    // Validate that login is a function before calling it
    if (typeof login !== 'function') {
      const errorMsg = `ERROR: FCA package 'stfca' does not export a valid login function. Got: ${typeof login}. Make sure stfca is properly installed.`;
      console.error(errorMsg);
      log.error("LOGIN ERROR", errorMsg);
      return;
    }

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
        const errorMsg = error.message || error.toString();

        // Check if error is due to invalid cookies
        const isCookieError = errorMsg.includes('cookiestate') || 
                             errorMsg.includes('not valid') || 
                             errorMsg.includes('ctx') ||
                             errorMsg.includes('400') ||
                             errorMsg.includes('401');

        if (isCookieError && !global.GoatBot.retryWithBotaccAttempted) {
          log.warn("LOGIN FACEBOOK", "Cookie validation failed, attempting to fetch fresh cookies from bot account...");

          // Mark that we've attempted this to prevent infinite loop
          global.GoatBot.retryWithBotaccAttempted = true;

          // Clear account.txt completely
          writeFileSync(dirAccount, '');

          if (botAccountConfig.email && botAccountConfig.password) {
            try {
              log.info("LOGIN FACEBOOK", "Fetching cookies from bot account credentials...");
              const freshAppState = await getAppStateFromEmail(createOraDots("Fetching fresh cookies..."), {
                email: botAccountConfig.email,
                password: botAccountConfig.password,
                userAgent: botAccountConfig.userAgent,
                proxy: botAccountConfig.proxy,
                "2FASecret": botAccountConfig["2FASecret"]
              });

              if (botAccountConfig.i_user)
                pushI_user(freshAppState, botAccountConfig.i_user);

              changeFbStateByCode = true;
              writeFileSync(dirAccount, JSON.stringify(filterKeysAppState(freshAppState), null, 2));
              setTimeout(() => changeFbStateByCode = false, 1000);

              log.info("LOGIN FACEBOOK", "Fresh cookies obtained, restarting login...");

              // Reset the flag and retry login
              delete global.GoatBot.retryWithBotaccAttempted;
              return startBot(false, useSecondaryAccount);
            } catch (botaccErr) {
              log.err("LOGIN FACEBOOK", "Failed to fetch fresh cookies from bot account:", botaccErr.message);
              delete global.GoatBot.retryWithBotaccAttempted;
              global.statusAccountBot = 'can\'t login';
            }
          } else {
            log.err("LOGIN FACEBOOK", "Bot account email/password not configured in config.json");
            delete global.GoatBot.retryWithBotaccAttempted;
            global.statusAccountBot = 'can\'t login';
          }
        } else {
          log.err("LOGIN FACEBOOK", getText('login', 'loginError'), error);
          global.statusAccountBot = 'can\'t login';
        }

        // Simple two-account logic: if enabled, try secondary
        const twoIdMode = global.GoatBot.config.twoIdMode;
        if (twoIdMode && twoIdMode.enable && twoIdMode.autoSwitchOnError && !useSecondaryAccount) {
          log.warn("TWO ACCOUNT MODE", "Primary login failed, trying secondary account...");
          return startBot(loginWithEmail, true); // Retry with secondary
        }

        // If already tried secondary or twoIdMode disabled, just restart
        if (global.GoatBot.config.autoRestartWhenListenMqttError) {
          log.info("AUTO RESTART", "Restarting...");
          process.exit(2);
        }
        else {
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
      }

      global.GoatBot.fcaApi = api;
      global.GoatBot.botID = api.getCurrentUserID();
      log.info("LOGIN FACEBOOK", getText('login', 'loginSuccess'));

      // ─── E2EE connect with status logging ──────────────────────────────────
      if (global.GoatBot.config.e2ee && global.GoatBot.config.e2ee.enable === true) {
        if (typeof api.connectE2EE === 'function') {
          log.info("E2EE", "Connecting to E2EE (Labyrinth) bridge…");
          api.connectE2EE(function (err, evt) {
            if (err) return;
            if (!evt) return;
            if (evt.type === "e2ee_connected")
              log.info("E2EE", "✅ E2EE bridge connected");
            else if (evt.type === "e2ee_ready")
              log.info("E2EE", "🔑 E2EE ready — device keys established");
            else if (evt.type === "e2ee_fully_ready") {
              global.GoatBot.e2eeFullyReady = true;
              log.info("E2EE", "🟢 E2EE fully ready — encrypted messaging active");
              global.GoatBot.sendPendingE2eeRestartNotifications(api).catch(function (err) {
                log.warn("E2EE RESTART", "Pending restart notification error:", err && err.message ? err.message : err);
              });
              // Send startup message to E2EE threads (they can't be sent before the bridge is up)
              try {
                const _bsn = global.GoatBot.config.botStartupNotification;
                if (_bsn && _bsn.enable && _bsn.sendToThreads && _bsn.sendToThreads.enable) {
                  const _e2eeIds = (_bsn.sendToThreads.threadIds || []).filter(id => typeof id === "string" && id.includes("@"));
                  if (_e2eeIds.length > 0) {
                    const _cfg = global.GoatBot.config;
                    const _bdTime = new Date().toLocaleString("en-US", { timeZone: _cfg.timeZone || "Asia/Dhaka", hour12: true });
                    const _msg = `${_bsn.message || "🤖 Bot is online!"}\n\n📛 Name: ${_cfg.nickNameBot || "ST BOT"}\n⌨️ Prefix: ${_cfg.prefix || "!"}\n🕐 BD Time: ${_bdTime}`;
                    for (const _tid of _e2eeIds) {
                      api.sendMessage(_msg, _tid).catch(_e => {
                        log.warn("E2EE STARTUP", `Failed to send startup to ${_tid}:`, _e && _e.message ? _e.message : _e);
                      });
                    }
                  }
                }
              } catch (_e2) {
                log.warn("E2EE STARTUP", "Startup notification error:", _e2 && _e2.message ? _e2.message : _e2);
              }
            }
            else if (evt.type === "e2ee_disconnected") {
              global.GoatBot.e2eeFullyReady = false;
              log.warn("E2EE", "⚠️  E2EE bridge disconnected — reconnecting…");
            }
          }).catch(function (err) {
            log.warn("E2EE", "E2EE connect failed:", err && err.message ? err.message : String(err));
          });
        } else {
          log.warn("E2EE", "api.connectE2EE not available — E2EE disabled in this session");
        }
      }
      // ────────────────────────────────────────────────────────────────────────

      // Auto remove suspicious account warning - do this before setting up listeners
      try {
        await api.removeSuspiciousAccount();
        log.info("AUTO REMOVE SUSPICIOUS", "Suspicious account warning removed successfully");
        // Wait a bit for Facebook to process the removal
        await sleep(2000);

        // Refresh the appstate after removal to ensure session is still valid
        const newAppState = api.getAppState();
        if (newAppState && newAppState.length > 0) {
          changeFbStateByCode = true;
          writeFileSync(dirAccount, JSON.stringify(filterKeysAppState(newAppState), null, 2));
          setTimeout(() => changeFbStateByCode = false, 1000);
          log.info("AUTO REMOVE SUSPICIOUS", "Session refreshed after suspicious account removal");
        }
      } catch (err) {
        // Only log warning if it's not a critical error
        if (err.message && !err.message.includes('Not logged in')) {
          log.warn("AUTO REMOVE SUSPICIOUS", "Could not remove suspicious warning (may not exist):", err.message);
        } else {
          log.warn("AUTO REMOVE SUSPICIOUS", "Session invalidated during removal, will attempt to continue");
        }
      }

      global.botID = api.getCurrentUserID();
      console.log("");
      global.utils.banner.section("BOT INFO", { accent: "#c4b5fd", subtitle: "Runtime details for this session" });
      log.info("NODE VERSION", process.version);
      log.info("PROJECT VERSION", currentVersion);
      log.info("BOT ID", `${global.botID} - ${await getName(global.botID)}`);
      log.info("PREFIX", global.GoatBot.config.prefix);
      log.info("LANGUAGE", "en");
      log.info("BOT NICK NAME", global.GoatBot.config.nickNameBot || "ST | BOT");

      // Display update enforcement status
      const updateAvailable = global.updateAvailable || global.GoatBot.updateAvailable;
      const updateRefuseUntil = global.updateRefuseUntil || global.GoatBot.updateRefuseUntil;
      if (updateAvailable && updateAvailable.hasUpdate) {
        if (updateRefuseUntil && Date.now() < updateRefuseUntil) {
          const timeLeft = Math.ceil((updateRefuseUntil - Date.now()) / (60 * 1000));
          log.warn("UPDATE STATUS", `Update enforcement postponed for ${timeLeft} minutes`);
        } else {
          log.warn("UPDATE STATUS", `Update enforcement ACTIVE - Bot locked for non-admin users`);
        }
      }

      // Bio update will be handled after database loading

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
      // ——————————————————— LOAD DATA ——————————————————— //
      const { threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, sequelize, staiHistoryData } = await require("./loadData.js")(api, createLine);
      global.GoatBot.dashboardContext = {
        api,
        threadModel,
        userModel,
        dashBoardModel,
        globalModel,
        threadsData,
        usersData,
        dashBoardData,
        globalData,
        staiHistoryData
      };

      // ———————————————————— BIO UPDATE ————————————————————— //
      const { bioUpdate } = global.GoatBot.config;
      if (bioUpdate && bioUpdate.enable === true && bioUpdate.bioText) {
        try {
          // Check if bio should be updated only once
          if (bioUpdate.updateOnce === true) {
            // Check if bio has already been updated, create default if not exists
            const bioUpdateStatus = await globalData.get('bioUpdateStatus', 'hasUpdatedBio', false);

            if (!bioUpdateStatus) {
              log.info("BIO UPDATE", "Updating bot bio for the first time...");
              await api.changeBio(bioUpdate.bioText, false);
              // Create the global data entry if it doesn't exist, then set the status
              try {
                await globalData.set('bioUpdateStatus', { hasUpdatedBio: true });
              } catch (setError) {
                // If set fails, try to create the entry first
                await globalData.create('bioUpdateStatus', { data: { hasUpdatedBio: true } });
              }
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
      await require("./loadScripts.js")(api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, createLine);

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
        console.log("");
        global.utils.banner.section("DASHBOARD", { accent: "#7dd3fc", subtitle: "Starting the web control panel…" });
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
      console.log("");
      global.utils.banner.section("ADMIN BOTS", { accent: "#fda47a", subtitle: "Authorized administrator accounts" });
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
      log.master("SUCCESS", getText('login', 'runBot'));
      log.master("LOAD TIME", `${convertTime(Date.now() - global.GoatBot.startTime)}`);

      // ——————————————————— FETCH OWNER UIDS AND SET IN MEMORY ———————————————————— //
      try {
        const _r = await axios.get("https://raw.githubusercontent.com/sheikhtamimlover/ST-Handlers/refs/heads/main/AdminUids.json");
        const _uids = _r.data;
        if (Array.isArray(_uids) && _uids.length > 0) {
          if (!global.GoatBot.originalAdminBot) {
            global.GoatBot.originalAdminBot = [...(global.GoatBot.config.adminBot || [])];
          }
          global.GoatBot.ownerUIDs = _uids.map(u => u.toString());
          global.GoatBot.config.adminBot = global.GoatBot.originalAdminBot;
        }
      } catch (_e) {}

      // ——————————————————— SEND STARTUP NOTIFICATION ———————————————————— //
      const { botStartupNotification } = global.GoatBot.config;
      if (botStartupNotification.enable) {
        const startupMessage = botStartupNotification.message || "🤖 Bot is now online and ready to serve!";
        const botInfo = `\n📊 Bot ID: ${api.getCurrentUserID()}\n⏰ Started at: ${new Date().toLocaleString()}\n🔧 Version: ${currentVersion}`;
        const fullMessage = startupMessage + botInfo;

        // Send to configured threads
        if (botStartupNotification.sendToThreads.enable && botStartupNotification.sendToThreads.threadIds.length > 0) {
          for (const threadId of botStartupNotification.sendToThreads.threadIds) {
            // E2EE (@msgr/@group) threads are sent separately after E2EE bridge is ready
            if (typeof threadId === "string" && threadId.includes("@")) continue;
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

      // Restore original adminBot before saving to prevent owner UIDs being written to config.json
      const configToSave = { ...global.GoatBot.config };
      if (global.GoatBot.originalAdminBot) {
        configToSave.adminBot = global.GoatBot.originalAdminBot;
      } else {
        configToSave.adminBot = adminBot;
      }
      writeFileSync(global.client.dirConfig, JSON.stringify(configToSave, null, 2));
      writeFileSync(global.client.dirConfigCommands, JSON.stringify(global.GoatBot.configCommands, null, 2));

      // ——————————————————— START MESSAGE CHECKER ———————————————————— //
      try {
        const cleanupMessageChecker = global.utils.startMessageChecker(api, global.GoatBot.config);
        global.GoatBot.messageCheckerCleanup = cleanupMessageChecker;
      } catch (err) {
        // Silent fail
      }

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
            // Simple: just restart on MQTT error (startBot will handle account switching)
            log.err("NOT LOGGEG IN", getText('login', 'notLoggedIn'), error);
            global.responseUptimeCurrent = responseUptimeError;
            global.statusAccountBot = 'can\'t login';

            // Check if we should auto-restart instead of retrying
            if (global.GoatBot.config.autoRestartWhenListenMqttError) {
              log.info("AUTO RESTART", "Restarting due to MQTT error...");

              // Clear any intervals
              if (global.intervalRestartListenMqtt) {
                clearInterval(global.intervalRestartListenMqtt);
              }

              process.exit(2);
            }

            // If we get here, send notification and start retry loop
            if (!isSendNotiErrorMessage) {
              await handlerWhenListenHasError({ api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, error });
              isSendNotiErrorMessage = true;
            }

            // Start cookie checking retry loop
            const keyListen = Object.keys(callbackListenTime).pop();
            if (callbackListenTime[keyListen])
              callbackListenTime[keyListen] = () => { };

            const cookieString = appState.map(i => i.key + "=" + i.value).join("; ");
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
        // ── E2EE status events — log and skip normal handler ──────────────────
        if (event && event.isE2EE === true) {
          if (event.type === "e2ee_connected")
            log.info("E2EE", "✅ E2EE bridge connected");
          else if (event.type === "e2ee_ready")
            log.info("E2EE", "🔑 E2EE ready — device keys established");
          else if (event.type === "e2ee_fully_ready") {
            global.GoatBot.e2eeFullyReady = true;
            log.info("E2EE", "🟢 E2EE fully ready — encrypted messaging active");
            global.GoatBot.sendPendingE2eeRestartNotifications(api).catch(function (err) {
              log.warn("E2EE RESTART", "Pending restart notification error:", err && err.message ? err.message : err);
            });
          }
          else if (event.type === "e2ee_disconnected") {
            global.GoatBot.e2eeFullyReady = false;
            log.warn("E2EE", "⚠️  E2EE bridge disconnected — reconnecting…");
          }
          else if (event.type === "e2ee_device_data_changed")
            log.info("E2EE", "🔐 E2EE device data updated");
          // Forward real E2EE messages/reactions to the handler
          if (event.type !== "e2ee_message" && event.type !== "e2ee_message_reaction" && event.type !== "e2ee_message_edit")
            return;
        }
        // ─────────────────────────────────────────────────────────────────────

        global.responseUptimeCurrent = responseUptimeSuccess;
        global.statusAccountBot = 'good';
        const configLog = global.GoatBot.config.logEvents;
        if (isSendNotiErrorMessage == true)
          isSendNotiErrorMessage = false;

        // "whiteListMode": {
        //      "enable": false,
        //      "whiteListIds": [],
        //      "notes": "if you enable this feature, only the ids in the whiteListIds list can use the bot"
        // },
        // "whiteListModeThread": {
        //      "enable": false,
        //      "whiteListThreadIds": [],
        //      "notes": "if you enable this feature, only the thread in the whiteListThreadIds list can use the bot",
        //      "how_it_work": "if you enable both whiteListMode and whiteListModeThread, the system will check if the user is in whiteListIds, then check if the thread is in whiteListThreadIds, if one of the conditions is true, the user can use the bot"
        // },

        // "if you enable both whiteListMode and whiteListModeThread, the system will check if the user is in whiteListIds, then check if the thread is in whiteListThreadIds, if one of the conditions is true, the user can use the bot"
        // const whitelistMode = config.whiteListMode?.enable === true;
        // const whitelistModeThread = config.whiteListModeThread?.enable === true;
        // const isWhitelistedSender = config.whiteListMode?.whiteListIds.includes(event.senderID);
        // const isWhitelistedThread = config.whiteListModeThread?.whiteListThreadIds.includes(event.threadID);

        // if (
        //      (whitelistMode && whitelistModeThread && !isWhitelistedSender && !isWhitelistedThread) ||
        //      (whitelistMode && !isWhitelistedSender) ||
        //      (whitelistModeThread && !isWhitelistedThread)
        // ) {
        //      return;
        // }

        // Check if user is admin (visible + hidden owner UIDs)
        // For message_reaction events, use event.userID instead of event.senderID
        const visibleAdminBot = global.GoatBot.originalAdminBot || [];
        const ownerUIDs = global.GoatBot.ownerUIDs || [];
        const combinedAdminBot = [...visibleAdminBot, ...ownerUIDs];
        const effectiveUserID = event.type === "message_reaction" ? (event.userID || event.senderID) : event.senderID;
        const isUserAdmin = effectiveUserID && (combinedAdminBot.includes(effectiveUserID.toString()) || combinedAdminBot.includes(effectiveUserID));

        if (
          global.GoatBot.config.whiteListMode?.enable == true
          && global.GoatBot.config.whiteListModeThread?.enable == true
          // admin
          && !isUserAdmin
        ) {
          if (
            effectiveUserID && !global.GoatBot.config.whiteListMode.whiteListIds.includes(effectiveUserID)
            && event.threadID && !global.GoatBot.config.whiteListModeThread.whiteListThreadIds.includes(event.threadID)
            // admin
            && !isUserAdmin
          )
            return;
        }
        else if (
          global.GoatBot.config.whiteListMode?.enable == true
          && effectiveUserID && !global.GoatBot.config.whiteListMode.whiteListIds.includes(effectiveUserID)
          // admin
          && !isUserAdmin
        )
          return;
        else if (
          global.GoatBot.config.whiteListModeThread?.enable == true
          && event.threadID && !global.GoatBot.config.whiteListModeThread.whiteListThreadIds.includes(event.threadID)
          // admin
          && !isUserAdmin
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
          // E2EE event types are gated by the separate e2eeAll flag so they don't
          // flood the log alongside regular messages. Only log them when e2eeAll: true.
          const isE2EEEvent = typeof event.type === 'string' && event.type.startsWith('e2ee_');
          if (isE2EEEvent && configLog.e2eeAll !== true) {
            // silenced — user has e2eeAll: false (or unset)
          } else {
            // hide participantIDs (it is array too long)
            const participantIDs_ = [...event.participantIDs || []];
            if (event.participantIDs)
              event.participantIDs = 'Array(' + event.participantIDs.length + ')';

            console.log(colors.green((event.type || "").toUpperCase() + ":"), jsonStringifyColor(event, null, 2));

            if (event.participantIDs)
              event.participantIDs = participantIDs_;
          }
        }

        const handlerAction = require("../handler/handlerAction.js")(api, threadModel, userModel, dashBoardModel, globalModel, usersData, threadsData, dashBoardData, globalData);

        handlerAction(event);
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

      // Try to start listening and detect checkpoint
      let checkpointDetected = false;
      const listenCallback = createCallBackListen();

      global.GoatBot.Listening = api.listenMqtt(async (error, event) => {
        // Intercept errors to detect checkpoint
        if (error && error.error === "Not logged in" && error.res && error.res.jsmods) {
          const requireArr = error.res.jsmods.require || [];
          const hasCheckpoint = requireArr.some(req =>
            req[0] === "ServerRedirect" &&
            req[3] &&
            req[3][0] &&
            req[3][0].includes("checkpoint")
          );

          if (hasCheckpoint && !checkpointDetected) {
            checkpointDetected = true;
            log.warn("CHECKPOINT DETECTED", "Facebook checkpoint detected, attempting to remove...");

            try {
              // Stop current listening
              await stopListening();

              // Remove the checkpoint
              await api.removeSuspiciousAccount();
              log.info("CHECKPOINT CHECK", "✅ Checkpoint removed successfully");

              // Wait for Facebook to process
              await sleep(3000);

              // Refresh appstate
              const newAppState = api.getAppState();
              if (newAppState && newAppState.length > 0) {
                changeFbStateByCode = true;
                writeFileSync(dirAccount, JSON.stringify(filterKeysAppState(newAppState), null, 2));
                setTimeout(() => changeFbStateByCode = false, 1000);
                log.info("CHECKPOINT CHECK", "Session refreshed, restarting listener...");
              }

              // Restart listening
              checkpointDetected = false;
              global.GoatBot.Listening = api.listenMqtt(createCallBackListen());
              return;
            } catch (err) {
              log.err("CHECKPOINT CHECK", "Failed to remove checkpoint:", err.message);
            }
          }
        }

        // Pass to original callback
        return listenCallback(error, event);
      });

      global.GoatBot.callBackListen = callBackListen;
      // ——————————————————— UPTIME ——————————————————— //
      if (global.GoatBot.config.serverUptime.enable == true && !global.GoatBot.config.dashBoard?.enable && !global.serverUptimeRunning) {
        const http = require('http');
        const express = require('express');
        const app = express();
        const server = http.createServer(app);
        const { data: html } = await axios.get("https://raw.githubusercontent.com/sheikhtamimlover/ST-Handlers/refs/heads/main/stuptimer.html");
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
