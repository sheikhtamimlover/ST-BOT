
const { getPrefix } = global.utils;

module.exports = {
    config: {
        name: "note",
        aliases: [],
        version: "2.4.73",
        author: "Sheikh Tamim",
        countDown: 3,
        role: 2,
        description: "Advanced Facebook Messenger notes management with enhanced features",
        category: "owner",
        guide: {
            en: "{pn} create <text> [options] - Create note with options\n{pn} check - Check current note with details\n{pn} update <noteID> <text> - Update existing note\n{pn} delete <noteID> - Delete note with confirmation\n{pn} schedule <text> <hours> - Create note with custom duration\n\nOptions: --privacy=FRIENDS|EVERYONE --duration=hours"
        }
    },

    ST: async function ({ message, args, api, event }) {
        const action = args[0];

        if (!action) {
            return message.reply(`🚀 Advanced Note Commands:\n\n• ${getPrefix(event.threadID)}note create <text> [--privacy=FRIENDS] - Create note\n• ${getPrefix(event.threadID)}note check - Check note with details\n• ${getPrefix(event.threadID)}note update <id> <text> - Update note\n• ${getPrefix(event.threadID)}note delete <id> - Delete note\n• ${getPrefix(event.threadID)}note schedule <text> <hours> - Custom duration\n\n🔧 Advanced features: Enhanced validation, character counting, expiry tracking`);
        }

        try {
            // Check if note is available
            if (!api.note) {
                return message.reply("❌ Enhanced note features not available. Please ensure note.js is properly loaded.");
            }

            switch (action.toLowerCase()) {
                case "create": {
                    const noteArgs = args.slice(1);
                    if (noteArgs.length === 0) {
                        return message.reply("❌ Please provide text for the note!\n💡 Example: note create Hello world --privacy=FRIENDS");
                    }

                    // Parse options
                    let noteText = "";
                    let privacy = "FRIENDS";
                    let duration = 86400; // 24 hours default

                    for (let i = 0; i < noteArgs.length; i++) {
                        const arg = noteArgs[i];
                        if (arg.startsWith("--privacy=")) {
                            privacy = arg.split("=")[1].toUpperCase();
                        } else if (arg.startsWith("--duration=")) {
                            const hours = parseInt(arg.split("=")[1]);
                            if (!isNaN(hours) && hours > 0 && hours <= 168) { // Max 7 days
                                duration = hours * 3600;
                            }
                        } else {
                            noteText += arg + " ";
                        }
                    }

                    noteText = noteText.trim();
                    if (!noteText) {
                        return message.reply("❌ Please provide text for the note!");
                    }



                    const result = await new Promise((resolve, reject) => {
                        api.note.createAdvanced(noteText, { privacy, duration }, (err, data) => {
                            if (err) reject(err);
                            else resolve(data);
                        });
                    });

                    let responseText = `✅ Enhanced Note Created!\n\n📝 Note ID: ${result.id}\n📄 Text: ${noteText}\n📊 Characters: ${result.characterCount}/280\n🔒 Privacy: ${privacy}\n⏰ Duration: ${duration/3600} hours`;

                    if (result.expiresAt) {
                        responseText += `\n📅 Expires: ${new Date(result.expiresAt).toLocaleString()}`;
                    }

                    return message.reply(responseText);
                }

                case "check": {


                    const result = await new Promise((resolve, reject) => {
                        api.note.checkAdvanced((err, data) => {
                            if (err) reject(err);
                            else resolve(data);
                        });
                    });

                    if (!result.hasActiveNote) {
                        return message.reply(`📝 No Active Note Found\n\n👤 User ID: ${result.userId}\n🕒 Checked at: ${new Date(result.timestamp).toLocaleString()}\n\n💡 Use "${getPrefix(event.threadID)}note create <text>" to create a new note`);
                    }

                    const note = result.note;
                    const timeLeft = result.expiresAt ? Math.max(0, result.expiresAt - Date.now()) : 0;
                    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
                    const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

                    let responseText = `📝 Current Active Note:\n\n🆔 ID: ${note.id}\n📄 Text: ${note.description}\n🔒 Privacy: ${note.privacy}\n⏰ Created: ${new Date(note.created_time * 1000).toLocaleString()}`;

                    if (result.expiresAt) {
                        responseText += `\n📅 Expires: ${new Date(result.expiresAt).toLocaleString()}`;
                        if (timeLeft > 0) {
                            responseText += `\n⏳ Time left: ${hoursLeft}h ${minutesLeft}m`;
                        }
                    }

                    return message.reply(responseText);
                }

                case "update": {
                    const noteID = args[1];
                    const newText = args.slice(2).join(" ");

                    if (!noteID || !newText) {
                        return message.reply("❌ Please provide both note ID and new text!\n💡 Example: note update <noteID> <new text>");
                    }



                    const result = await new Promise((resolve, reject) => {
                        api.note.update(noteID, newText, (err, data) => {
                            if (err) reject(err);
                            else resolve(data);
                        });
                    });

                    return message.reply(`✅ Note Updated Successfully!\n\n🆔 New Note ID: ${result.created.id}\n📄 New Text: ${newText}\n📊 Characters: ${newText.length}/280\n⏰ Updated: ${new Date(result.updatedAt).toLocaleString()}`);
                }

                case "delete": {
                    const noteID = args[1];
                    if (!noteID) {
                        return message.reply("❌ Please provide the note ID to delete!\n💡 Example: note delete <noteID>");
                    }



                    const result = await new Promise((resolve, reject) => {
                        api.note.deleteAdvanced(noteID, (err, data) => {
                            if (err) reject(err);
                            else resolve(data);
                        });
                    });

                    return message.reply(`✅ Note Deleted Successfully!\n\n🗑️ Note ID: ${noteID}\n⏰ Deleted at: ${new Date(result.deletedAt).toLocaleString()}`);
                }

                case "schedule": {
                    const noteText = args.slice(1, -1).join(" ");
                    const hours = parseInt(args[args.length - 1]);

                    if (!noteText || isNaN(hours) || hours <= 0 || hours > 168) {
                        return message.reply("❌ Invalid input!\n💡 Example: note schedule Hello world 12\n⚠️ Duration must be between 1-168 hours (7 days max)");
                    }



                    const duration = hours * 3600; // Convert to seconds
                    const result = await new Promise((resolve, reject) => {
                        api.note.createAdvanced(noteText, { duration }, (err, data) => {
                            if (err) reject(err);
                            else resolve(data);
                        });
                    });

                    return message.reply(`✅ Scheduled Note Created!\n\n📝 Note ID: ${result.id}\n📄 Text: ${noteText}\n⏰ Duration: ${hours} hours\n📅 Expires: ${new Date(result.expiresAt).toLocaleString()}\n📊 Characters: ${result.characterCount}/280`);
                }

                default:
                    return message.reply("❌ Invalid action! Use: create, check, update, delete, or schedule");
            }
        } catch (error) {
            console.error("NotesV2 Error:", error);
            return message.reply(`❌ An error occurred: ${error.message}\n\n💡 Tips:\n• Check if the note ID is correct\n• Ensure text is under 280 characters\n• Verify your account has permission to create notes`);
        }
    }
};