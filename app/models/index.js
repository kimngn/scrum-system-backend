const dbConfig = require("../config/db.config.js");
const Sequelize = require("sequelize");
const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.dialect,
  pool: {
    max: dbConfig.pool.max,
    min: dbConfig.pool.min,
    acquire: dbConfig.pool.acquire,
    idle: dbConfig.pool.idle,
  },
});
const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.project = require("./project.model.js")(sequelize, Sequelize);
db.sprint = require("./sprint.model.js")(sequelize, Sequelize);
db.session = require("./session.model.js")(sequelize, Sequelize);
db.user = require("./user.model.js")(sequelize, Sequelize);

// foreign key for session
db.user.hasMany(db.session, {
  as: "session",
  foreignKey: { allowNull: false },
  onDelete: "CASCADE",
});
db.session.belongsTo(db.user, {
  as: "user",
  foreignKey: { allowNull: false },
  onDelete: "CASCADE",
});

// foreign key for project
db.user.hasMany(db.project, {
  as: "project",
  foreignKey: { allowNull: true },
  onDelete: "CASCADE",
});
db.project.belongsTo(db.user, {
  as: "user",
  foreignKey: { allowNull: true },
  onDelete: "CASCADE",
});

// foreign key for sprint
db.project.hasMany(db.sprint, {
  as: "sprint",
  foreignKey: { allowNull: false },
  onDelete: "CASCADE",
});
db.sprint.belongsTo(db.project, {
  as: "project",
  foreignKey: { allowNull: false },
  onDelete: "CASCADE",
});
  
module.exports = db;