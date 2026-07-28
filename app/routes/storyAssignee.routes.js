module.exports = (app) => {
  const StoryAssignee = require("../controllers/storyAssignee.controller.js");
  var router = require("express").Router();

  router.post("/storyassignees", StoryAssignee.create);
  router.get(
    "/storyassignees/story/:userStoryId",
    StoryAssignee.findAllForStory,
  );
  router.delete("/storyassignees/:id", StoryAssignee.delete);
  app.use("/scrumapi", router);
};
