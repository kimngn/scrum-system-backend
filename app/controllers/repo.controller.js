const db = require("../models");
const Repo = db.repo;
const Op = db.Sequelize.Op;
const { validateRepo } = require("../api/githubClient");

exports.create = async (req, res) => {
  // validate request's contents (make sure they are not empty)
  if (req.body.name === undefined) {
    return res.status(400).send({ message: "Name cannot be empty!" });
  } else if (req.body.repoUrl === undefined) {
    return res.status(400).send({ message: "RepoUrl cannot be empty!" });
  } else if (req.body.projectId === undefined) {
    return res.status(400).send({ message: "Project ID cannot be empty!" });
  }

  const repo = {
    name: req.body.name,
    repoUrl: req.body.repoUrl,
    projectId: req.body.projectId,
  };

  // validate if GitHub URL exists through githubClient
  try {
    await validateRepo(req.body.repoUrl);

    const data = await Repo.create(repo);
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: err.message || "Error creating repo." });
  }
};

exports.findAll = async (req, res) => {
  try {
    const data = await Repo.findAll({
      order: [["name", "ASC"]],
    });
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: err.message || "Error retrieving repos." });
  }
};

// get all repos tied to project using the projectId
exports.findAllForProject = async (req, res) => {
  const projectId = req.params.projectId;
  try {
    const data = await Repo.findAll({
      where: { projectId: projectId },
      order: [["name", "ASC"]],
    });
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: err.message || "Error retrieving repos." });
  }
};

exports.findOne = async (req, res) => {
  const id = req.params.id;
  try {
    const data = await Repo.findAll({
      where: { id: id },
    });
    if (data) {
      res.send(data);
    } else {
      res.status(404).send({ message: `Cannot find a repo with id=${id}.` });
    }
  } catch (err) {
    res.status(500).send({ message: err.message || "Error retrieving repo." });
  }
};

exports.update = async (req, res) => {
  const id = req.params.id;
  try {
    const number = await Repo.update(req.body, { where: { id: id } });
    if (number == 1) {
      res.send({ message: "Repo was updated successfully." });
    } else {
      res.send({ message: `Cannot update repo with id=${id}.` });
    }
  } catch (err) {
    res.status(500).send({ message: err.message || "Error updating repo." });
  }
};

exports.delete = async (req, res) => {
  const id = req.params.id;
  try {
    const number = await Repo.destroy({ where: { id: id } });
    if (number == 1) {
      res.send({ message: "Repo was deleted successfully!" });
    } else {
      res.send({ message: `Cannot delete repo with id=${id}.` });
    }
  } catch (err) {
    res.status(500).send({ message: err.message || "Error deleting repo." });
  }
};

exports.deleteAll = async (req, res) => {
  try {
    const number = await Project.destroy({ where: {}, truncate: false });
    res.send({ message: `${number} repos were deleted successfully!` });
  } catch (err) {
    res
      .status(500)
      .send({ message: err.message || "Error deleting all repos." });
  }
};
