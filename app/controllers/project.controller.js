const db = require("../models");
const Project = db.project;
const Sprint = db.sprint;
const ProjectMembership = db.projectMembership;
const ProjectColumn = db.projectColumn;
const Op = db.Sequelize.Op;

// Default columns for new projects.
const defaultColumnTitles = [
  "Backlog",
  "To Do",
  "In Progress",
  "Ready for Test",
  "Testing",
  "Done",
];

exports.create = async (req, res) => {
  if (req.body.name === undefined) {
    return res.status(400).send({ message: "Name cannot be empty!" });
  } else if (req.body.description === undefined) {
    return res.status(400).send({ message: "Description cannot be empty!" });
  } else if (req.body.status === undefined) {
    return res.status(400).send({ message: "Status cannot be empty!" });
  } else if (req.body.userId === undefined) {
    return res.status(400).send({ message: "User Id cannot be empty!" });
  }

  const project = {
    name: req.body.name,
    description: req.body.description,
    status: req.body.status,
    startDate: req.body.startDate || null,
    endDate: req.body.endDate || null,
    userId: req.body.userId,
  };

  try {
    const data = await Project.create(project);

    // Adds the project's creator as a lead.
    await ProjectMembership.create({
      userId: data.userId,
      projectId: data.id,
      role: "lead",
    });

    // Adds the default storyboard columns.
    for (let i = 0; i < defaultColumnTitles.length; i++) {
      await ProjectColumn.create({
        title: defaultColumnTitles[i],
        displayOrder: i + 1,
        projectId: data.id,
      });
    }

    res.send(data);
  } catch (err) {
    res.status(500).send({ message: err.message || "Error creating project." });
  }
};

exports.findAllForUser = async (req, res) => {
  const userId = req.params.userId;
  try {
    const membershipProjectIds = await ProjectMembership.findAll({
      where: { userId: userId },
      attributes: ["projectId"],
    }).then(rows => rows.map(r => r.projectId));

    const data = await Project.findAll({
      where: {
        [Op.or]: [
          { userId: userId },
          { id: { [Op.in]: membershipProjectIds } },
        ],
      },
      include: [{ model: Sprint, as: "sprint", required: false }],
      order: [["name", "ASC"]],
    });
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: err.message || "Error retrieving projects." });
  }
};

exports.findOne = async (req, res) => {
  const id = req.params.id;
  try {
    const data = await Project.findAll({
      where: { id: id },
      include: [{ model: Sprint, as: "sprint", required: false }],
    });
    if (data) {
      res.send(data);
    } else {
      res.status(404).send({ message: `Cannot find project with id=${id}.` });
    }
  } catch (err) {
    res.status(500).send({ message: err.message || "Error retrieving project." });
  }
};

exports.update = async (req, res) => {
  const id = req.params.id;
  try {
    const number = await Project.update(req.body, { where: { id: id } });
    if (number == 1) {
      res.send({ message: "Project was updated successfully." });
    } else {
      res.send({ message: `Cannot update project with id=${id}.` });
    }
  } catch (err) {
    res.status(500).send({ message: err.message || "Error updating project." });
  }
};

exports.delete = async (req, res) => {
  const id = req.params.id;
  try {
    const number = await Project.destroy({ where: { id: id } });
    if (number == 1) {
      res.send({ message: "Project was deleted successfully!" });
    } else {
      res.send({ message: `Cannot delete project with id=${id}.` });
    }
  } catch (err) {
    res.status(500).send({ message: err.message || "Error deleting project." });
  }
};

exports.deleteAll = async (req, res) => {
  try {
    const number = await Project.destroy({ where: {}, truncate: false });
    res.send({ message: `${number} projects were deleted successfully!` });
  } catch (err) {
    res.status(500).send({ message: err.message || "Error deleting all projects." });
  }
};
exports.findAll = async (req, res) => {
  try {
    const data = await Project.findAll({
      include: [{ model: Sprint, as: "sprint", required: false }],
      order: [["name", "ASC"]],
    });
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: err.message || "Error retrieving projects." });
  }
};