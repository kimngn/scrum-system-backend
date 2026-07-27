const db = require("../models");
const StoryAssignee = db.storyAssignee;

// Assign a user to a story
exports.create = async (req, res) => {
  if (req.body.userId === undefined) {
    return res.status(400).send({ message: "User ID cannot be empty!" });
  } else if (req.body.userStoryId === undefined) {
    return res.status(400).send({ message: "User Story ID cannot be empty!" });
  }

  const assignee = {
    userId: req.body.userId,
    userStoryId: req.body.userStoryId,
  };

  try {
    const data = await StoryAssignee.create(assignee);
    res.send(data);
  } catch (err) {
    res.status(500).send({
      message: err.message || "Error creating story assignee.",
    });
  }
};

// Find all assignees for one story
exports.findAllForStory = async (req, res) => {
  const userStoryId = req.params.userStoryId;
  try {
    const data = await StoryAssignee.findAll({
      where: { userStoryId: userStoryId },
      include: [{ model: db.user, as: "user", attributes: ["id", "firstName", "lastName", "email"] }],
    });
    res.send(data);
  } catch (err) {
    res.status(500).send({
      message: err.message || "Error retrieving story assignees.",
    });
  }
};

// Remove a user from a story
exports.delete = async (req, res) => {
  const id = req.params.id;
  try {
    const number = await StoryAssignee.destroy({ where: { id: id } });
    if (number == 1) {
      res.send({ message: "Story assignee deleted successfully!" });
    } else {
      res.status(400).send({ message: `Cannot delete story assignee with id=${id}.` });
    }
  } catch (err) {
    res.status(500).send({
      message: err.message || "Error deleting story assignee.",
    });
  }
};
