const { getTime, drive } = global.utils;
if (!global.temp.welcomeEvent)
	global.temp.welcomeEvent = {};

module.exports = {
	config: {
		name: "welcome",
		version: "2.3.6",
		author: "ST",
		category: "events"
	},

	langs: {
		vi: {
			session1: "sáng",
			session2: "trưa",
			session3: "chiều",
			session4: "tối",
			welcomeMessage: "Cảm ơn bạn đã mời tôi vào nhóm!\nPrefix bot: %1\nĐể xem danh sách lệnh hãy nhập: %1help",
			multiple1: "bạn",
			multiple2: "các bạn",
			defaultWelcomeMessage: "Xin chào {userName}.\nChào mừng bạn đến với {boxName}.\nChúc bạn có buổi {session} vui vẻ!"
		},
		en: {
			session1: "morning",
			session2: "noon",
			session3: "afternoon",
			session4: "evening",
			welcomeMessage: "Thank you for inviting me to the group!\nBot prefix: %1\nTo view the list of commands, please enter: %1help",
			multiple1: "you",
			multiple2: "you guys",
			defaultWelcomeMessage: `Hello {userName}.\nWelcome {multiple} to the chat group: {boxName}\nHave a nice {session} 😊`
		}
	},

	onStart: async ({ threadsData, message, event, api, getLang, usersData }) => {
		if (event.logMessageType == "log:subscribe")
			return async function () {
				const hours = getTime("HH");
				const { threadID } = event;
				const { nickNameBot } = global.GoatBot.config;
				const prefix = global.utils.getPrefix(threadID);
				const dataAddedParticipants = event.logMessageData.addedParticipants;
				// if new member is bot
				if (dataAddedParticipants.some((item) => item.userFbId == api.getCurrentUserID())) {
					if (nickNameBot)
						api.changeNickname(nickNameBot, threadID, api.getCurrentUserID());
					
					// Check if thread approval system is enabled
					const { threadApproval } = global.GoatBot.config;
					if (threadApproval && threadApproval.enable) {
						try {
							// Check if this thread is in the auto-approved list
							const isAutoApprovedThread = threadApproval.autoApprovedThreads && threadApproval.autoApprovedThreads.includes(threadID);
							
							if (isAutoApprovedThread) {
								// Auto-approve the thread
								await threadsData.set(threadID, { approved: true });
								console.log(`Auto-approved thread ${threadID} from autoApprovedThreads list`);
								
								// Send welcome message for auto-approved threads
								setTimeout(async () => {
									try {
										await api.sendMessage(getLang("welcomeMessage", prefix), threadID);
									} catch (err) {
										console.error(`Failed to send welcome message to auto-approved thread ${threadID}:`, err.message);
									}
								}, 2000);
								return null;
							}
							
							// Always set new threads as unapproved (if not auto-approved)
							await threadsData.set(threadID, { approved: false });
							
							// Send notification to admin notification threads
							if (threadApproval.adminNotificationThreads && threadApproval.adminNotificationThreads.length > 0 && threadApproval.sendNotifications !== false) {
								setTimeout(async () => {
									try {
										let threadInfo = { threadName: "Unknown", participantIDs: [] };
										let addedByName = "Unknown";
										
										// Get thread info with better error handling
										try {
											// First try to get from threadsData (more reliable)
											try {
												const threadData = await threadsData.get(threadID);
												if (threadData && threadData.threadName && threadData.threadName !== "Unknown") {
													threadInfo.threadName = threadData.threadName;
													threadInfo.participantIDs = threadData.members || [];
												} else {
													throw new Error("threadsData returned unknown or empty");
												}
											} catch (threadsDataErr) {
												// Fallback to API call
												await new Promise(resolve => setTimeout(resolve, 3000));
												const info = await api.getThreadInfo(threadID);
												if (info && info.threadName) {
													threadInfo = info;
												} else {
													threadInfo.threadName = `Thread ${threadID}`;
													threadInfo.participantIDs = [];
												}
											}
										} catch (err) {
											console.error(`Failed to get thread info for ${threadID}:`, err.message);
											threadInfo.threadName = `Thread ${threadID}`;
											threadInfo.participantIDs = [];
										}
										
										// Get user info with better error handling - use event.author like in w.js and logsbot.js
										try {
											if (event.author) {
												// Use the same pattern as logsbot.js which works correctly
												addedByName = await usersData.getName(event.author);
												if (!addedByName || addedByName === "Unknown") {
													// Fallback to API call if getName fails
													try {
														const userInfo = await api.getUserInfo(event.author);
														if (userInfo && userInfo[event.author] && userInfo[event.author].name) {
															addedByName = userInfo[event.author].name;
														} else {
															addedByName = `User ${event.author}`;
														}
													} catch (apiErr) {
														addedByName = `User ${event.author}`;
													}
												}
											}
										} catch (err) {
											console.error(`Failed to get user info:`, err.message);
											addedByName = "Unknown User";
										}
										
										const notificationMessage = `🔔 BOT ADDED TO NEW THREAD 🔔\n\n` +
											`📋 Thread Name: ${threadInfo.threadName || "Unknown"}\n` +
											`🆔 Thread ID: ${threadID}\n` +
											`👤 Added by: ${addedByName}\n` +
											`👥 Members: ${threadInfo.participantIDs?.length || 0}\n` +
											`⏰ Time: ${new Date().toLocaleString()}\n\n` +
											`⚠️ This thread is NOT APPROVED. Bot will not respond to any commands.\n` +
											`Use "${prefix}mthread" to manage thread approvals.`;
										
										for (let i = 0; i < threadApproval.adminNotificationThreads.length; i++) {
											const notifyThreadID = threadApproval.adminNotificationThreads[i];
											try {
												if (i > 0) await new Promise(resolve => setTimeout(resolve, 1500));
												await api.sendMessage(notificationMessage, notifyThreadID);
											} catch (err) {
												console.error(`Failed to send notification to thread ${notifyThreadID}:`, err.message);
											}
										}
									} catch (err) {
										console.error(`Failed to send notifications:`, err.message);
									}
								}, 5000);
							}
							
							// Send warning message to the new thread if enabled
							if (threadApproval.sendThreadMessage !== false) {
								// Use setTimeout to avoid immediate API conflicts after bot addition
								setTimeout(async () => {
									try {
										// Wait longer before sending to thread to ensure it's ready
										await new Promise(resolve => setTimeout(resolve, 5000));
										const warningMessage = `⚠️ This thread is not approved yet. Bot will not respond to any commands until approved by an admin.\n\nUse "${prefix}help" after approval to see available commands.`;
										await api.sendMessage(warningMessage, threadID);
									} catch (err) {
										// Check if it's a thread disabled error and handle silently
										if (err.error === 1545116 || err.errorSummary === 'Thread disabled') {
											console.log(`Thread ${threadID} is disabled, skipping approval message`);
										} else {
											console.error(`Failed to send approval message to thread ${threadID}:`, err.message);
										}
									}
								}, 10000); // 10 second delay for thread message
							}
							
							return null; // Don't send welcome message for unapproved threads
						} catch (err) {
							console.error(`Thread approval system error:`, err.message);
							// Continue with normal welcome if approval system fails
						}
					}
					
					// Use setTimeout to avoid immediate API conflicts
					setTimeout(async () => {
						try {
							await api.sendMessage(getLang("welcomeMessage", prefix), threadID);
						} catch (err) {
							console.error(`Failed to send welcome message to thread ${threadID}:`, err.message);
						}
					}, 2000);
					return null;
				}
				// if new member:
				if (!global.temp.welcomeEvent[threadID])
					global.temp.welcomeEvent[threadID] = {
						joinTimeout: null,
						dataAddedParticipants: []
					};

				// push new member to array
				global.temp.welcomeEvent[threadID].dataAddedParticipants.push(...dataAddedParticipants);
				// if timeout is set, clear it
				clearTimeout(global.temp.welcomeEvent[threadID].joinTimeout);

				// set new timeout
				global.temp.welcomeEvent[threadID].joinTimeout = setTimeout(async function () {
					const threadData = await threadsData.get(threadID);
					if (threadData.settings.sendWelcomeMessage == false)
						return;
					const dataAddedParticipants = global.temp.welcomeEvent[threadID].dataAddedParticipants;
					const dataBanned = threadData.data.banned_ban || [];
					const threadName = threadData.threadName;
					const userName = [],
						mentions = [];
					let multiple = false;

					if (dataAddedParticipants.length > 1)
						multiple = true;

					for (const user of dataAddedParticipants) {
						if (dataBanned.some((item) => item.id == user.userFbId))
							continue;
						userName.push(user.fullName);
						mentions.push({
							tag: user.fullName,
							id: user.userFbId
						});
					}
					// {userName}:   name of new member
					// {multiple}:
					// {boxName}:    name of group
					// {threadName}: name of group
					// {session}:    session of day
					if (userName.length == 0) return;
					let { welcomeMessage = getLang("defaultWelcomeMessage") } =
						threadData.data;
					const form = {
						mentions: welcomeMessage.match(/\{userNameTag\}/g) ? mentions : null
					};
					welcomeMessage = welcomeMessage
						.replace(/\{userName\}|\{userNameTag\}/g, userName.join(", "))
						.replace(/\{boxName\}|\{threadName\}/g, threadName)
						.replace(
							/\{multiple\}/g,
							multiple ? getLang("multiple2") : getLang("multiple1")
						)
						.replace(
							/\{session\}/g,
							hours <= 10
								? getLang("session1")
								: hours <= 12
									? getLang("session2")
									: hours <= 18
										? getLang("session3")
										: getLang("session4")
						);

					form.body = welcomeMessage;

					if (threadData.data.welcomeAttachment) {
						const files = threadData.data.welcomeAttachment;
						const attachments = files.reduce((acc, file) => {
							acc.push(drive.getFile(file, "stream"));
							return acc;
						}, []);
						form.attachment = (await Promise.allSettled(attachments))
							.filter(({ status }) => status == "fulfilled")
							.map(({ value }) => value);
					}
					message.send(form);
					delete global.temp.welcomeEvent[threadID];
				}, 1500);
			};
	}
};
