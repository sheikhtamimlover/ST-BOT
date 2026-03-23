const fs = require('fs-extra');
const { execSync } = require('child_process');

const { fcaList, defaultFca } = require('../../fca.js');
const CONFIG_PATH = process.cwd() + '/config.json';

function readJsonSafe(filePath, defaults = {}) {
	try {
		if (!fs.existsSync(filePath)) {
			return defaults;
		}
		return fs.readJsonSync(filePath);
	} catch (e) {
		return defaults;
	}
}

function sanitizeKey(pkg) {
	let key = pkg;
	if (key.startsWith('@')) {
		const parts = key.split('/');
		key = parts[1] || parts[0];
	}
	if (key.includes('/')) {
		key = key.split('/').pop();
	}
	key = key.replace(/[^a-zA-Z0-9_-]/g, '-');
	return key.toLowerCase();
}

function tryInstallPackage(pkg) {
	try {
		require.resolve(pkg);
		return false;
	} catch (_) {
		// convert 'dhoner fca' -> 'dhoner-fca'
		if (pkg.split(' ').length === 2 && pkg.split(' ')[1] === 'fca') {
			pkg = `${pkg.split(' ')[0]}-fca`;
		}
		execSync(`npm install ${pkg}`, { stdio: 'inherit', cwd: process.cwd() });
		return true;
	}
}

function triggerRestart(threadID = '0') {
	const restartDir = `${__dirname}/tmp`;
	if (!fs.existsSync(restartDir)) {
		fs.mkdirSync(restartDir, { recursive: true });
	}
	fs.writeFileSync(`${restartDir}/restart.txt`, `${threadID} ${Date.now()}`);
	process.exit(2);
}

module.exports = {
	config: {
		name: 'fca',
		aliases: [],
		version: '2.4.78',
		author: 'ST | Sheikh Tamim',
		countDown: 5,
		role: 2,
		description: 'List and switch FCA libraries (including pkg install)',
		category: 'owner',
		guide: {
			en: '{pn} status|list|add <key> <npm-package>|switch <key>|install <key>'
		}
	},

	langs: {
		en: {
			status: 'FCA type: %1 (%2)\nFCA packages: %3',
			list: 'Available FCA packages:\n%1',
			added: 'Added new FCA type %1 => %2',
			switched: 'Switched to FCA type %1 (%2). Restart required.',
			installed: 'Installed package %1',
			alreadyInstalled: '%1 is already installed',
			invalid: 'Invalid FCA type. Available: %1',
			error: 'Error: %1'
		}
	},

	ST: async function({ message, args, event, getLang }) {
		const action = args[0] && args[0].toLowerCase();
		const currentConfig = readJsonSafe(CONFIG_PATH, {});
		const currentType = currentConfig.fcaType || defaultFca || 'stfca';

		if (!action) {
			const keys = Object.keys(fcaList);
			let data = '╭─ Available FCA packages (reply number to switch)\n';
			keys.forEach((key, index) => {
				data += `│ ${index + 1}. ${key}: ${fcaList[key]}\n`;
			});
			data += '╰─';

			const sentMessage = await message.reply(data);
			if (sentMessage && global.GoatBot && global.GoatBot.onReply) {
				global.GoatBot.onReply.set(sentMessage.messageID, {
					commandName: 'fca',
					messageID: sentMessage.messageID,
					author: event.senderID,
					packages: keys.map((key) => ({ key, pkg: fcaList[key] }))
				});
			}
			return;
		}

		if (action === 'status') {
			const curPkg = fcaList[currentType] || 'unknown';
			const packageList = Object.entries(fcaList).map(([k,p]) => `${k}:${p}`).join(', ');
			return message.reply(getLang('status', currentType, curPkg, packageList));
		}

		if (action === 'list') {
			const data = Object.entries(fcaList).map(([key, pack]) => `${key}: ${pack}`).join('\n');
			return message.reply(getLang('list', data));
		}

		if (action === 'add') {
			if (!args[1] || !args[2]) return message.reply(getLang('error', 'Usage: add <key> <npm-package>'));
			const key = args[1];
			const pkg = args[2];
			fcaList[key] = pkg;
			return message.reply(getLang('added', key, pkg));
		}

		if (action === 'install') {
			if (!args[1]) return message.reply(getLang('error', 'Usage: install <key>'));
			const key = args[1];
			if (!fcaList[key]) return message.reply(getLang('invalid', Object.keys(fcaList).join(', ')));
			const pkg = fcaList[key];
			try {
				try {
					require.resolve(pkg);
					return message.reply(getLang('alreadyInstalled', pkg));
				} catch (_) {
					execSync(`npm install ${pkg}`, { stdio: 'inherit', cwd: process.cwd() });
					return message.reply(getLang('installed', pkg));
				}
			} catch (e) {
				return message.reply(getLang('error', e.message));
			}
		}

		if (action === 'switch') {
			if (!args[1]) return message.reply(getLang('error', 'Usage: switch <key>'));
			const key = args[1];
			if (!fcaList[key]) return message.reply(getLang('invalid', Object.keys(fcaList).join(', ')));
			currentConfig.fcaType = key;
			fs.writeJsonSync(CONFIG_PATH, currentConfig, { spaces: 2 });

			const pkg = fcaList[key];
			tryInstallPackage(pkg);
			await message.reply(getLang('switched', key, pkg));
			triggerRestart(event.threadID);
			return;
		}

		// `fca npm i|install <pkg>`
		if (action === 'npm' && args[1] && ['i', 'install'].includes(args[1].toLowerCase())) {
			let pkg = args.slice(2).join(' ');
			if (!pkg) return message.reply(getLang('error', 'Usage: npm install <package>'));
			if (pkg.split(' ').length === 2 && pkg.split(' ')[1] === 'fca') {
				pkg = `${pkg.split(' ')[0]}-fca`;
			}
			tryInstallPackage(pkg);
			const key = sanitizeKey(pkg);
			fcaList[key] = pkg;
			currentConfig.fcaType = key;
			fs.writeJsonSync(CONFIG_PATH, currentConfig, { spaces: 2 });
			await message.reply(getLang('switched', key, pkg));
			triggerRestart(event.threadID);
			return;
		}

		// `fca <key> -fca <package>` or `fca <key> <package>`
		if (args.length >= 2) {
			const key = action;
			let pkg = null;
			if (args[1] === '-fca' || args[1] === '--fca') {
				pkg = args[2];
			} else {
				pkg = args[1];
			}
			if (pkg) {
				tryInstallPackage(pkg);
				fcaList[key] = pkg;
				currentConfig.fcaType = key;
				fs.writeJsonSync(CONFIG_PATH, currentConfig, { spaces: 2 });
				await message.reply(getLang('switched', key, pkg));
				triggerRestart(event.threadID);
				return;
			}
		}

		return message.reply(getLang('error', 'Unknown operation')); 
	},

	onReply: async function ({ event, Reply, message, getLang }) {
		if (!Reply || Reply.author != event.senderID) return;

		const choice = parseInt(event.body.trim());
		if (isNaN(choice) || choice < 1 || choice > (Reply.packages || []).length) {
			return message.reply('❌ Invalid choice. Please reply with a valid number.');
		}

		const selected = Reply.packages[choice - 1];
		if (!selected) return message.reply('❌ Invalid choice.');

		const key = selected.key;
		const pkg = selected.pkg;
		const currentConfig = readJsonSafe(CONFIG_PATH, {});

		tryInstallPackage(pkg);
		fcaList[key] = pkg;
		currentConfig.fcaType = key;
		fs.writeJsonSync(CONFIG_PATH, currentConfig, { spaces: 2 });

		await message.reply(getLang('switched', key, pkg));
		triggerRestart(event.threadID);
	}
};