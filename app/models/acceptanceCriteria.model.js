module.exports = (sequelize, Sequelize) => {
  const AcceptanceCriteria = sequelize.define(
    "acceptanceCriteria",
    {
      title: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      description: {
        type: Sequelize.STRING(5000),
        allowNull: false,
      },

      completed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      approvedDate: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      useGivenWhenThen: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    }
  );

  return AcceptanceCriteria;
};