module.exports = {
    config: {
        name: "addmoney",
        aliases: [],
        version: "2.4.78",
        author: "ST | Sheikh Tamim",
        countDown: 5,
        role: 2,
        shortDescription: "Add money to another user's balance",
        longDescription: {
            en: "Add money to another user's balance using the addmoney command. Reply to a user's message to give them money.",
        },
        category: "economy",
        guide: {
            en: "!addmoney <amount> - Reply to a message or mention a user to add money to their balance.",
        },
    },
    ST: async function ({ api, event, args, usersData, message }) {
        const { getPrefix } = global.utils;
        const p = getPrefix(event.threadID);
        const senderID = event.senderID;
        let recipientID;
        const addAmount = parseInt(args[0]);

        // Validate the amount to add
        if (isNaN(addAmount) || addAmount <= 0) {
            return message.reply(`Invalid amount. Please enter a valid amount to add.\nUsage: ${p}addmoney <amount>\nExample: ${p}addmoney 100`);
        }

        // Determine the recipient based on reply or mention
        if (event.messageReply) {
            recipientID = event.messageReply.senderID; // User who was replied to
        } else if (Object.keys(event.mentions).length) {
            recipientID = Object.keys(event.mentions)[0]; // Mentioned user
        } else {
            return message.reply(`Please reply to a user or mention a user to add money.\nUsage: ${p}addmoney @mention <amount>\nExample: ${p}addmoney @JohnDoe 100`);
        }

        // Fetch user data for the recipient
        const recipientData = await usersData.get(recipientID);

        // Check if recipient exists
        if (!recipientData) {
            return message.reply("Recipient not found. Please ensure the mentioned user is valid.");
        }

        // Update recipient's balance
        recipientData.money += addAmount;

        // Save the updated data
        await usersData.set(recipientID, recipientData);

        // Send a confirmation message
        message.reply(`Successfully added ${addAmount} money to ${recipientData.name}'s balance.`);
    },
};