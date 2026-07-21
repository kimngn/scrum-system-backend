const db = require("../models");
const ProjectMembership = db.projectMembership;

exports.create = async (req, res) => {
  if (req.body.userId === undefined) {
    return res.status(400).send({ message: "User ID cannot be empty!" });
  } else if (req.body.projectId === undefined) {
    return res.status(400).send({ message: "Project ID cannot be empty!" });
  }

  const membership = {
    userId: req.body.userId,
    projectId: req.body.projectId,
    role: req.body.role || "member",
  };

  try {
    const data = await ProjectMembership.create(membership);
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: err.message || "Error creating membership." });
  }
};

exports.findAllForProject = async (req, res) => {
  const projectId = req.params.projectId;
  try {
    const data = await ProjectMembership.findAll({
      where: { projectId: projectId },
      include: [{ model: db.user, as: "user", attributes: ["id", "firstName", "lastName", "email"] }],
    });
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: err.message || "Error retrieving memberships." });
  }
};

exports.delete = async (req, res) => {
  const id = req.params.id;
  try {
    const number = await ProjectMembership.destroy({ where: { id: id } });
    if (number == 1) {
      res.send({ message: "Membership deleted successfully!" });
    } else {
      res.send({ message: `Cannot delete membership with id=${id}.` });
    }
  } catch (err) {
    res.status(500).send({ message: err.message || "Error deleting membership." });
  }
};