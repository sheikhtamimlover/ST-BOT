
const fs = require("fs-extra");
const path = require("path");

module.exports = {
	config: {
		name: "cmdconfig",
		aliases: ["cc"],
		version: "2.4.60",
		author: "ST | Sheikh Tamim",
		countDown: 5,
		role: 2, // Admin only
		description: "Dynamically modify command configurations",
		category: "owner",
		guide: {
			en: "   {pn} <command> <property>: <value> - Set a property"
				+ "\n   {pn} -r <command> <property> - Remove a property (only premium and usePrefix)"
				+ "\n   {pn} <command> info - Show current command config"
				+ "\n\nAvailable properties:"
				+ "\n   • name: Command name"
				+ "\n   • aliases: Command aliases (array)"
				+ "\n   • role: Required role (0-2)"
				+ "\n   • guide: Command guide"
				+ "\n   • description: Command description"
				+ "\n   • category: Command category"
				+ "\n   • premium: Premium requirement (true/false)"
				+ "\n   • usePrefix: Prefix requirement (true/false)"
				+ "\n\nExamples:"
				+ "\n   {pn} flux premium: true"
				+ "\n   {pn} flux role: 1"
				+ "\n   {pn} flux aliases: [\"fl\", \"generate\"]"
				+ "\n   {pn} -r flux premium"
		}
	},

	ST: async function ({ message, args, getLang, api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData }) {
		if (!args[0]) {
			return message.reply("Please specify a command name. Use: cmdconfig <command> <property>: <value>");
		}

		const { loadScripts } = global.utils;
		const { configCommands } = global.GoatBot;
		
		// Check if it's a remove operation
		const isRemove = args[0] === "-r";
		const commandName = isRemove ? args[1] : args[0];
		const commandArgs = isRemove ? args.slice(2) : args.slice(1);

		if (!commandName) {
			return message.reply("Please specify a command name.");
		}

		// Check if showing info
		if (commandArgs[0] === "info") {
			const cmdPath = path.join(__dirname, `${commandName}.js`);
			if (!fs.existsSync(cmdPath)) {
				return message.reply(`❌ Command "${commandName}" not found.`);
			}

			try {
				delete require.cache[require.resolve(cmdPath)];
				const cmd = require(cmdPath);
				const config = cmd.config;
				
				let info = `📋 **Command Configuration: ${commandName}**\n\n`;
				info += `📝 Name: ${config.name || "Not set"}\n`;
				info += `🏷️ Aliases: ${config.aliases ? JSON.stringify(config.aliases) : "None"}\n`;
				info += `👤 Role: ${config.role !== undefined ? config.role : "Not set"}\n`;
				info += `📂 Category: ${config.category || "Not set"}\n`;
				info += `💎 Premium: ${config.premium !== undefined ? config.premium : "Not set"}\n`;
				info += `🔗 UsePrefix: ${config.usePrefix !== undefined ? config.usePrefix : "Not set"}\n`;
				info += `📖 Description: ${config.description || "Not set"}\n`;
				info += `📚 Guide: ${config.guide ? "Set" : "Not set"}`;

				return message.reply(info);
			} catch (error) {
				return message.reply(`❌ Error reading command: ${error.message}`);
			}
		}

		const cmdPath = path.join(__dirname, `${commandName}.js`);
		if (!fs.existsSync(cmdPath)) {
			return message.reply(`❌ Command "${commandName}" not found.`);
		}

		try {
			// Read the command file
			let fileContent = fs.readFileSync(cmdPath, "utf8");
			
			if (isRemove) {
				// Remove operation - only allow premium and usePrefix
				const propertyToRemove = commandArgs[0];
				
				if (!["premium", "usePrefix"].includes(propertyToRemove)) {
					return message.reply("❌ Only 'premium' and 'usePrefix' properties can be removed.");
				}

				// Remove the property from the config
				const configRegex = /config:\s*{([^}]+)}/s;
				const configMatch = fileContent.match(configRegex);
				
				if (!configMatch) {
					return message.reply("❌ Could not find config object in command file.");
				}

				let configContent = configMatch[1];
				
				// Remove the property and its trailing comma/newline
				const propertyRegex = new RegExp(`\\s*${propertyToRemove}:\\s*[^,\\n]*[,\\n]?`, 'g');
				configContent = configContent.replace(propertyRegex, '');
				
				// Clean up any trailing commas before closing braces
				configContent = configContent.replace(/,(\s*})/, '$1').replace(/,(\s*$)/, '$1');
				
				const newConfig = `config: {${configContent}}`;
				fileContent = fileContent.replace(configRegex, newConfig);
				
				fs.writeFileSync(cmdPath, fileContent);
				
				// Reload the command
				const infoLoad = loadScripts("cmds", commandName, console.log, configCommands, api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getLang);
				
				if (infoLoad.status === "success") {
					return message.reply(`✅ Successfully removed '${propertyToRemove}' from command "${commandName}" and reloaded.`);
				} else {
					return message.reply(`❌ Property removed but failed to reload command: ${infoLoad.error.message}`);
				}
			} else {
				// Set operation
				const propertyString = commandArgs.join(" ");
				const colonIndex = propertyString.indexOf(":");
				
				if (colonIndex === -1) {
					return message.reply("❌ Invalid format. Use: <property>: <value>");
				}
				
				const property = propertyString.substring(0, colonIndex).trim();
				let value = propertyString.substring(colonIndex + 1).trim();
				
				const allowedProperties = ["name", "aliases", "role", "guide", "description", "category", "premium", "usePrefix"];
				
				if (!allowedProperties.includes(property)) {
					return message.reply(`❌ Invalid property. Allowed: ${allowedProperties.join(", ")}`);
				}

				// Parse the value based on property type
				try {
					if (property === "premium" || property === "usePrefix") {
						if (value.toLowerCase() === "true") value = true;
						else if (value.toLowerCase() === "false") value = false;
						else throw new Error("Boolean values must be 'true' or 'false'");
					} else if (property === "role") {
						value = parseInt(value);
						if (isNaN(value) || value < 0 || value > 2) {
							throw new Error("Role must be 0, 1, or 2");
						}
					} else if (property === "aliases") {
						// Try to parse as JSON array
						if (value.startsWith("[") && value.endsWith("]")) {
							value = JSON.parse(value);
						} else {
							// Single alias
							value = [value.replace(/"/g, "")];
						}
					} else if (property === "guide" || property === "description") {
						// Remove quotes if present
						value = value.replace(/^["']|["']$/g, "");
					}
				} catch (parseError) {
					return message.reply(`❌ Invalid value format: ${parseError.message}`);
				}

				// Modify the config in the file
				const configRegex = /config:\s*{([^}]+)}/s;
				const configMatch = fileContent.match(configRegex);
				
				if (!configMatch) {
					return message.reply("❌ Could not find config object in command file.");
				}

				let configContent = configMatch[1];
				
				// Check if property already exists
				const existingPropertyRegex = new RegExp(`(\\s*${property}:\\s*)[^,\\n}]*`, 'g');
				const propertyExists = existingPropertyRegex.test(configContent);
				
				let newPropertyValue;
				if (typeof value === "string") {
					newPropertyValue = `"${value}"`;
				} else if (Array.isArray(value)) {
					newPropertyValue = JSON.stringify(value);
				} else {
					newPropertyValue = value;
				}
				
				if (propertyExists) {
					// Replace existing property
					configContent = configContent.replace(existingPropertyRegex, `$1${newPropertyValue}`);
				} else {
					// Add new property at the end
					// Remove any trailing whitespace and commas
					configContent = configContent.trim();
					if (configContent && !configContent.endsWith(',')) {
						configContent += ',';
					}
					configContent += `\n\t\t${property}: ${newPropertyValue}`;
				}
				
				const newConfig = `config: {${configContent}\n\t}`;
				fileContent = fileContent.replace(configRegex, newConfig);
				
				fs.writeFileSync(cmdPath, fileContent);
				
				// Reload the command
				const infoLoad = loadScripts("cmds", commandName, console.log, configCommands, api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, getLang);
				
				if (infoLoad.status === "success") {
					return message.reply(`✅ Successfully updated '${property}' for command "${commandName}" and reloaded.`);
				} else {
					return message.reply(`❌ Property updated but failed to reload command: ${infoLoad.error.message}`);
				}
			}
			
		} catch (error) {
			return message.reply(`❌ Error modifying command: ${error.message}`);
		}
	}
};
