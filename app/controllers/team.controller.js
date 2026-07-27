const db = require("../models");
const Team = db.team;
const TeamMember = db.teamMember;
const User = db.user;
const UserStory = db.userStory;
const Op = db.Sequelize.Op;

exports.create = async (req, res) => {
  if (!req.body.name) return res.status(400).send({ message: "Name cannot be empty!" });
  if (!req.body.projectId) return res.status(400).send({ message: "Project ID cannot be empty!" });

  try {
    const team = await Team.create({
      name: req.body.name,
      description: req.body.description || null,
      projectId: req.body.projectId,
    });

    if (req.body.members && Array.isArray(req.body.members)) {
      const memberRows = req.body.members.map((userId) => ({ teamId: team.id, userId }));
      await TeamMember.bulkCreate(memberRows);
    }

    res.send(team);
  } catch (err) {
    res.status(500).send({ message: err.message || "Error creating team." });
  }
};

exports.findAllForProject = async (req, res) => {
  const projectId = req.params.projectId;
  try {
    const data = await Team.findAll({
      where: { projectId },
      include: [
        {
          model: TeamMember,
          as: "member",
          include: [{ model: User, as: "user", attributes: ["id", "firstName", "lastName", "email"] }],
        },
      ],
      order: [["name", "ASC"]],
    });
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: err.message || "Error retrieving teams." });
  }
};

exports.findOne = async (req, res) => {
  const id = req.params.id;
  try {
    const team = await Team.findOne({
      where: { id },
      include: [
        {
          model: TeamMember,
          as: "member",
          include: [{ model: User, as: "user", attributes: ["id", "firstName", "lastName", "email"] }],
        },
      ],
    });

    if (!team) return res.status(404).send({ message: `Cannot find team with id=${id}.` });

    const memberIds = team.member.map((m) => m.userId);

    const storyCounts = await db.storyAssignee.findAll({
      where: { userId: { [Op.in]: memberIds } },
      include: [
        {
          model: UserStory,
          as: "story",
          where: { teamId: id },
          attributes: ["id", "status"],
        },
      ],
    });

    const countMap = {};
    memberIds.forEach((uid) => { countMap[uid] = { inProgress: 0, total: 0 }; });
    storyCounts.forEach((sa) => {
      if (!sa.story) return;
      countMap[sa.userId].total += 1;
      if (sa.story.status && sa.story.status.toLowerCase() === "in progress") {
        countMap[sa.userId].inProgress += 1;
      }
    });

    const result = team.toJSON();
    result.member = result.member.map((m) => ({
      ...m,
      storyCounts: countMap[m.userId] || { inProgress: 0, total: 0 },
    }));

    res.send(result);
  } catch (err) {
    res.status(500).send({ message: err.message || "Error retrieving team." });
  }
};

exports.update = async (req, res) => {
  const id = req.params.id;
  try {
    const number = await Team.update(req.body, { where: { id } });
    if (number == 1) {
      res.send({ message: "Team updated successfully." });
    } else {
      res.status(404).send({ message: `Cannot update team with id=${id}.` });
    }
  } catch (err) {
    res.status(500).send({ message: err.message || "Error updating team." });
  }
};

exports.delete = async (req, res) => {
  const id = req.params.id;
  try {
    const number = await Team.destroy({ where: { id } });
    if (number == 1) {
      res.send({ message: "Team deleted successfully!" });
    } else {
      res.status(404).send({ message: `Cannot delete team with id=${id}.` });
    }
  } catch (err) {
    res.status(500).send({ message: err.message || "Error deleting team." });
  }
};

exports.addMember = async (req, res) => {
  if (!req.body.teamId) return res.status(400).send({ message: "Team ID cannot be empty!" });
  if (!req.body.userId) return res.status(400).send({ message: "User ID cannot be empty!" });

  try {
    const existing = await TeamMember.findOne({ where: { teamId: req.body.teamId, userId: req.body.userId } });
    if (existing) return res.status(400).send({ message: "User is already a member of this team." });

    const data = await TeamMember.create({ teamId: req.body.teamId, userId: req.body.userId });
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: err.message || "Error adding team member." });
  }
};

exports.removeMember = async (req, res) => {
  const id = req.params.id;
  try {
    const number = await TeamMember.destroy({ where: { id } });
    if (number == 1) {
      res.send({ message: "Team member removed successfully!" });
    } else {
      res.status(404).send({ message: `Cannot remove team member with id=${id}.` });
    }
  } catch (err) {
    res.status(500).send({ message: err.message || "Error removing team member." });
  }
};