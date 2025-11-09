
const { existsSync, writeJsonSync, readJSONSync } = require("fs-extra");
const moment = require("moment-timezone");
const path = require("path");
const _ = require("lodash");
const { CustomError, TaskQueue, getType } = global.utils;

const optionsWriteJSON = {
	spaces: 2,
	EOL: "\n"
};

const taskQueue = new TaskQueue(function (task, callback) {
	if (getType(task) === "AsyncFunction") {
		task()
			.then(result => callback(null, result))
			.catch(err => callback(err));
	}
	else {
		try {
			const result = task();
			callback(null, result);
		}
		catch (err) {
			callback(err);
		}
	}
});

// Initialize creatingBankData if it doesn't exist
if (!global.client.database.creatingBankData) {
	global.client.database.creatingBankData = [];
}
const creatingBankData = global.client.database.creatingBankData;

module.exports = async function (databaseType, bankModel, api) {
	let Banks = [];
	const pathBankData = path.join(__dirname, "..", "data/bankData.json");

	switch (databaseType) {
		case "mongodb": {
			Banks = (await bankModel.find({}).lean()).map(bank => _.omit(bank, ["_id", "__v"]));
			break;
		}
		case "sqlite": {
			Banks = (await bankModel.findAll()).map(bank => bank.get({ plain: true }));
			break;
		}
		case "json": {
			if (!existsSync(pathBankData))
				writeJsonSync(pathBankData, [], optionsWriteJSON);
			Banks = readJSONSync(pathBankData);
			break;
		}
	}
	global.db.allBankData = Banks;

	async function save(userID, bankData, mode, path) {
		try {
			let index = _.findIndex(global.db.allBankData, { userID });
			if (index === -1 && mode === "update") {
				try {
					await create_(userID);
					index = _.findIndex(global.db.allBankData, { userID });
				}
				catch (err) {
					throw new CustomError({
						name: "BANK_NOT_FOUND",
						message: `Can't find bank account for userID: ${userID} in database`
					});
				}
			}

			switch (mode) {
				case "create": {
					switch (databaseType) {
						case "mongodb":
						case "sqlite": {
							let dataCreated = await bankModel.create(bankData);
							dataCreated = databaseType === "mongodb" ?
								_.omit(dataCreated._doc, ["_id", "__v"]) :
								dataCreated.get({ plain: true });
							global.db.allBankData.push(dataCreated);
							return _.cloneDeep(dataCreated);
						}
						case "json": {
							const timeCreate = moment.tz().format();
							bankData.createdAt = timeCreate;
							bankData.updatedAt = timeCreate;
							global.db.allBankData.push(bankData);
							writeJsonSync(pathBankData, global.db.allBankData, optionsWriteJSON);
							return _.cloneDeep(bankData);
						}
					}
					break;
				}
				case "update": {
					const oldBankData = global.db.allBankData[index];
					const dataWillChange = {};

					if (Array.isArray(path) && Array.isArray(bankData)) {
						path.forEach((p, index) => {
							const key = p.split(".")[0];
							dataWillChange[key] = oldBankData[key];
							_.set(dataWillChange, p, bankData[index]);
						});
					}
					else if (path && typeof path === "string" || Array.isArray(path)) {
						const key = Array.isArray(path) ? path[0] : path.split(".")[0];
						dataWillChange[key] = oldBankData[key];
						_.set(dataWillChange, path, bankData);
					}
					else
						for (const key in bankData)
							dataWillChange[key] = bankData[key];

					switch (databaseType) {
						case "mongodb": {
							let dataUpdated = await bankModel.findOneAndUpdate({ userID }, dataWillChange, { returnDocument: 'after' });
							dataUpdated = _.omit(dataUpdated._doc, ["_id", "__v"]);
							global.db.allBankData[index] = dataUpdated;
							return _.cloneDeep(dataUpdated);
						}
						case "sqlite": {
							const bank = await bankModel.findOne({ where: { userID } });
							const dataUpdated = (await bank.update(dataWillChange)).get({ plain: true });
							global.db.allBankData[index] = dataUpdated;
							return _.cloneDeep(dataUpdated);
						}
						case "json": {
							dataWillChange.updatedAt = moment.tz().format();
							global.db.allBankData[index] = {
								...oldBankData,
								...dataWillChange
							};
							writeJsonSync(pathBankData, global.db.allBankData, optionsWriteJSON);
							return _.cloneDeep(global.db.allBankData[index]);
						}
					}
					break;
				}
				case "remove": {
					if (index != -1) {
						global.db.allBankData.splice(index, 1);
						switch (databaseType) {
							case "mongodb":
								await bankModel.deleteOne({ userID });
								break;
							case "sqlite":
								await bankModel.destroy({ where: { userID } });
								break;
							case "json":
								writeJsonSync(pathBankData, global.db.allBankData, optionsWriteJSON);
								break;
						}
					}
					break;
				}
			}
			return null;
		}
		catch (err) {
			throw err;
		}
	}

	async function create_(userID) {
		if (!userID || userID === 0 || userID === '0') {
			return Promise.reject(new CustomError({
				name: "INVALID_USER_ID",
				message: `Cannot create bank account for userID: ${userID}`
			}));
		}

		const findInCreatingData = creatingBankData.find(b => b.userID == userID);
		if (findInCreatingData)
			return findInCreatingData.promise;

		const queue = new Promise(async function (resolve_, reject_) {
			try {
				if (global.db.allBankData && global.db.allBankData.some(b => b.userID == userID)) {
					throw new CustomError({
						name: "DATA_ALREADY_EXISTS",
						message: `Bank account with id "${userID}" already exists`
					});
				}

				let bankData = {
					userID,
					bankBalance: 0,
					loan: {
						amount: 0,
						takenAt: null,
						interestRate: 5,
						dueDate: null,
						threadID: null
					},
					loanRequests: [],
					banned: {
						isBanned: false,
						reason: null,
						bannedAt: null,
						canUnbanAt: null
					},
					investments: [],
					deposits: [],
					transactions: [],
					dailyClaim: {
						lastClaimed: null,
						streak: 0
					},
					lottery: {
						lastPlayed: null,
						totalWins: 0
					},
					premiumCurrency: 0,
					totalDeposited: 0,
					totalWithdrawn: 0,
					registeredAt: new Date()
				};

				bankData = await save(userID, bankData, "create");
				resolve_(_.cloneDeep(bankData));
			}
			catch (err) {
				reject_(err);
			}
			creatingBankData.splice(creatingBankData.findIndex(b => b.userID == userID), 1);
		});

		creatingBankData.push({
			userID,
			promise: queue
		});
		return queue;
	}

	async function create(userID) {
		return new Promise(function (resolve, reject) {
			taskQueue.push(function () {
				create_(userID)
					.then(resolve)
					.catch(reject);
			});
		});
	}

	async function get_(userID, path, defaultValue) {
		if (isNaN(userID)) {
			throw new CustomError({
				name: "INVALID_USER_ID",
				message: `The first argument (userID) must be a number, not ${typeof userID}`
			});
		}

		let bankData;
		const index = global.db.allBankData.findIndex(b => b.userID == userID);
		if (index === -1)
			bankData = await create_(userID);
		else
			bankData = global.db.allBankData[index];

		if (path)
			if (!["string", "array"].includes(typeof path))
				throw new CustomError({
					name: "INVALID_PATH",
					message: `The second argument (path) must be a string or array, not ${typeof path}`
				});
			else
				if (typeof path === "string")
					return _.cloneDeep(_.get(bankData, path, defaultValue));
				else
					return _.cloneDeep(_.times(path.length, i => _.get(bankData, path[i], defaultValue[i])));

		return _.cloneDeep(bankData);
	}

	async function get(userID, path, defaultValue) {
		return new Promise((resolve, reject) => {
			taskQueue.push(function () {
				get_(userID, path, defaultValue)
					.then(resolve)
					.catch(reject);
			});
		});
	}

	async function set(userID, updateData, path) {
		return new Promise((resolve, reject) => {
			taskQueue.push(async function () {
				try {
					if (isNaN(userID)) {
						throw new CustomError({
							name: "INVALID_USER_ID",
							message: `The first argument (userID) must be a number, not ${typeof userID}`
						});
					}

					const bankData = await save(userID, updateData, "update", path);
					return resolve(_.cloneDeep(bankData));
				}
				catch (err) {
					reject(err);
				}
			});
		});
	}

	async function addTransaction(userID, transaction) {
		const bankData = await get_(userID);
		bankData.transactions.unshift({
			...transaction,
			timestamp: new Date()
		});
		if (bankData.transactions.length > 50)
			bankData.transactions = bankData.transactions.slice(0, 50);
		return await save(userID, bankData.transactions, "update", "transactions");
	}

	return {
		existsSync: function existsSync(userID) {
			return global.db.allBankData.some(b => b.userID == userID);
		},
		create,
		get,
		set,
		addTransaction
	};
};
