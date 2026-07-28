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
    const membership = await ProjectMembership.findByPk(id);
    if (!membership) {
      return res.status(404).send({ message: `Cannot find membership with id=${id}.` });
    }

    const { userId, projectId } = membership;

    const teams = await db.team.findAll({ where: { projectId } });
    const teamIds = teams.map((t) => t.id);
    if (teamIds.length > 0) {
      await db.teamMember.destroy({ where: { userId, teamId: teamIds } });
    }

    await membership.destroy();
    res.send({ message: "Membership deleted successfully!" });
  } catch (err) {
    res.status(500).send({ message: err.message || "Error deleting membership." });
  }
};