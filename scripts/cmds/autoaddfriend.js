
module.exports = {
    config: {
        name: "autoaddfriend",
        aliases: [],
        version: "2.4.74",
        author: "ST",
        countDown: 5,
        role: 2,
        shortDescription: {
            en: "Auto send friend requests to suggested users"
        },
        description: {
            en: "Automatically send friend requests to suggested users from Facebook's People You May Know"
        },
        category: "owner",
        guide: {
            en: "{pn} start - Start auto sending friend requests\n{pn} stop - Stop auto sending friend requests\n{pn} status - Check current status"
        }
    },

    ST: async function ({ api, message, args, getLang }) {
        const command = args[0]?.toLowerCase();

        // Check status
        if (command === "status") {
            const status = global.autoAddFriendStatus || { running: false, sent: 0, failed: 0, successList: [], failedList: [] };
            if (!status.running && status.sent === 0 && status.failed === 0) {
                return message.reply("📊 Auto Add Friend is not running and has no history.");
            }

            let statusMsg = `📊 Status: ${status.running ? "Running" : "Stopped"}\n`;
            statusMsg += `✅ Sent: ${status.sent} | ❌ Failed: ${status.failed}\n`;
            
            if (status.successList && status.successList.length > 0) {
                statusMsg += `\n✅ Success List:\n`;
                status.successList.slice(0, 10).forEach((user, idx) => {
                    statusMsg += `${idx + 1}. ${user.name}\n`;
                });
                if (status.successList.length > 10) {
                    statusMsg += `...and ${status.successList.length - 10} more\n`;
                }
            }

            if (status.failedList && status.failedList.length > 0) {
                statusMsg += `\n❌ Failed List:\n`;
                status.failedList.slice(0, 10).forEach((user, idx) => {
                    statusMsg += `${idx + 1}. ${user.name} - ${user.reason}\n`;
                });
                if (status.failedList.length > 10) {
                    statusMsg += `...and ${status.failedList.length - 10} more\n`;
                }
            }

            return message.reply(statusMsg);
        }

        // Stop auto adding
        if (command === "stop") {
            if (!global.autoAddFriendStatus || !global.autoAddFriendStatus.running) {
                return message.reply("❌ Auto add friend is not running.");
            }

            global.autoAddFriendStatus.running = false;
            const status = global.autoAddFriendStatus;
            
            let stopMsg = `⏹️ Stopped\n✅ Sent: ${status.sent} | ❌ Failed: ${status.failed}\n`;
            
            if (status.successList && status.successList.length > 0) {
                stopMsg += `\n✅ Success:\n`;
                status.successList.forEach((user, idx) => {
                    stopMsg += `${idx + 1}. ${user.name}\n`;
                });
            }

            if (status.failedList && status.failedList.length > 0) {
                stopMsg += `\n❌ Failed:\n`;
                status.failedList.forEach((user, idx) => {
                    stopMsg += `${idx + 1}. ${user.name} - ${user.reason}\n`;
                });
            }

            return message.reply(stopMsg);
        }

        // Start auto adding
        if (command === "start") {
            if (global.autoAddFriendStatus && global.autoAddFriendStatus.running) {
                return message.reply("⚠️ Already running. Use 'autoaddfriend stop' first.");
            }

            // Initialize status
            global.autoAddFriendStatus = {
                running: true,
                sent: 0,
                failed: 0,
                successList: [],
                failedList: [],
                lastError: null
            };

            message.reply("🚀 Auto add friend started. Processing...");

            let cursor = null;
            const status = global.autoAddFriendStatus;

            const sendNextBatch = async () => {
                if (!status.running) {
                    return;
                }

                try {
                    // Get suggested friends
                    const suggestions = await new Promise((resolve, reject) => {
                        api.suggestFriend(30, cursor, (err, data) => {
                            if (err) return reject(err);
                            resolve(data);
                        });
                    });

                    if (!suggestions.suggestions || suggestions.suggestions.length === 0) {
                        status.running = false;
                        return sendSummary();
                    }

                    // Filter only users who can receive friend requests
                    const canSendTo = suggestions.suggestions.filter(u => u.friendshipStatus === "CAN_REQUEST");

                    if (canSendTo.length === 0) {
                        if (suggestions.hasNextPage) {
                            cursor = suggestions.endCursor;
                            setTimeout(sendNextBatch, 2000);
                        } else {
                            status.running = false;
                            return sendSummary();
                        }
                        return;
                    }

                    // Send friend requests one by one
                    for (const user of canSendTo) {
                        if (!status.running) {
                            return;
                        }

                        try {
                            const result = await new Promise((resolve, reject) => {
                                api.sendFriendRequest(user.id, (err, result) => {
                                    if (err) return reject(err);
                                    resolve(result);
                                });
                            });

                            status.sent++;
                            status.successList.push({ name: user.name, id: user.id });

                            // Random delay between 3-7 seconds
                            await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 4000));

                        } catch (err) {
                            status.failed++;
                            const errorMsg = err.errorDescription || err.errorSummary || err.error || err.message || "Unknown error";
                            status.failedList.push({ name: user.name, id: user.id, reason: errorMsg });
                            
                            // Check if it's a login/limit error
                            if (err.error === 'Not logged in.' || err.error === 1357001 || errorMsg.includes('लॉगिन') || errorMsg.includes('login')) {
                                status.running = false;
                                status.lastError = "Facebook blocked: Login required or rate limit reached";
                                return sendSummary(true);
                            }
                        }
                    }

                    // Move to next page if available
                    if (suggestions.hasNextPage && status.running) {
                        cursor = suggestions.endCursor;
                        setTimeout(sendNextBatch, 5000);
                    } else {
                        status.running = false;
                        return sendSummary();
                    }

                } catch (error) {
                    status.running = false;
                    status.lastError = error.error || error.message || "Unknown error";
                    return sendSummary(true);
                }
            };

            const sendSummary = (isError = false) => {
                let summaryMsg = isError ? `⚠️ Stopped due to error\n` : `✅ Completed\n`;
                summaryMsg += `✅ Sent: ${status.sent} | ❌ Failed: ${status.failed}\n`;

                if (status.successList.length > 0) {
                    summaryMsg += `\n✅ Success:\n`;
                    status.successList.forEach((user, idx) => {
                        summaryMsg += `${idx + 1}. ${user.name}\n`;
                    });
                }

                if (status.failedList.length > 0) {
                    summaryMsg += `\n❌ Failed:\n`;
                    status.failedList.forEach((user, idx) => {
                        summaryMsg += `${idx + 1}. ${user.name} - ${user.reason}\n`;
                    });
                }

                if (isError && status.lastError) {
                    summaryMsg += `\n⚠️ Error: ${status.lastError}`;
                }

                message.reply(summaryMsg);
            };

            // Start sending
            sendNextBatch();

        } else {
            return message.reply("Usage:\n• autoaddfriend start\n• autoaddfriend stop\n• autoaddfriend status");
        }
    }
};