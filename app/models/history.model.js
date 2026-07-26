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
      allowNull: false,
    },
    oldValue: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    entityType: {
      type: Sequelize.STRING,
      allowNull: false,
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
