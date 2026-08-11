module.exports = (sequelize, Sequelize) => {
  const Branch = sequelize.define("branch", {
    title: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    repoId: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    userStoryId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    columnId: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    ref: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    sha: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  });
  return Branch;
};
