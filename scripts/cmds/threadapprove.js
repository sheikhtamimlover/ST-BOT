
const { getTime } = global.utils;

module.exports = {
	config: {
		name: "mthread",
		aliases: ["threadapprove", "tapprove"],
		version: "2.3.5",
		author: "Sheikh Tamim",
		countDown: 5,
		role: 2,
		description: "Manage thread approvals - list, approve, or reject threads",
		category: "Admin",
		guide: {
			en: "{pn} - Show pending threads with interactive menu\n{pn} list - Show all threads with approval status\n{pn} approved - Show only approved threads\n{pn} pending - Show only pending threads\n{pn} p <page> - Navigate pages\n{pn} a <numbers> - Approve specific threads\n{pn} r <numbers> - Reject specific threads\n{pn} auto - Auto approve all pending threads"
		}
	},

	langs: {
		en: {
			systemDisabled: "❌ Thread approval system is disabled in config.",
			pendingThreads: "📋 PENDING THREADS (Page %1/%2)\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n%3\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n💡 Reply commands:\n• 'a <numbers>' - Approve (e.g., 'a 1 2 3')\n• 'r <numbers>' - Reject (e.g., 'r 1 2')\n• 'p <page>' - Go to page (e.g., 'p 2')\n• 'approved' - Show approved threads\n• 'list' - Show all threads",
			allThreads: "📋 ALL THREADS (Page %1/%2)\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n%3\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n✅ = Approved | ❌ = Pending\n💡 Reply: 'p <page>' to navigate",
			approvedThreads: "✅ APPROVED THREADS (Page %1/%2)\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n%3\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n💡 Reply: 'p <page>' to navigate",
			noPendingThreads: "✅ No threads pending approval.",
			noApprovedThreads: "❌ No threads approved yet.",
			noThreads: "❌ No threads found.",
			threadApproved: "✅ Thread approved: %1 (ID: %2)",
			threadRejected: "❌ Thread rejected: %1 (ID: %2)",
			multipleApproved: "✅ Successfully approved %1 threads.",
			multipleRejected: "❌ Successfully rejected %1 threads.",
			autoApproveSuccess: "✅ Auto-approved %1 pending threads.",
			invalidNumbers: "❌ Invalid numbers: %1. Use numbers from the list above.",
			invalidPage: "❌ Invalid page number. Available pages: 1-%1",
			invalidReply: "❌ Invalid command. Use:\n• 'a <numbers>' - Approve\n• 'r <numbers>' - Reject\n• 'p <page>' - Go to page\n• 'approved' - Show approved\n• 'list' - Show all"
		}
	},

	onStart: async function ({ args, message, api, threadsData, getLang }) {
		const { threadApproval } = global.GoatBot.config;

		if (!threadApproval || !threadApproval.enable) {
			return message.reply(getLang("systemDisabled"));
		}

		const action = args[0]?.toLowerCase();
		const pageSize = 10;

		// Handle auto approve
		if (action === "auto") {
			const allThreads = global.db.allThreadData;
			const pendingThreads = allThreads.filter(thread => thread.approved !== true);
			let approvedCount = 0;

			for (const thread of pendingThreads) {
				try {
					await threadsData.set(thread.threadID, { approved: true });

					// Send approval message to thread
					setTimeout(async () => {
						try {
							await api.sendMessage("🎉 This thread has been approved! Bot will now respond to your commands.", thread.threadID);
						} catch (err) {
							console.error(`Failed to send approval message to thread ${thread.threadID}:`, err.message);
						}
					}, 1000 + (approvedCount * 500));

					approvedCount++;
				} catch (err) {
					console.error(`Failed to approve thread ${thread.threadID}:`, err.message);
				}
			}

			return message.reply(getLang("autoApproveSuccess", approvedCount));
		}

		// Get threads based on filter
		let threadsToShow = [];
		let titleType = "pending";

		if (action === "list") {
			threadsToShow = global.db.allThreadData;
			titleType = "all";
		} else if (action === "approved") {
			threadsToShow = global.db.allThreadData.filter(thread => thread.approved === true);
			titleType = "approved";
		} else if (action === "pending" || !action) {
			threadsToShow = global.db.allThreadData.filter(thread => thread.approved !== true);
			titleType = "pending";
		}

		// Handle page number
		let page = 1;
		if (action === "p" && args[1]) {
			page = parseInt(args[1]) || 1;
			threadsToShow = global.db.allThreadData.filter(thread => thread.approved !== true);
			titleType = "pending";
		} else if (args[1] === "p" && args[2]) {
			page = parseInt(args[2]) || 1;
		}

		const totalPages = Math.ceil(threadsToShow.length / pageSize);
		
		if (page < 1 || page > totalPages) {
			return message.reply(getLang("invalidPage", totalPages));
		}

		const startIndex = (page - 1) * pageSize;
		const endIndex = startIndex + pageSize;
		const currentPageThreads = threadsToShow.slice(startIndex, endIndex);

		if (currentPageThreads.length === 0) {
			if (titleType === "pending") return message.reply(getLang("noPendingThreads"));
			if (titleType === "approved") return message.reply(getLang("noApprovedThreads"));
			return message.reply(getLang("noThreads"));
		}

		// Build thread list
		let threadList = "";
		const threadDetails = [];

		for (let i = 0; i < currentPageThreads.length; i++) {
			const thread = currentPageThreads[i];
			const listNumber = startIndex + i + 1;
			
			try {
				const threadInfo = await api.getThreadInfo(thread.threadID);
				const threadName = threadInfo.threadName || "Unknown";
				const memberCount = threadInfo.participantIDs?.length || 0;
				const approvalStatus = thread.approved === true ? "✅" : "❌";
				const addedTime = thread.createdAt ? new Date(thread.createdAt).toLocaleDateString() : "Unknown";

				threadList += `${listNumber}. ${approvalStatus} ${threadName}\n   👥 ${memberCount} members | ⏰ ${addedTime}\n   🆔 ${thread.threadID}\n\n`;
				
				threadDetails.push({
					threadID: thread.threadID,
					threadName: threadName,
					memberCount: memberCount,
					approved: thread.approved === true,
					listNumber: listNumber
				});
			} catch (err) {
				const approvalStatus = thread.approved === true ? "✅" : "❌";
				threadList += `${listNumber}. ${approvalStatus} Unknown Thread\n   🆔 ${thread.threadID}\n\n`;
				
				threadDetails.push({
					threadID: thread.threadID,
					threadName: "Unknown Thread",
					memberCount: 0,
					approved: thread.approved === true,
					listNumber: listNumber
				});
			}
		}

		// Send appropriate message based on type
		let replyMessage;
		if (titleType === "pending") {
			replyMessage = getLang("pendingThreads", page, totalPages, threadList);
		} else if (titleType === "approved") {
			replyMessage = getLang("approvedThreads", page, totalPages, threadList);
		} else {
			replyMessage = getLang("allThreads", page, totalPages, threadList);
		}

		return message.reply(replyMessage, (err, info) => {
			if (!err) {
				global.GoatBot.onReply.set(info.messageID, {
					commandName: "mthread",
					messageID: info.messageID,
					author: api.getCurrentUserID(),
					threadDetails: threadDetails,
					currentPage: page,
					totalPages: totalPages,
					titleType: titleType,
					allThreads: threadsToShow
				});
			}
		});
	},

	onReply: async function ({ args, message, api, threadsData, getLang, Reply }) {
		const { author, threadDetails, currentPage, totalPages, titleType, allThreads } = Reply;
		if (api.getCurrentUserID() !== author) return;

		const { threadApproval } = global.GoatBot.config;
		if (!threadApproval || !threadApproval.enable) {
			return message.reply(getLang("systemDisabled"));
		}

		const reply = args.join(" ").toLowerCase().trim();
		const parts = reply.split(' ');
		const action = parts[0];

		// Handle page navigation
		if (action === 'p') {
			const newPage = parseInt(parts[1]);
			if (isNaN(newPage) || newPage < 1 || newPage > totalPages) {
				return message.reply(getLang("invalidPage", totalPages));
			}

			const pageSize = 10;
			const startIndex = (newPage - 1) * pageSize;
			const endIndex = startIndex + pageSize;
			const newPageThreads = allThreads.slice(startIndex, endIndex);

			// Build new thread list
			let threadList = "";
			const newThreadDetails = [];

			for (let i = 0; i < newPageThreads.length; i++) {
				const thread = newPageThreads[i];
				const listNumber = startIndex + i + 1;
				
				try {
					const threadInfo = await api.getThreadInfo(thread.threadID);
					const threadName = threadInfo.threadName || "Unknown";
					const memberCount = threadInfo.participantIDs?.length || 0;
					const approvalStatus = thread.approved === true ? "✅" : "❌";
					const addedTime = thread.createdAt ? new Date(thread.createdAt).toLocaleDateString() : "Unknown";

					threadList += `${listNumber}. ${approvalStatus} ${threadName}\n   👥 ${memberCount} members | ⏰ ${addedTime}\n   🆔 ${thread.threadID}\n\n`;
					
					newThreadDetails.push({
						threadID: thread.threadID,
						threadName: threadName,
						memberCount: memberCount,
						approved: thread.approved === true,
						listNumber: listNumber
					});
				} catch (err) {
					const approvalStatus = thread.approved === true ? "✅" : "❌";
					threadList += `${listNumber}. ${approvalStatus} Unknown Thread\n   🆔 ${thread.threadID}\n\n`;
					
					newThreadDetails.push({
						threadID: thread.threadID,
						threadName: "Unknown Thread",
						memberCount: 0,
						approved: thread.approved === true,
						listNumber: listNumber
					});
				}
			}

			let replyMessage;
			if (titleType === "pending") {
				replyMessage = getLang("pendingThreads", newPage, totalPages, threadList);
			} else if (titleType === "approved") {
				replyMessage = getLang("approvedThreads", newPage, totalPages, threadList);
			} else {
				replyMessage = getLang("allThreads", newPage, totalPages, threadList);
			}

			message.reply(replyMessage, (err, info) => {
				if (!err) {
					global.GoatBot.onReply.set(info.messageID, {
						commandName: "mthread",
						messageID: info.messageID,
						author: api.getCurrentUserID(),
						threadDetails: newThreadDetails,
						currentPage: newPage,
						totalPages: totalPages,
						titleType: titleType,
						allThreads: allThreads
					});
				}
			});
			return;
		}

		// Handle list type changes
		if (action === 'approved' || action === 'pending' || action === 'list') {
			const pageSize = 10;
			let newAllThreads = [];
			let newTitleType = action;

			if (action === "list") {
				newAllThreads = global.db.allThreadData;
			} else if (action === "approved") {
				newAllThreads = global.db.allThreadData.filter(thread => thread.approved === true);
			} else if (action === "pending") {
				newAllThreads = global.db.allThreadData.filter(thread => thread.approved !== true);
			}

			const newTotalPages = Math.ceil(newAllThreads.length / pageSize);
			const newPageThreads = newAllThreads.slice(0, pageSize);

			if (newPageThreads.length === 0) {
				if (newTitleType === "pending") return message.reply(getLang("noPendingThreads"));
				if (newTitleType === "approved") return message.reply(getLang("noApprovedThreads"));
				return message.reply(getLang("noThreads"));
			}

			// Build thread list
			let threadList = "";
			const newThreadDetails = [];

			for (let i = 0; i < newPageThreads.length; i++) {
				const thread = newPageThreads[i];
				const listNumber = i + 1;
				
				try {
					const threadInfo = await api.getThreadInfo(thread.threadID);
					const threadName = threadInfo.threadName || "Unknown";
					const memberCount = threadInfo.participantIDs?.length || 0;
					const approvalStatus = thread.approved === true ? "✅" : "❌";
					const addedTime = thread.createdAt ? new Date(thread.createdAt).toLocaleDateString() : "Unknown";

					threadList += `${listNumber}. ${approvalStatus} ${threadName}\n   👥 ${memberCount} members | ⏰ ${addedTime}\n   🆔 ${thread.threadID}\n\n`;
					
					newThreadDetails.push({
						threadID: thread.threadID,
						threadName: threadName,
						memberCount: memberCount,
						approved: thread.approved === true,
						listNumber: listNumber
					});
				} catch (err) {
					const approvalStatus = thread.approved === true ? "✅" : "❌";
					threadList += `${listNumber}. ${approvalStatus} Unknown Thread\n   🆔 ${thread.threadID}\n\n`;
					
					newThreadDetails.push({
						threadID: thread.threadID,
						threadName: "Unknown Thread",
						memberCount: 0,
						approved: thread.approved === true,
						listNumber: listNumber
					});
				}
			}

			let replyMessage;
			if (newTitleType === "pending") {
				replyMessage = getLang("pendingThreads", 1, newTotalPages, threadList);
			} else if (newTitleType === "approved") {
				replyMessage = getLang("approvedThreads", 1, newTotalPages, threadList);
			} else {
				replyMessage = getLang("allThreads", 1, newTotalPages, threadList);
			}

			message.reply(replyMessage, (err, info) => {
				if (!err) {
					global.GoatBot.onReply.set(info.messageID, {
						commandName: "mthread",
						messageID: info.messageID,
						author: api.getCurrentUserID(),
						threadDetails: newThreadDetails,
						currentPage: 1,
						totalPages: newTotalPages,
						titleType: newTitleType,
						allThreads: newAllThreads
					});
				}
			});
			return;
		}

		// Handle approve operations
		if (action === 'a' || action === 'approve') {
			const numbers = parts.slice(1).map(n => parseInt(n)).filter(n => !isNaN(n));
			
			if (numbers.length === 0) {
				return message.reply(getLang("invalidReply"));
			}

			const invalidNumbers = numbers.filter(num => !threadDetails.find(t => t.listNumber === num));
			if (invalidNumbers.length > 0) {
				return message.reply(getLang("invalidNumbers", invalidNumbers.join(", ")));
			}

			let approvedCount = 0;
			for (const num of numbers) {
				const targetThread = threadDetails.find(t => t.listNumber === num);
				if (!targetThread) continue;

				try {
					await threadsData.set(targetThread.threadID, { approved: true });

					// Send approval message to thread
					setTimeout(async () => {
						try {
							await api.sendMessage("🎉 This thread has been approved! Bot will now respond to your commands.", targetThread.threadID);
						} catch (err) {
							console.error(`Failed to send approval message to thread ${targetThread.threadID}:`, err.message);
						}
					}, 1000 + (approvedCount * 500));

					message.reply(getLang("threadApproved", targetThread.threadName, targetThread.threadID));
					approvedCount++;
				} catch (err) {
					console.error(`Failed to approve thread ${targetThread.threadID}:`, err.message);
				}
			}

			if (approvedCount > 1) {
				message.reply(getLang("multipleApproved", approvedCount));
			}
		}
		// Handle reject operations
		else if (action === 'r' || action === 'reject') {
			const numbers = parts.slice(1).map(n => parseInt(n)).filter(n => !isNaN(n));
			
			if (numbers.length === 0) {
				return message.reply(getLang("invalidReply"));
			}

			const invalidNumbers = numbers.filter(num => !threadDetails.find(t => t.listNumber === num));
			if (invalidNumbers.length > 0) {
				return message.reply(getLang("invalidNumbers", invalidNumbers.join(", ")));
			}

			let rejectedCount = 0;
			for (const num of numbers) {
				const targetThread = threadDetails.find(t => t.listNumber === num);
				if (!targetThread) continue;

				try {
					await threadsData.set(targetThread.threadID, { approved: false });

					// Send rejection message and leave
					setTimeout(async () => {
						try {
							await api.sendMessage("❌ This thread has been rejected by an admin. Bot is leaving the group.", targetThread.threadID);
							setTimeout(async () => {
								try {
									await api.removeUserFromGroup(api.getCurrentUserID(), targetThread.threadID);
								} catch (err) {
									console.error(`Failed to leave thread ${targetThread.threadID}:`, err.message);
								}
							}, 2000);
						} catch (err) {
							console.error(`Failed to send rejection message to thread ${targetThread.threadID}:`, err.message);
						}
					}, 1000 + (rejectedCount * 1000));

					message.reply(getLang("threadRejected", targetThread.threadName, targetThread.threadID));
					rejectedCount++;
				} catch (err) {
					console.error(`Failed to reject thread ${targetThread.threadID}:`, err.message);
				}
			}

			if (rejectedCount > 1) {
				message.reply(getLang("multipleRejected", rejectedCount));
			}
		} else {
			return message.reply(getLang("invalidReply"));
		}

		// Delete the reply after processing
		Reply.delete();
	}
};
