module.exports = (sequelize, Sequelize) => {
  const Repo = sequelize.define("repos", {
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    repoUrl: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    projectId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    token: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  });
  return Repo;
};
