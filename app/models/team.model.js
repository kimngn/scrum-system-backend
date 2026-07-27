module.exports = (sequelize, Sequelize) => {
  const Team = sequelize.define("team", {
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    description: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    projectId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
  });
  return Team;
};