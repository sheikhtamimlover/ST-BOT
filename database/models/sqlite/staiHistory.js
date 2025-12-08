
module.exports = function (sequelize) {
	const { Model, DataTypes } = require("sequelize");
	class staiHistoryModel extends Model { }
	staiHistoryModel.init({
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true
		},
		userID: DataTypes.STRING,
		userName: DataTypes.STRING,
		threadID: DataTypes.STRING,
		threadName: DataTypes.STRING,
		actionType: DataTypes.STRING, // 'create_command', 'fix_command', 'create_event', 'fix_event', 'image'
		itemType: DataTypes.STRING, // 'command' or 'event'
		fileName: DataTypes.STRING,
		gistUrl: DataTypes.STRING,
		gistRawUrl: DataTypes.STRING,
		serialNumber: {
			type: DataTypes.INTEGER,
			unique: true
		},
		description: DataTypes.TEXT,
		success: {
			type: DataTypes.BOOLEAN,
			defaultValue: true
		}
	}, {
		sequelize,
		modelName: "staiHistory"
	});

	return staiHistoryModel;
};
