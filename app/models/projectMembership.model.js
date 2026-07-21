module.exports = (sequelize, Sequelize) => {
  const ProjectMembership = sequelize.define("projectMembership", {
    userId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    projectId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    role: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "member",
    },
  });
  return ProjectMembership;
};