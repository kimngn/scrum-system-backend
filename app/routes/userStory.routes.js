module.exports = (app) => {
  const UserStory = require("../controllers/userStory.controller.js");
  var router = require("express").Router();

  // Retrieve all stories for a project
  router.get("/projects/:projectId/stories", UserStory.findAllForProject);

  app.use("/recipeapi", router);
};
