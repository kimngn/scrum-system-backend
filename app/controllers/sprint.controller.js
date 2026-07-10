const db = require("../models");
const Sprint = db.sprint;
const Op = db.Sequelize.Op;

exports.create = async (req, res) => {
  if (req.body.name === undefined) {
    return res.status(400).send({ message: "Name cannot be empty!" });
  } else if (req.body.startDate === undefined) {
    return res.status(400).send({ message: "Start date cannot be empty!" });
  } else if (req.body.endDate === undefined) {
    return res.status(400).send({ message: "End date cannot be empty!" });
  } else if (req.body.projectId === undefined) {
    return res.status(400).send({ message: "Project Id cannot be empty!" });
  }

  const sprint = {
    name: req.body.name,
    startDate: req.body.startDate,
    endDate: req.body.endDate,
    projectId: req.body.projectId,
  };

  try {
    const data = await Sprint.create(sprint);
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: err.message || "Error creating sprint." });
  }
};

exports.findAllForProject = async (req, res) => {
  const projectId = req.params.projectId;
  try {
    const data = await Sprint.findAll({
      where: { projectId: projectId },
      order: [["startDate", "ASC"]],
    });
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: err.message || "Error retrieving sprints." });
  }
};

exports.findOne = async (req, res) => {
  const id = req.params.id;
  try {
    const data = await Sprint.findByPk(id);
    if (data) {
      res.send(data);
    } else {
      res.status(404).send({ message: `Cannot find sprint with id=${id}.` });
    }
  } catch (err) {
    res.status(500).send({ message: err.message || "Error retrieving sprint." });
  }
};

exports.update = async (req, res) => {
  const id = req.params.id;
  try {
    const number = await Sprint.update(req.body, { where: { id: id } });
    if (number == 1) {
      res.send({ message: "Sprint was updated successfully." });
    } else {
      res.send({ message: `Cannot update sprint with id=${id}.` });
    }
  } catch (err) {
    res.status(500).send({ message: err.message || "Error updating sprint." });
  }
};

exports.delete = async (req, res) => {
  const id = req.params.id;
  try {
    const number = await Sprint.destroy({ where: { id: id } });
    if (number == 1) {
      res.send({ message: "Sprint was deleted successfully!" });
    } else {
      res.send({ message: `Cannot delete sprint with id=${id}.` });
    }
  } catch (err) {
    res.status(500).send({ message: err.message || "Error deleting sprint." });
  }
};

exports.deleteAll = async (req, res) => {
  try {
    const number = await Sprint.destroy({ where: {}, truncate: false });
    res.send({ message: `${number} sprints were deleted successfully!` });
  } catch (err) {
    res.status(500).send({ message: err.message || "Error deleting all sprints." });
  }
};