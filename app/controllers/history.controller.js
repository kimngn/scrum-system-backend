const db = require("../models");
const History = db.history;
const Op = db.Sequelize.Op;

exports.create = async (req, res) => {
  if (req.body.action === undefined) {
    return res.status(400).send({ message: "Action cannot be empty!" });
  } else if (req.body.userId === undefined) {
    return res.status(400).send({ message: "User Id cannot be empty!" });
  } else if (req.body.entityId === undefined) {
    return res.status(400).send({ message: "Entity Id cannot be empty!" });
  } else if (req.body.entityType === undefined) {
    return res.status(400).send({ message: "Entity Type cannot be empty!" });
  } else if (req.body.newValue === undefined) {
    return res.status(400).send({ message: "New value cannot be empty!" });
  }

  const history = {
    action: req.body.action,
    userId: req.body.userId,
    entityId: req.body.entityId,
    newValue: req.body.newValue,
    oldValue: req.body.oldValue,
    entityType: req.body.entityType,
    fieldName: req.body.fieldName,
  };

  try {
    const data = await History.create(history);
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: err.message || "Error creating history." });
  }
};

exports.findProjectActionsByProjectId = async (req, res) => {
  const projectId = req.params.projectId;
  try {
    const data = await History.findAll({
      where: { entityId: projectId, entityType: "project" },
      order: [["createdAt", "ASC"]],
      include: [
        // able to do this because of foreign key + belongsTo
        // makes things a lot easier when grabbing the user's name
        {
          model: db.user,
          as: "user",
          attributes: ["id", "firstName", "lastName"],
        },
      ],
    });
    res.send(data);
  } catch (err) {
    res
      .status(500)
      .send({ message: err.message || "Error retrieving sprints." });
  }
};

exports.findSprintActionsBySprintId = async (req, res) => {
  const sprintId = req.params.sprintId;
  try {
    const data = await History.findAll({
      where: { sprintId: sprintId, entityType: "sprint" },
      order: [["createdAt", "ASC"]],
    });
    res.send(data);
  } catch (err) {
    res
      .status(500)
      .send({ message: err.message || "Error retrieving sprints." });
  }
};

exports.deleteAll = async (req, res) => {
  try {
    const number = await History.destroy({ where: {}, truncate: false });
    res.send({ message: `${number} histories were deleted successfully!` });
  } catch (err) {
    res
      .status(500)
      .send({ message: err.message || "Error deleting all histories." });
  }
};
