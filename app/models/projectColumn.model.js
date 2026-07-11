module.exports = (sequelize, Sequelize) => {
  const ProjectColumn = sequelize.define("projectColumn", {
    title: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    displayOrder: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
  });
  return ProjectColumn;
};
