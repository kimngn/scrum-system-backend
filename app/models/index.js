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
db.projectColumn = require("./projectColumn.model.js")(sequelize, Sequelize);
db.userStory = require("./userStory.model.js")(sequelize, Sequelize);
db.repo = require("./repo.model.js")(sequelize, Sequelize);
db.history = require("./history.model.js")(sequelize, Sequelize);
db.projectMembership = require("./projectMembership.model.js")(sequelize, Sequelize);
db.storyAssignee = require("./storyAssignee.model.js")(sequelize, Sequelize);


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

db.user.hasMany(db.history, {
  as: "history",
  foreignKey: { allowNull: true },
  onDelete: "CASCADE",
});

db.history.belongsTo(db.user, {
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

// foreign key for projectColumn
db.project.hasMany(db.projectColumn, {
  as: "column",
  foreignKey: { allowNull: false },
  onDelete: "CASCADE",
});
db.projectColumn.belongsTo(db.project, {
  as: "project",
  foreignKey: { allowNull: false },
  onDelete: "CASCADE",
});

// foreign keys for userStory
db.project.hasMany(db.userStory, {
  as: "story",
  foreignKey: { allowNull: false },
  onDelete: "CASCADE",
});
db.userStory.belongsTo(db.project, {
  as: "project",
  foreignKey: { allowNull: false },
  onDelete: "CASCADE",
});

db.projectColumn.hasMany(db.userStory, {
  as: "story",
  foreignKey: { name: "columnId", allowNull: false },
  onDelete: "CASCADE",
});
db.userStory.belongsTo(db.projectColumn, {
  as: "column",
  foreignKey: { name: "columnId", allowNull: false },
  onDelete: "CASCADE",
});

// foreign keys for projectMembership
db.project.hasMany(db.projectMembership, {
  as: "membership",
  foreignKey: { allowNull: false },
  onDelete: "CASCADE",
});
db.projectMembership.belongsTo(db.project, {
  as: "project",
  foreignKey: { allowNull: false },
  onDelete: "CASCADE",
});

db.user.hasMany(db.projectMembership, {
  as: "membership",
  foreignKey: { allowNull: false },
  onDelete: "CASCADE",
});
db.projectMembership.belongsTo(db.user, {
  as: "user",
  foreignKey: { allowNull: false },
  onDelete: "CASCADE",
});

// foreign keys for storyAssignee
db.userStory.hasMany(db.storyAssignee, {
  as: "assignee",
  foreignKey: { name: "userStoryId", allowNull: false },
  onDelete: "CASCADE",
});
db.storyAssignee.belongsTo(db.userStory, {
  as: "story",
  foreignKey: { name: "userStoryId", allowNull: false },
  onDelete: "CASCADE",
});

db.user.hasMany(db.storyAssignee, {
  as: "assignee",
  foreignKey: { allowNull: false },
  onDelete: "CASCADE",
});
db.storyAssignee.belongsTo(db.user, {
  as: "user",
  foreignKey: { allowNull: false },
  onDelete: "CASCADE",
});
module.exports = db;
