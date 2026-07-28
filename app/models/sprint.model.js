module.exports = (sequelize, Sequelize) => {
  const Sprint = sequelize.define("sprint", {
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    startDate: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    endDate: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    status: {
      type: Sequelize.ENUM("planned", "active", "completed"),
      defaultValue: "planned",
    },
  });
  return Sprint;
};
