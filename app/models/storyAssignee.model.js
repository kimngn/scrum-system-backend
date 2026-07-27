module.exports = (sequelize, Sequelize) => {
  const StoryAssignee = sequelize.define("storyAssignee", {
    userStoryId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    userId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
  });
  return StoryAssignee;
};