const db = require("../models");
const UserStory = db.userStory;
const ProjectColumn = db.projectColumn;

// Find all stories for one project
exports.findAllForProject = async (req, res) => {
  const projectId = req.params.projectId;
  try {
    const data = await UserStory.findAll({
      where: { projectId: projectId },
      include: [{ model: ProjectColumn, as: "column" }],
    });
    res.send(data);
  } catch (err) {
    res.status(500).send({
      message:
        err.message || "Some error occurred while retrieving the stories.",
    });
  }
};
