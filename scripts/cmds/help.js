const fs = require('fs');
const path = require('path');

module.exports = {
	config: {
		name: "help",
		version: "2.4.50",
		role: 0,
		countDown: 0,
		author: "ST | Sheikh Tamim",
		description: "Displays all available commands and their categories.",
		category: "help",
		premium: true
	},

	ST: async ({ api, event, args }) => {
		const cmdsFolderPath = path.join(__dirname, '.');
		const files = fs.readdirSync(cmdsFolderPath).filter(file => file.endsWith('.js'));

		const sendMessage = async (message, threadID) => {
			try {
				return await api.sendMessage(message, threadID);
			} catch (error) {
				console.error('Error sending message:', error);
			}
		};

		const getCategories = () => {
			const categories = {};
			for (const file of files) {
				const command = require(path.join(cmdsFolderPath, file));
				const { category } = command.config;


				const categoryName = category || 'uncategorized';
				if (!categories[categoryName]) categories[categoryName] = [];
				categories[categoryName].push(command.config.name);
			}
			return categories;
		};

		try {
			if (args.length > 1 && args.includes('|')) {

				const pipeIndex = args.indexOf('|');
				const categoryName = args.slice(pipeIndex + 1).join(' ').toLowerCase(); // Get the category name after '|'
				const categories = getCategories();


				const category = Object.keys(categories).find(cat => cat.toLowerCase() === categoryName);

				if (category) {

					const commandCount = categories[category].length;
					let categoryHelpMessage = `╭──『 ${category} 』\n`;
					categoryHelpMessage += `✧${categories[category].join(' ✧ ')}\n`;
					categoryHelpMessage += "╰───────────◊\n";
					categoryHelpMessage += `(Total ${category}: ${commandCount} commands)`;

					await sendMessage(categoryHelpMessage, event.threadID);
				} else {

					await sendMessage(`Category not found: ${categoryName}`, event.threadID);
				}
			} else {

				if (args[0]) {
					const commandName = args[0].toLowerCase();
					const command = files.map(file => require(path.join(cmdsFolderPath, file)))
						.find(cmd => cmd.config.name.toLowerCase() === commandName || (cmd.config.aliases && cmd.config.aliases.includes(commandName)));

					if (command) {
						// Display enhanced command details with better design
						let commandDetails = `╭─────────────────────◊\n`;
						commandDetails += `│  🔹 COMMAND DETAILS\n`;
						commandDetails += `├─────────────────────◊\n`;
						commandDetails += `│ ⚡ Name: ${command.config.name}\n`;
						commandDetails += `│ 📝 Version: ${command.config.version || 'N/A'}\n`;
						commandDetails += `│ 👤 Author: ${command.config.author || 'Unknown'}\n`;
						commandDetails += `│ 🔐 Role: ${command.config.role !== undefined ? command.config.role : 'N/A'}\n`;
						commandDetails += `│ 📂 Category: ${command.config.category || 'uncategorized'}\n`;
						commandDetails += `│ 💎 Premium: ${command.config.premium == true ? '✅ Required' : '❌ Not Required'}\n`;

						if (command.config.aliases && command.config.aliases.length > 0) {
							commandDetails += `│ 🔄 Aliases: ${command.config.aliases.join(', ')}\n`;
						}

						if (command.config.countDown !== undefined) {
							commandDetails += `│ ⏱️ Cooldown: ${command.config.countDown}s\n`;
						}

						commandDetails += `├─────────────────────◊\n`;

						// Description
						if (command.config.description) {
							const desc = typeof command.config.description === 'string' ? command.config.description : command.config.description.en || 'No description available';
							commandDetails += `│ 📋 Description:\n│ ${desc}\n├─────────────────────◊\n`;
						}

						// Short Description
						if (command.config.shortDescription) {
							const shortDesc = typeof command.config.shortDescription === 'string' ? command.config.shortDescription : command.config.shortDescription.en || '';
							if (shortDesc) {
								commandDetails += `│ 📄 Short Description:\n│ ${shortDesc}\n├─────────────────────◊\n`;
							}
						}

						// Long Description
						if (command.config.longDescription) {
							const longDesc = typeof command.config.longDescription === 'string' ? command.config.longDescription : command.config.longDescription.en || '';
							if (longDesc) {
								commandDetails += `│ 📖 Long Description:\n│ ${longDesc}\n├─────────────────────◊\n`;
							}
						}

						// Guide/Usage
						const guideText = command.config.guide ? (typeof command.config.guide === 'string' ? command.config.guide : command.config.guide.en || 'No guide available') : 'No guide available';
						commandDetails += `│ 📚 Usage Guide:\n│ ${guideText.replace(/{pn}/g, `/${command.config.name}`)}\n`;

						commandDetails += `╰─────────────────────◊\n`;
						commandDetails += `     💫 ST_BOT Command Info`;

						await sendMessage(commandDetails, event.threadID);
					} else {
						await sendMessage(`❌ Command not found: ${commandName}`, event.threadID);
					}
				} else {
					// Generate general help message
					const categories = getCategories();
					let helpMessage = '';

					for (const category in categories) {
						const commandCount = categories[category].length;
						helpMessage += `╭──『 ${category.toUpperCase()} 』\n`;
						helpMessage += `✧${categories[category].join(' ✧ ')}\n`;
						helpMessage += "╰───────────◊\n";
						helpMessage += `(Total ${category}: ${commandCount} commands)\n\n`;
					}

					helpMessage += "╭────────────◊\n";
					helpMessage += "│ » Type [ /help <cmd> ]\n";
					helpMessage += "│ to learn the usage.\n";
					helpMessage += "│ » Type [ /help | category ]\n";
					helpMessage += "│ to see category commands.\n";
					helpMessage += "│ » Owner Contact:\n";
					helpMessage += "│ » m.me/tormairedusi\n";
					helpMessage += "╰────────◊\n";
					helpMessage += "          「 ST_BOT😗 」";

					await sendMessage(helpMessage, event.threadID);
				}
			}
		} catch (error) {
			console.error('Error generating help message:', error);
			await sendMessage('An error occurred while generating the help message.', event.threadID);
		}
	}
};