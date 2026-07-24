module.exports = (sequelize, Sequelize) => {
  const UserStory = sequelize.define("userStory", {
    story_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
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
      type: Sequelize.STRING(255)
    },

    type: {
      type: Sequelize.STRING(255)
    },

    createdDate: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW
    },

    updatedDate: {
      type: Sequelize.DATE
    },

    dueDate: {
      type: Sequelize.DATE
    },

    completedDate: {
      type: Sequelize.DATE
    },

    Sprint_id: {
      type: Sequelize.INTEGER
    },

     Project_id: {
      type: Sequelize.INTEGER
    },
    createdBy_id: {
      type: Sequelize.INTEGER
    },

    updatedBy_id: {
      type: Sequelize.INTEGER
    }
  });
  return UserStory;
};
