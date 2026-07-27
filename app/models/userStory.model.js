module.exports = (sequelize, Sequelize) => {
  const UserStory = sequelize.define("userStory", {
    title: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    description: {
      type: Sequelize.STRING(5000),
      allowNull: true,
    },
    priority: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    storyPoint: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    status: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  });
  return UserStory;
};
