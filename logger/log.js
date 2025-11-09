const { colors } = require('../func/colors.js');
const moment = require("moment-timezone");
const characters = '';
const getCurrentTime = () => colors.gray(moment().tz("Asia/Dhaka").format("HH:mm:ss DD/MM/YYYY"));

function logError(prefix, message) {
	if (message === undefined) {
		message = prefix;
		prefix = "ERROR";
	}
	const logMessage = `${getCurrentTime()} ${colors.redBright(`${characters} ${prefix}:`)} ${message}`;
	console.log(logMessage);

	// Send to dashboard if available
	if (global.dashboardLogStream) {
		global.dashboardLogStream(`[ERROR] ${prefix}: ${message}`);
	}

	const error = Object.values(arguments).slice(2);
	for (let err of error) {
		if (typeof err == "object" && !err.stack)
			err = JSON.stringify(err, null, 2);
		console.log(`${getCurrentTime()} ${colors.redBright(`${characters} ${prefix}:`)}`, err);
		if (global.dashboardLogStream) {
			global.dashboardLogStream(`[ERROR] ${err}`);
		}
	}
}

module.exports = {
	err: logError,
	error: logError,
	warn: function (prefix, message) {
		if (message === undefined) {
			message = prefix;
			prefix = "WARN";
		}
		console.log(`${getCurrentTime()} ${colors.yellowBright(`${characters} ${prefix}:`)}`, message);
		if (global.dashboardLogStream) {
			global.dashboardLogStream(`[WARN] ${prefix}: ${message}`);
		}
	},
	info: function (prefix, message) {
		if (message === undefined) {
			message = prefix;
			prefix = "INFO";
		}
		console.log(`${getCurrentTime()} ${colors.greenBright(`${characters} ${prefix}:`)}`, message);
		if (global.dashboardLogStream) {
			global.dashboardLogStream(`[INFO] ${prefix}: ${message}`);
		}
	},
	success: function (prefix, message) {
		if (message === undefined) {
			message = prefix;
			prefix = "SUCCES";
		}
		console.log(`${getCurrentTime()} ${colors.cyanBright(`${characters} ${prefix}:`)}`, message);
		if (global.dashboardLogStream) {
			global.dashboardLogStream(`[SUCCESS] ${prefix}: ${message}`);
		}
	},
	master: function (prefix, message) {
		if (message === undefined) {
			message = prefix;
			prefix = "MASTER";
		}
		console.log(`${getCurrentTime()} ${colors.hex("#eb6734", `${characters} ${prefix}:`)}`, message);
		if (global.dashboardLogStream) {
			global.dashboardLogStream(`[MASTER] ${prefix}: ${message}`);
		}
	},
	dev: (...args) => {
		try {
			throw new Error();
		}
		catch (err) {
			const at = err.stack.split('\n')[2];
			let position = at.slice(at.indexOf(process.cwd()) + process.cwd().length + 1);
			position.endsWith(')') ? position = position.slice(0, -1) : null;
			console.log(`\x1b[36m${position} =>\x1b[0m`, ...args);
			if (global.dashboardLogStream) {
				global.dashboardLogStream(`[DEV] ${position} => ${args.join(' ')}`);
			}
		}
	}
};