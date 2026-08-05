module.exports = (sequelize, Sequelize) => {
  const Branch = sequelize.define("branch", {
    title: {
      type: Sequelize.STRING,
      allowNull: false,
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
  });
  return Branch;
};
