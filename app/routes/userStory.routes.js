module.exports = (app) => {
  const UserStory = require("../controllers/userStory.controller.js");
  var router = require("express").Router();

  // Retrieve all stories for a project
  router.get("/projects/:projectId/stories", UserStory.findAllForProject);

  //get all stories
  router.get("/stories", UserStory.findAll);

  // Create a new story
  router.post("/stories", UserStory.create);

  // Update a story
  router.put("/stories/:id", UserStory.update);

  // Delete a story
  router.delete("/stories/:id", UserStory.delete);

  app.use("/recipeapi", router);
};
