const db = require("../models");
const Branch = db.branch;
const Op = db.Sequelize.Op;

exports.create = async (req, res) => {
  if (req.body.title === undefined) {
    return res.status(400).send({ message: "Title cannot be empty!" });
  } else if (req.body.repoId === undefined) {
    return res.status(400).send({ message: "Repo ID cannot be empty!" });
  } else if (req.body.userStoryId === undefined) {
    return res.status(400).send({ message: "User story ID cannot be empty!" });
  } else if (req.body.columnId === undefined) {
    return res.status(400).send({ message: "Column ID cannot be empty!" });
  }

  const branch = {
    title: req.body.title,
    repoId: req.body.repoId,
    userStoryId: req.body.userStoryId,
    columnId: req.body.columnId,
  };

  try {
    const data = await Branch.create(branch);
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: err.message || "Error creating branch." });
  }
};

exports.update = async (req, res) => {
  const id = req.params.id;

  try {
    const num = await Branch.update(req.body, {
      where: { id: id },
    });
    if (num == 1) {
      res.send({
        message: "Branch was updated successfully.",
      });
    } else {
      res.send({
        message: `Cannot update Branch with id=${id}. Maybe Branch was not found or req.body is empty!`,
      });
    }
  } catch (err) {
    res.status(500).send({
      message: err.message || "Error updating Branch with id=" + id,
    });
  }
};

exports.findBranchByStoryId = async (req, res) => {
  const userStoryId = req.params.userStoryId;
  try {
    const data = await Branch.findOne({
      where: {
        userStoryId: userStoryId,
      },
      order: [["createdAt", "ASC"]],
    });
    res.json(data || {}); // getting issues, adding {}
  } catch (err) {
    res
      .status(500)
      .send({ message: err.message || "Error retrieving branch." });
  }
};

exports.findAllBranches = async (req, res) => {
  try {
    const data = await Branch.findAll({
      order: [["createdAt", "ASC"]],
    });
    res.send(data);
  } catch (err) {
    res
      .status(500)
      .send({ message: err.message || "Error retrieving branches." });
  }
};

exports.deleteAll = async (req, res) => {
  try {
    const number = await Branch.destroy({ where: {}, truncate: false });
    res.send({ message: `${number} branches were deleted successfully!` });
  } catch (err) {
    res
      .status(500)
      .send({ message: err.message || "Error deleting all branches." });
  }
};
