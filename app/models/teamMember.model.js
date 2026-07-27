module.exports = (sequelize, Sequelize) => {
  const TeamMember = sequelize.define("teamMember", {
    teamId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    userId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
  });
  return TeamMember;
};