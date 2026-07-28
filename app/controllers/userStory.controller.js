const db = require("../models");
const UserStory = db.userStory;
const ProjectColumn = db.projectColumn;
const StoryAssignee = db.storyAssignee;

// Find all stories for one project
exports.findAllForProject = async (req, res) => {
  const projectId = req.params.projectId;
  try {
    const data = await UserStory.findAll({
      // Only get stories for this project.
      where: { projectId: projectId },
      // Include the column info and assignees for each story.
      include: [
        { model: ProjectColumn, as: "column" },
        {
          model: StoryAssignee,
          as: "assignee",
          include: [{ model: db.user, as: "user", attributes: ["id", "firstName", "lastName", "email"] }],
        },
      ],
    });
    res.send(data);
  } catch (err) {
    res.status(500).send({
      message:
        err.message || "Some error occurred while retrieving the stories.",
    });
  }
};

//find all stories 
exports.findAll = async (req, res) => {
  try {
    const count = await UserStory.count();
    const stories = await UserStory.findAll();
    res.send(stories);
  } catch (err) {
    console.error(err);

    res.status(500).send({
      message: err.message
    });
  }
};

// Create and save a new story
exports.create = async (req, res) => {
  const story = {
    title: req.body.title,
    description: req.body.description,
    priority: req.body.priority,
    storyPoint: req.body.storyPoint,
    projectId: req.body.projectId,
    columnId: req.body.columnId,
    type: req.body.type,
  };

  try {
    // Status matches the title of the column it's in.
    const column = await ProjectColumn.findByPk(story.columnId);
    story.status = column.title;

    const data = await UserStory.create(story);
    res.send(data);
  } catch (err) {
    res.status(400).send({
      message: err.message || "Some error occurred while creating the story.",
    });
  }
};

exports.update = async (req, res) => {
  const id = req.params.id;

  try {
    // Status matches the title of the column it's in.
    if (req.body.columnId !== undefined) {
      const column = await ProjectColumn.findByPk(req.body.columnId);
      req.body.status = column.title;
    }

    // Update a story by the id.
    await UserStory.update(req.body, {
      where: { id: id },
    });
    // Finds the updated story by its id and sends it back.
    const data = await UserStory.findByPk(id);
    res.send(data);
  } catch (err) {
    res.status(400).send({
      message: err.message || "Error updating story with id = " + id,
    });
  }
};

exports.delete = async (req, res) => {
  const id = req.params.id;

  try {
    // Delete the story with the given id
    const number = await UserStory.destroy({
      where: { id: id },
    });
    // If one story is deleted, send success message.
    if (number == 1) {
      res.send({ message: "User story was deleted successfully!" });
    } else {
      res.status(404).send({
        message: `Cannot find user story with id = ${id}.`,
      });
    }
  } catch (err) {
    res.status(400).send({
      message: err.message || "Could not delete story with id = " + id,
    });
  }
};