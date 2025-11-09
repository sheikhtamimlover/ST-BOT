module.exports = {
	config: {
		name: "balance",
		aliases: ["bal"],
		version: "2.4.71",
		author: "NTKhang | Enhanced by ST",
		countDown: 5,
		role: 0,
		description: {
			vi: "xem số tiền hiện có của bạn hoặc người được tag",
			en: "view your money or the money of the tagged person"
		},
		category: "economy",
		guide: {
			vi: "   {pn}: xem số tiền của bạn"
				+ "\n   {pn} <@tag>: xem số tiền của người được tag",
			en: "   {pn}: view your money"
				+ "\n   {pn} <@tag>: view the money of the tagged person"
		}
	},

	langs: {
		vi: {
			money: "Bạn đang có %1$",
			moneyOf: "%1 đang có %2$"
		},
		en: {
			money: "You have %1$",
			moneyOf: "%1 has %2$"
		}
	},

	ST: async function ({ message, usersData, event, getLang }) {
		const { bankData } = global.db;
		
		if (Object.keys(event.mentions).length > 0) {
			const uids = Object.keys(event.mentions);
			let msg = "";
			for (const uid of uids) {
				const userMoney = await usersData.get(uid, "money");
				const userBank = await bankData.get(uid);
				const bankBalance = userBank ? userBank.bankBalance : 0;
				msg += `${event.mentions[uid].replace("@", "")}\n💰 Wallet: $${userMoney.toLocaleString()}\n🏦 Bank: $${bankBalance.toLocaleString()}\n\n`;
			}
			return message.reply(msg);
		}
		
		const userData = await usersData.get(event.senderID);
		const userBank = await bankData.get(event.senderID);
		const bankBalance = userBank ? userBank.bankBalance : 0;
		
		message.reply(`💰 Your Balance\n━━━━━━━━━━━━━━━━\n💵 Wallet: $${userData.money.toLocaleString()}\n🏦 Bank: $${bankBalance.toLocaleString()}\n━━━━━━━━━━━━━━━━\n💎 Total: $${(userData.money + bankBalance).toLocaleString()}`);
	}
};