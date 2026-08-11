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
    const membership = await ProjectMembership.findByPk(id, {
      include: [{ model: db.user, as: "user", attributes: ["id", "role"] }],
    });
    if (!membership) {
      return res.status(404).send({ message: `Cannot find membership with id=${id}.` });
    }

    const requester = await db.user.findByPk(req.userId, { attributes: ["role"] });
    if (requester?.role === "lead" && membership.user?.role === "admin") {
      return res.status(403).send({ message: "Project leads cannot remove admin users from projects." });
    }

    await membership.destroy();
    res.send({ message: "Membership deleted successfully!" });
  } catch (err) {
    res.status(500).send({ message: err.message || "Error deleting membership." });
  }
};

exports.update = async (req, res) => {
  const id = req.params.id;
  try {
    const membership = await ProjectMembership.findByPk(id);
    if (!membership) {
      return res.status(404).send({ message: `Cannot find membership with id=${id}.` });
    }

    await membership.update({ role: req.body.role });
    res.send({ message: "Membership updated successfully!" });
  } catch (err) {
    res.status(500).send({ message: err.message || "Error updating membership." });
  }
};