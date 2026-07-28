const db = require("../models");
const Sprint = db.sprint;
const Op = db.Sequelize.Op;

function findSprintIndex(sprints, id) {
  const targetId = Number(id);
  for (let i = 0; i < sprints.length; i++) {
    if (sprints[i].id === targetId) {
      return i;
    }
  }
  return -1;
}

function earlierSprintNotCompleted(sprints, index) {
  for (let i = 0; i < index; i++) {
    if (sprints[i].status !== "completed") {
      return true;
    }
  }
  return false;
}

function laterSprintNotPlanned(sprints, index) {
  for (let i = index + 1; i < sprints.length; i++) {
    if (sprints[i].status !== "planned") {
      return true;
    }
  }
  return false;
}

function anotherSprintIsActive(sprints, targetId) {
  const targetIdNum = Number(targetId);
  for (let i = 0; i < sprints.length; i++) {
    if (sprints[i].id !== targetIdNum && sprints[i].status === "active") {
      return true;
    }
  }
  return false;
}

function validateStatusOrder(sprints, targetId, newStatus) {
  const index = findSprintIndex(sprints, targetId);

  if (newStatus === "completed") {
    if (earlierSprintNotCompleted(sprints, index)) {
      return "All earlier sprints must be completed before completing this one.";
    }
  } else if (newStatus === "active") {
    if (earlierSprintNotCompleted(sprints, index)) {
      return "All earlier sprints must be completed before starting this one.";
    }
    if (laterSprintNotPlanned(sprints, index)) {
      return "Later sprints must be planned before starting this one.";
    }
    if (anotherSprintIsActive(sprints, targetId)) {
      return "Another sprint is already active in this project.";
    }
  } else if (newStatus === "planned") {
    if (laterSprintNotPlanned(sprints, index)) {
      return "Later sprints must be planned before reverting this one.";
    }
  }
  return null;
}

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

  try {
    const nameExists = await Sprint.findOne({
      where: {
        projectId: req.body.projectId,
        name: req.body.name,
      },
    });
    if (nameExists) {
      return res.status(409).send({ message: "A sprint with this name already exists in this project." });
    }

    const overlapping = await Sprint.findOne({
      where: {
        projectId: req.body.projectId,
        startDate: { [Op.lte]: req.body.endDate },
        endDate: { [Op.gte]: req.body.startDate },
      },
    });
    if (overlapping) {
      return res.status(409).send({ message: "Sprint dates overlap with an existing sprint." });
    }

    const status = req.body.status || "planned";
    if (status !== "planned") {
      const projectSprints = await Sprint.findAll({
        where: { projectId: req.body.projectId },
      });
      const newSprintForCheck = {
        id: 0,
        startDate: req.body.startDate,
        status: status,
      };
      const sprintsForCheck = [...projectSprints, newSprintForCheck].sort(
        (a, b) => new Date(a.startDate) - new Date(b.startDate)
      );
      const orderError = validateStatusOrder(sprintsForCheck, 0, status);
      if (orderError) {
        return res.status(409).send({ message: orderError });
      }
    }

    const data = await Sprint.create({
      name: req.body.name,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      status,
      projectId: req.body.projectId,
    });
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
    const current = await Sprint.findByPk(id);
    if (!current) {
      return res.status(404).send({ message: `Cannot find sprint with id=${id}.` });
    }

    if (req.body.name !== undefined && req.body.name !== current.name) {
      const nameExists = await Sprint.findOne({
        where: {
          projectId: current.projectId,
          name: req.body.name,
          id: { [Op.ne]: id },
        },
      });
      if (nameExists) {
        return res.status(409).send({ message: "A sprint with this name already exists in this project." });
      }
    }

    if (req.body.status !== undefined) {
      const projectSprints = await Sprint.findAll({
        where: { projectId: current.projectId },
      });
      const orderError = validateStatusOrder(projectSprints, id, req.body.status);
      if (orderError) {
        return res.status(409).send({ message: orderError });
      }
    }

    if (req.body.startDate || req.body.endDate) {
      const startDate = req.body.startDate || current.startDate;
      const endDate = req.body.endDate || current.endDate;
      const overlapping = await Sprint.findOne({
        where: {
          projectId: current.projectId,
          id: { [Op.ne]: id },
          startDate: { [Op.lte]: endDate },
          endDate: { [Op.gte]: startDate },
        },
      });
      if (overlapping) {
        return res.status(409).send({ message: "Sprint dates overlap with an existing sprint." });
      }
    }

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
    const current = await Sprint.findByPk(id);
    if (!current) {
      return res.status(404).send({ message: `Cannot find sprint with id=${id}.` });
    }
    if (current.status === "active") {
      return res.status(409).send({ message: "Cannot delete a sprint that is active." });
    }
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

exports.findAll = async (req, res) => {
  try {
    const data = await Sprint.findAll({
      order: [["startDate", "ASC"]],
    });
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: err.message || "Error retrieving sprints." });
  }
};