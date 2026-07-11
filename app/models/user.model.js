const { saltSize, keySize } = require("../authentication/crypto");

module.exports = (sequelize, Sequelize, DataTypes) => {
  const User = sequelize.define("user", {
    firstName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    lastName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    email: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    password: {
      type: Sequelize.BLOB,
      allowNull: false,
    },
    salt: {
      type: Sequelize.BLOB,
      allowNull: false,
    },
    role: {
      /* referenced Planetarium project */
      type: Sequelize.ENUM("admin", "lead", "member"),
      allowNull: false,
      defaultValue: "member",
    },
  });
  /* Sequelize automatically does createdAt/updatedAt for every model  - https://sequelize.org/docs/v7/models/auto-timestamps/*/
  return User;
};
