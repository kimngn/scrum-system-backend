module.exports = (sequelize, Sequelize) => {
  const Project = sequelize.define("project", {
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    description: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    status: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  });
  return Project;
};
