module.exports = (sequelize, Sequelize) => {
  const History = sequelize.define("history", {
    action: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    userId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    newValue: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    oldValue: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    entityType: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    entityName: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    entityId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    fieldName: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  });
  return History;
};
