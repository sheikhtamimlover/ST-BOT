"use strict";

const { readdirSync, readFileSync, writeFileSync, existsSync } = require("fs-extra");
const path = require("path");

const exec = (cmd, options) => new Promise((resolve, reject) => {
        require("child_process").exec(cmd, options, (err, stdout) => {
                if (err) return reject(err);
                resolve(stdout);
        });
});

const { log, loading, getText, colors, removeHomeDir } = global.utils;
const { GoatBot } = global;
const { configCommands } = GoatBot;
const { fcaList } = require(`${process.cwd()}/fca.js`);

const regExpCheckPackage = /require(\s+|)\((\s+|)[`'"]([^`'"]+)[`'"](\s+|)\)/g;
const packageAlready = [];
const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let count = 0;

// ─────────────────────────────────────────────────────────────────
//  PACKAGE ALIASES — automatically migrate deprecated/old packages
//  to their modern replacements. The source files are rewritten in
//  place, the new package is installed, and the old one is removed.
// ─────────────────────────────────────────────────────────────────
const packageAliasMap = {
        "gifencoder": "gif-encoder-2",
        "discord-image-generation": "discord-image-generation-v2"
};

function escapeRegExp(s) {
        return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function migratePackage(filePath, fileName, oldName, newName, folder) {
        // 1) Rewrite source file: replace 'oldName' inside require/import strings
        try {
                const original = readFileSync(filePath, "utf8");
                const stringRe = new RegExp(`(['"\`])${escapeRegExp(oldName)}(/[^'"\`]*)?\\1`, "g");
                const rewritten = original.replace(stringRe, (_m, q, sub = "") => `${q}${newName}${sub}${q}`);
                if (rewritten !== original) {
                        writeFileSync(filePath, rewritten);
                        if (global.temp?.contentScripts?.[folder]) {
                                global.temp.contentScripts[folder][fileName] = rewritten;
                        }
                        log.warn("PACKAGE UPDATE", `${colors.yellow(fileName)} → rewrote require("${colors.red(oldName)}") to require("${colors.green(newName)}")`);
                }
        } catch (err) {
                log.err("PACKAGE UPDATE", `Failed to rewrite ${fileName}: ${err.message}`);
        }

        // 2) Install replacement package if missing
        if (!existsSync(`${process.cwd()}/node_modules/${newName}`)) {
                const wait = setInterval(() => {
                        loading.info("PACKAGE", `${spinner[count % spinner.length]} Installing ${colors.green(newName)} (replacement for ${colors.red(oldName)})`);
                        count++;
                }, 80);
                try {
                        await exec(`npm install ${newName} --save`, { cwd: process.cwd() });
                        clearInterval(wait);
                        process.stderr.write("\r\x1b[K");
                        log.success("PACKAGE", `Installed ${colors.green(newName)}`);
                } catch (err) {
                        clearInterval(wait);
                        process.stderr.write("\r\x1b[K");
                        log.err("PACKAGE", `Failed to install ${newName}: ${err.message}`);
                        throw new Error(`Cannot install replacement package ${newName}`);
                }
        }

        // 3) Uninstall the deprecated package if it exists
        if (existsSync(`${process.cwd()}/node_modules/${oldName}`)) {
                try {
                        await exec(`npm uninstall ${oldName}`, { cwd: process.cwd() });
                        log.success("PACKAGE", `Removed deprecated ${colors.red(oldName)}`);
                } catch (err) {
                        log.warn("PACKAGE", `Could not uninstall ${oldName}: ${err.message}`);
                }
        }
}

async function ensureFcaPackageInstalled() {
        const configPath = path.join(process.cwd(), "config.json");
        if (!existsSync(configPath)) return;

        const total = Object.keys(fcaList).length;
        let installedCount = 0;
        const missing = [];

        for (const [key, packageName] of Object.entries(fcaList)) {
                if (existsSync(`${process.cwd()}/node_modules/${packageName}`)) installedCount++;
                else missing.push({ key, packageName });
        }

        if (missing.length === 0) {
                log.success("FCA", `${colors.cyan(`${installedCount}/${total}`)} packages ready`);
                return;
        }

        log.warn("FCA", `Installing ${missing.length} missing package(s)...`);

        for (const { packageName } of missing) {
                let i = 0;
                const wait = setInterval(() => {
                        loading.info("FCA", `${spinner[i % spinner.length]} Installing ${colors.yellow(packageName)}`);
                        i++;
                }, 80);
                try {
                        await exec(`npm install ${packageName}`, { cwd: process.cwd() });
                        clearInterval(wait);
                        process.stderr.write("\r\x1b[K");
                        log.success("FCA", `Installed ${packageName}`);
                        installedCount++;
                } catch (err) {
                        clearInterval(wait);
                        process.stderr.write("\r\x1b[K");
                        log.err("FCA", `${packageName}: ${err.message}`);
                }
        }
        log.success("FCA", `${colors.cyan(`${installedCount}/${total}`)} packages ready`);
}

module.exports = async function (api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, createLine) {
        await ensureFcaPackageInstalled();

        const aliasesData = await globalData.get("setalias", "data", []);
        if (aliasesData) {
                for (const data of aliasesData) {
                        const { aliases, commandName } = data;
                        for (const alias of aliases) {
                                if (GoatBot.aliases.has(alias))
                                        throw new Error(`Alias "${alias}" already exists in command "${commandName}"`);
                                GoatBot.aliases.set(alias, commandName);
                        }
                }
        }

        const folders = ["cmds", "events"];
        let text, setMap, typeEnvCommand;

        for (const folderModules of folders) {
                const headline = folderModules === "cmds" ? "LOAD COMMANDS" : "LOAD EVENTS";
                console.log("");
                global.utils.banner.section(headline, { accent: "#7dd3fc", subtitle: folderModules === "cmds" ? "Discovering and registering bot commands" : "Discovering and registering event handlers" });

                if (folderModules === "cmds") {
                        text = "command";
                        typeEnvCommand = "envCommands";
                        setMap = "commands";
                } else {
                        text = "event command";
                        typeEnvCommand = "envEvents";
                        setMap = "eventCommands";
                }

                const fullPathModules = path.normalize(`${process.cwd()}/scripts/${folderModules}`);
                const Files = readdirSync(fullPathModules)
                        .filter(file =>
                                file.endsWith(".js") &&
                                !file.endsWith("eg.js") &&
                                !file.match(/(dev)\.js$/g) &&
                                !configCommands[folderModules === "cmds" ? "commandUnload" : "commandEventUnload"]?.includes(file)
                        );

                const commandError = [];
                let commandLoadSuccess = 0;

                for (const file of Files) {
                        const pathCommand = path.normalize(`${fullPathModules}/${file}`);
                        try {
                                // ───────────── CHECK PACKAGES ───────────── //
                                let contentFile = readFileSync(pathCommand, "utf8");
                                let allPackage = contentFile.match(regExpCheckPackage);

                                if (allPackage) {
                                        allPackage = allPackage
                                                .map(p => p.match(/[`'"]([^`'"]+)[`'"]/)[1])
                                                .filter(p => p.indexOf("/") !== 0 && p.indexOf("./") !== 0 && p.indexOf("../") !== 0 && p.indexOf(__dirname) !== 0);

                                        for (let packageName of allPackage) {
                                                if (packageName.startsWith("@"))
                                                        packageName = packageName.split("/").slice(0, 2).join("/");
                                                else
                                                        packageName = packageName.split("/")[0];

                                                // ─── Apply alias migration before install ───
                                                if (packageAliasMap[packageName]) {
                                                        const newName = packageAliasMap[packageName];
                                                        await migratePackage(pathCommand, file, packageName, newName, folderModules);
                                                        // refresh content & switch package name
                                                        contentFile = readFileSync(pathCommand, "utf8");
                                                        packageName = newName;
                                                }

                                                if (!packageAlready.includes(packageName)) {
                                                        packageAlready.push(packageName);
                                                        if (!existsSync(`${process.cwd()}/node_modules/${packageName}`)) {
                                                                const wait = setInterval(() => {
                                                                        loading.info("PACKAGE", `${spinner[count % spinner.length]} Installing ${colors.yellow(packageName)} for ${text} ${colors.yellow(file)}`);
                                                                        count++;
                                                                }, 80);
                                                                try {
                                                                        await exec(`npm install ${packageName} --${pathCommand.endsWith(".dev.js") ? "no-save" : "save"}`);
                                                                        clearInterval(wait);
                                                                        process.stderr.write("\r\x1b[K");
                                                                        log.success("PACKAGE", `Installed ${colors.green(packageName)}`);
                                                                } catch (err) {
                                                                        clearInterval(wait);
                                                                        process.stderr.write("\r\x1b[K");
                                                                        log.err("PACKAGE", `Failed to install ${colors.red(packageName)}`);
                                                                        throw new Error(`Can't install package ${packageName}`);
                                                                }
                                                        }
                                                }
                                        }
                                }

                                // ──────────── CACHE CONTENT SCRIPT ──────────── //
                                global.temp.contentScripts[folderModules][file] = contentFile;

                                const command = require(pathCommand);
                                command.location = pathCommand;
                                const configCommand = command.config;
                                const commandName = configCommand?.name;

                                if (!configCommand) throw new Error(`config of ${text} undefined`);
                                if (!configCommand.category) throw new Error(`category of ${text} undefined`);
                                if (!commandName) throw new Error(`name of ${text} undefined`);
                                if (!command.onStart && !command.ST) throw new Error(`onStart or ST function of ${text} is required`);
                                if (command.onStart && typeof command.onStart !== "function") throw new Error(`onStart of ${text} must be a function`);
                                if (command.ST && typeof command.ST !== "function") throw new Error(`ST of ${text} must be a function`);
                                if (GoatBot[setMap].has(commandName)) throw new Error(`${text} "${commandName}" already exists with file "${removeHomeDir(GoatBot[setMap].get(commandName).location || "")}"`);

                                const { onFirstChat, onChat, onLoad, onEvent, onAnyEvent } = command;
                                const { envGlobal, envConfig, aliases } = configCommand;

                                // ───────────── ALIASES ───────────── //
                                const validAliases = [];
                                if (aliases) {
                                        if (!Array.isArray(aliases)) throw new Error('The value of "config.aliases" must be array!');
                                        for (const alias of aliases) {
                                                if (aliases.filter(item => item === alias).length > 1)
                                                        throw new Error(`alias "${alias}" duplicate in ${text} "${commandName}" with file "${removeHomeDir(pathCommand)}"`);
                                                if (GoatBot.aliases.has(alias))
                                                        throw new Error(`alias "${alias}" already exists in ${text} "${GoatBot.aliases.get(alias)}" with file "${removeHomeDir(GoatBot[setMap].get(GoatBot.aliases.get(alias))?.location || "")}"`);
                                                validAliases.push(alias);
                                        }
                                        for (const alias of validAliases) GoatBot.aliases.set(alias, commandName);
                                }

                                // ───────────── ENV GLOBAL ───────────── //
                                if (envGlobal) {
                                        if (typeof envGlobal !== "object" || Array.isArray(envGlobal))
                                                throw new Error('the value of "envGlobal" must be object');
                                        for (const i in envGlobal) {
                                                if (!configCommands.envGlobal[i]) {
                                                        configCommands.envGlobal[i] = envGlobal[i];
                                                } else {
                                                        const updated = readFileSync(pathCommand, "utf-8").replace(envGlobal[i], configCommands.envGlobal[i]);
                                                        writeFileSync(pathCommand, updated);
                                                }
                                        }
                                }

                                // ───────────── ENV CONFIG ───────────── //
                                if (envConfig) {
                                        if (typeof envConfig !== "object" || Array.isArray(envConfig))
                                                throw new Error('The value of "envConfig" must be object');
                                        if (!configCommands[typeEnvCommand]) configCommands[typeEnvCommand] = {};
                                        if (!configCommands[typeEnvCommand][commandName]) configCommands[typeEnvCommand][commandName] = {};
                                        for (const [key, value] of Object.entries(envConfig)) {
                                                if (!configCommands[typeEnvCommand][commandName][key])
                                                        configCommands[typeEnvCommand][commandName][key] = value;
                                                else {
                                                        const updated = readFileSync(pathCommand, "utf-8").replace(value, configCommands[typeEnvCommand][commandName][key]);
                                                        writeFileSync(pathCommand, updated);
                                                }
                                        }
                                }

                                // ───────────── HOOKS ───────────── //
                                if (onLoad) {
                                        if (typeof onLoad !== "function") throw new Error('The value of "onLoad" must be function');
                                        await onLoad({ api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData });
                                }
                                if (command.ST && typeof command.ST !== "function")
                                        throw new Error('The value of "ST" must be function');
                                if (onChat) GoatBot.onChat.push(commandName);
                                if (onFirstChat) GoatBot.onFirstChat.push({ commandName, threadIDsChattedFirstTime: [] });
                                if (onEvent) GoatBot.onEvent.push(commandName);
                                if (onAnyEvent) GoatBot.onAnyEvent.push(commandName);

                                GoatBot[setMap].set(commandName.toLowerCase(), command);
                                commandLoadSuccess++;

                                global.GoatBot[folderModules === "cmds" ? "commandFilesPath" : "eventCommandsFilesPath"].push({
                                        filePath: path.normalize(pathCommand),
                                        commandName: [commandName, ...validAliases]
                                });
                        } catch (error) {
                                commandError.push({ name: file, error });
                        }
                        loading.info("LOADED", `${colors.green(commandLoadSuccess)}${commandError.length ? `, ${colors.red(commandError.length)}` : ""}`);
                }

                console.log("\r");
                if (commandError.length > 0) {
                        log.err("LOADED", getText("loadScripts", "loadScriptsError", colors.yellow(text)));
                        for (const item of commandError)
                                console.log(` ${colors.red("✖ " + item.name)}: ${item.error.message}\n`, item.error);
                }
        }
};
