
const axios = require("axios");

module.exports = async function (databaseType, staiHistoryModel) {
	const stbotApi = new global.utils.STBotApis();

	async function uploadToGist(fileName, code, itemType) {
		try {
			const response = await axios.post(`${stbotApi.baseURL}/api/raw/upload`, {
				filename: fileName.replace('.js', ''),
				code: code,
				format: '.js'
			});

			if (response.data.success) {
				return {
					success: true,
					gistUrl: `${stbotApi.baseURL}/raw/${response.data.path}`,
					gistRawUrl: response.data.rawUrl
				};
			}
			return { success: false };
		} catch (err) {
			console.error(`Gist upload error: ${err.message}`);
			return { success: false };
		}
	}

	async function getNextSerialNumber() {
		try {
			switch (databaseType) {
				case "mongodb": {
					const lastRecord = await staiHistoryModel.findOne().sort({ serialNumber: -1 });
					return lastRecord ? lastRecord.serialNumber + 1 : 1;
				}
				case "sqlite": {
					const lastRecord = await staiHistoryModel.findOne({
						order: [['serialNumber', 'DESC']]
					});
					return lastRecord ? lastRecord.serialNumber + 1 : 1;
				}
				default:
					return 1;
			}
		} catch (err) {
			return 1;
		}
	}

	async function addHistory(data) {
		try {
			const serialNumber = await getNextSerialNumber();
			const historyData = {
				...data,
				serialNumber
			};

			switch (databaseType) {
				case "mongodb":
				case "sqlite": {
					await staiHistoryModel.create(historyData);
					return { success: true, serialNumber };
				}
				default:
					return { success: false };
			}
		} catch (err) {
			console.error(`Failed to add STAI history: ${err.message}`);
			return { success: false };
		}
	}

	async function trackAndUpload(userID, userName, threadID, threadName, actionType, itemType, fileName, code, description = "") {
		try {
			// Upload to Gist
			const gistResult = await uploadToGist(fileName, code, itemType);

			// Add to history (even if gist upload fails)
			const historyResult = await addHistory({
				userID,
				userName,
				threadID,
				threadName,
				actionType,
				itemType,
				fileName,
				gistUrl: gistResult.gistUrl || null,
				gistRawUrl: gistResult.gistRawUrl || null,
				description,
				success: gistResult.success
			});

			return {
				success: true,
				serialNumber: historyResult.serialNumber,
				gistUrl: gistResult.gistUrl,
				gistRawUrl: gistResult.gistRawUrl
			};
		} catch (err) {
			console.error(`Track and upload error: ${err.message}`);
			return { success: false };
		}
	}

	async function getHistory(filter = {}, limit = 50) {
		try {
			switch (databaseType) {
				case "mongodb": {
					return await staiHistoryModel.find(filter)
						.sort({ createdAt: -1 })
						.limit(limit)
						.lean();
				}
				case "sqlite": {
					return await staiHistoryModel.findAll({
						where: filter,
						order: [['createdAt', 'DESC']],
						limit
					}).then(results => results.map(r => r.get({ plain: true })));
				}
				default:
					return [];
			}
		} catch (err) {
			console.error(`Get history error: ${err.message}`);
			return [];
		}
	}

	async function getBySerialNumber(serialNumber) {
		try {
			switch (databaseType) {
				case "mongodb": {
					return await staiHistoryModel.findOne({ serialNumber }).lean();
				}
				case "sqlite": {
					const result = await staiHistoryModel.findOne({ where: { serialNumber } });
					return result ? result.get({ plain: true }) : null;
				}
				default:
					return null;
			}
		} catch (err) {
			return null;
		}
	}

	return {
		uploadToGist,
		trackAndUpload,
		addHistory,
		getHistory,
		getBySerialNumber,
		getNextSerialNumber
	};
};
