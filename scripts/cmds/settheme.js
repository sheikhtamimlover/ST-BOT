module.exports = {
    config: {
        name: "settheme",
        version: "2.4.70",
        author: "Sheikh Tamim",
        countDown: 3,
        role: 1,
        description: "Set thread theme for the chat",
        category: "box chat",
        guide: {
            en: "{pn} <themeID or color name> - Set theme for current chat\nExample: {pn} 196241301102133\n{pn} blue\n{pn} red"
        }
    },

    ST: async function ({ message, args, api, event }) {
        const themeInput = args.join(" ");

        if (!themeInput) {
            return message.reply("❌ Please provide a theme ID or color name!\n\nExamples:\n• !settheme 196241301102133\n• !settheme blue\n• !settheme red");
        }

        try {
            const result = await new Promise((resolve, reject) => {
                api.setThreadTheme(event.threadID, themeInput, (err, data) => {
                    if (err) reject(err);
                    else resolve(data);
                });
            });

            if (result && result.success) {
                return message.reply("✅ Theme set successfully!");
            } else {
                return message.reply("❌ Failed to set theme. Please check the theme ID or try a different theme.");
            }

        } catch (error) {
            console.error("SetTheme Error:", error);
            return message.reply("❌ An error occurred while setting the theme. Make sure you have admin permissions and the theme ID is valid.");
        }
    }
};