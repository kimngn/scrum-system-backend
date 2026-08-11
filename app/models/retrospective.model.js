module.exports = (sequelize, Sequelize) => {
  const Retrospective = sequelize.define("retrospective", {
    ID: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    wentWell: {
      type: Sequelize.TEXT,
      allowNull: true,
    },

    wentWrong: {
      type: Sequelize.TEXT,
      allowNull: true,
    },

    improvements: {
      type: Sequelize.TEXT,
      allowNull: true,
    },

    sprintId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    createdDate: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW,
    },
  });

  return Retrospective;
};