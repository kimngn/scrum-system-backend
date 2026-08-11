const db = require("../models");

const AcceptanceCriteria =
  db.acceptanceCriteria;


// -----------------------------------------------------
// Get all acceptance criteria for one User Story
// -----------------------------------------------------
exports.findAllForStory = async (req, res) => {
  const userStoryId =
    req.params.userStoryId;

  try {
    const data =
      await AcceptanceCriteria.findAll({
        where: {
          userStoryId: userStoryId,
        },

        order: [
          ["id", "ASC"],
        ],
      });

    res.send(data);
  } catch (err) {
    res.status(500).send({
      message:
        err.message ||
        "Could not retrieve acceptance criteria.",
    });
  }
};


// -----------------------------------------------------
// Create acceptance criterion
// -----------------------------------------------------
exports.create = async (req, res) => {
  if (!req.body.description?.trim()) {
    return res.status(400).send({
      message:
        "Acceptance criteria description is required.",
    });
  }

  if (!req.body.userStoryId) {
    return res.status(400).send({
      message:
        "User Story ID is required.",
    });
  }

  try {
    const data =
      await AcceptanceCriteria.create({
        title:
          req.body.title || null,

        description:
          req.body.description.trim(),

        completed: false,

        userStoryId:
          req.body.userStoryId,
      });

    res.send(data);
  } catch (err) {
    res.status(400).send({
      message:
        err.message ||
        "Could not create acceptance criteria.",
    });
  }
};


// -----------------------------------------------------
// Update criterion
// -----------------------------------------------------
exports.update = async (req, res) => {
  const id = req.params.id;

  try {
    await AcceptanceCriteria.update(
      req.body,
      {
        where: {
          id: id,
        },
      }
    );

    const data =
      await AcceptanceCriteria.findByPk(id);

    if (!data) {
      return res.status(404).send({
        message:
          `Cannot find acceptance criteria with id=${id}.`,
      });
    }

    res.send(data);
  } catch (err) {
    res.status(400).send({
      message:
        err.message ||
        "Could not update acceptance criteria.",
    });
  }
};


// -----------------------------------------------------
// Delete criterion
// -----------------------------------------------------
exports.delete = async (req, res) => {
  const id = req.params.id;

  try {
    const number =
      await AcceptanceCriteria.destroy({
        where: {
          id: id,
        },
      });

    if (number === 1) {
      return res.send({
        message:
          "Acceptance criteria deleted successfully.",
      });
    }

    res.status(404).send({
      message:
        `Cannot find acceptance criteria with id=${id}.`,
    });
  } catch (err) {
    res.status(400).send({
      message:
        err.message ||
        "Could not delete acceptance criteria.",
    });
  }
};