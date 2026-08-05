const db = require("../models");
const ProjectColumn = db.projectColumn;

// Only leads and admins can modifycolumns.
function canManageColumns(role) {
  return role === "lead" || role === "admin";
}

// Get all columns for a project, in display order.
exports.findAllForProject = async (req, res) => {
  const projectId = req.params.projectId;
  try {
    const data = await ProjectColumn.findAll({
      where: { projectId: projectId },
      order: [["displayOrder", "ASC"]],
    });
    res.send(data);
  } catch (err) {
    res.status(500).send({
      message: err.message || "Error retrieving columns.",
    });
  }
};

// Create a new column.
exports.create = async (req, res) => {
  if (!canManageColumns(req.body.role)) {
    return res.status(401).send({ message: "Only team leads and admins can create columns." });
  }

  const column = {
    title: req.body.title,
    displayOrder: req.body.displayOrder,
    projectId: req.body.projectId,
  };

  try {
    const data = await ProjectColumn.create(column);
    res.send(data);
  } catch (err) {
    res.status(400).send({
      message: err.message || "Error creating column.",
    });
  }
};

// Update a column's title/order.
exports.update = async (req, res) => {
  if (!canManageColumns(req.body.role)) {
    return res.status(401).send({ message: "Only team leads and admins can update columns." });
  }

  const id = req.params.id;

  try {
    await ProjectColumn.update(req.body, { where: { id: id } });
    const data = await ProjectColumn.findByPk(id);
    res.send(data);
  } catch (err) {
    res.status(400).send({
      message: err.message || "Error updating column with id = " + id,
    });
  }
};

// Delete a column. 
exports.delete = async (req, res) => {
  if (!canManageColumns(req.body.role)) {
    return res.status(401).send({ message: "Only team leads and admins can delete columns." });
  }

  const id = req.params.id;

  try {
    const number = await ProjectColumn.destroy({ where: { id: id } });
    if (number == 1) {
      res.send({ message: "Column deleted successfully!" });
    } else {
      res.status(400).send({ message: `Cannot delete column with id=${id}.` });
    }
  } catch (err) {
    res.status(500).send({
      message: err.message || "Error deleting column with id = " + id,
    });
  }
};
