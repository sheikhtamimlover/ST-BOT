module.exports = {
    config: {
        name: "metatheme",
        version: "2.4.70",
        author: "Sheikh Tamim",
        countDown: 5,
        role: 2,
        description: "Generate AI themes for messenger chat",
        category: "owner",
        guide: {
            en: "{pn} <prompt> - Generate AI theme based on your prompt\nExample: {pn} beautiful tropical beach"
        }
    },

    onReply: async function ({ message, Reply, event, api, args }) {
        const { author, themes, threadID, messageID } = Reply;

        // Handle both Messenger and potential other platforms
        const currentUserId = event.senderID || event.userID || (event.from && event.from.id);
        
        if (currentUserId !== author) {
            return message.reply("❌ Only the person who generated these themes can select one.");
        }

        const selection = parseInt(args[0]) || parseInt((event.body || event.text || "").trim());

        if (!selection || selection < 1 || selection > themes.length) {
            return message.reply(`❌ Invalid selection. Please reply with a number between 1 and ${themes.length}.`);
        }

        const selectedTheme = themes[selection - 1];

        try {
            // Unsend the previous message
            api.unsendMessage(messageID);


            await new Promise((resolve, reject) => {
                api.setThreadTheme(threadID, selectedTheme.themeId, (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                });
            });

            let successMsg = `✅ Successfully applied theme "${selectedTheme.name}"!\n`;
            successMsg += `🆔 Theme ID: ${selectedTheme.themeId}\n`;
            successMsg += `🎨 Primary Color: ${selectedTheme.colors.fallback}`;

            const attachments = [];
            if (selectedTheme.images.background) {
                try {
                    const stream = await global.utils.getStreamFromURL(selectedTheme.images.background);
                    attachments.push(stream);
                } catch (imgErr) {
                    console.log("Failed to load theme image:", imgErr);
                }
            }

            return message.reply(successMsg);

        } catch (error) {
            console.error("Theme setting error:", error);
            return message.reply(`❌ Failed to set theme: ${error.message || error}`);
        }
    },

    ST: async function ({ message, args, api, event }) {
        try {
            // Parse arguments for options
            let prompt = "";
            let numThemes = 1;
            let imageUrl = null;

            for (let i = 0; i < args.length; i++) {
                if (args[i] === "--n" && i + 1 < args.length) {
                    numThemes = parseInt(args[i + 1]) || 1;
                    i++; // Skip next arg as it's the number
                } else if (args[i] === "--img" && i + 1 < args.length) {
                    imageUrl = args[i + 1];
                    i++; // Skip next arg as it's the URL
                } else {
                    prompt += args[i] + " ";
                }
            }

            prompt = prompt.trim();

            if (!prompt) {
                return message.reply("❌ Please provide a prompt for theme generation!\n\nUsage:\n• Basic: !metatheme beautiful tropical beach\n• Multiple: !metatheme beautiful beach --n 3\n• With image: !metatheme ocean --img https://example.com/image.jpg");
            }

            // Limit number of themes
            numThemes = Math.min(Math.max(numThemes, 1), 5);

            message.reply(`🎨 Generating ${numThemes} AI theme${numThemes > 1 ? 's' : ''} based on your prompt... Please wait!`);

            const options = { numThemes };
            if (imageUrl) options.imageUrl = imageUrl;

            const result = await new Promise((resolve, reject) => {
                api.metaTheme(prompt, options, (err, data) => {
                    if (err) reject(err);
                    else resolve(data);
                });
            });

            if (result && result.success) {
                const themes = result.themes || [result];
                const attachments = [];

                let response = `🎨 AI Theme${themes.length > 1 ? 's' : ''} Generated Successfully!\n\n`;

                for (let i = 0; i < themes.length; i++) {
                    const theme = themes[i];
                    response += `${i + 1}. 📝 Name: ${theme.name}\n`;
                    response += `   🆔 ID: ${theme.themeId}\n`;
                    response += `   📋 Description: ${theme.description || "AI generated theme"}\n`;
                    response += `   🎨 Primary Color: ${theme.colors.fallback}\n`;

                    if (theme.images.background) {
                        response += `   🖼️ Background Image: Available\n`;
                        try {
                            const stream = await global.utils.getStreamFromURL(theme.images.background);
                            attachments.push(stream);
                        } catch (imgErr) {
                            console.log("Failed to load background image:", imgErr);
                        }
                    }

                    response += `\n`;
                }

                response += `💡 Reply with the serial number (1-${themes.length}) to set that theme\n`;
                response += `Example: Reply with "1" to set the first theme`;

                const replyMessage = await message.reply({
                    body: response,
                    attachment: attachments.length > 0 ? attachments : undefined
                });

                const currentUserId = event.senderID || event.userID || (event.from && event.from.id);
                const currentThreadId = event.threadID || event.threadId || (event.chat && event.chat.id);
                
                global.GoatBot.onReply.set(replyMessage.messageID, {
                    commandName: module.exports.config.name,
                    messageID: replyMessage.messageID,
                    author: currentUserId,
                    themes: themes,
                    threadID: currentThreadId
                });

                return replyMessage;
            } else {
                return message.reply("❌ Failed to generate AI theme. Please try with a different prompt.");
            }

        } catch (error) {
            console.error("MetaTheme Error:", error);

            let errorMsg = "❌ An error occurred while generating the theme.";

            if (error.error) {
                if (error.error.includes("not authorized") || error.error.includes("not support")) {
                    errorMsg = "❌ Your account does not support Meta AI theme generation. This feature may not be available for your account type.";
                } else if (error.error.includes("rate limit")) {
                    errorMsg = "❌ Rate limit exceeded. Please wait a moment before trying again.";
                } else {
                    errorMsg = `❌ ${error.error}`;
                }
            }

            return message.reply(errorMsg);
        }
    }
};