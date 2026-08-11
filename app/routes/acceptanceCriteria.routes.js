module.exports = (app) => {
  const controller =
    require(
      "../controllers/acceptanceCriteria.controller"
    );

  const router =
    require("express").Router();

  // Get ACs belonging to one story
  router.get(
    "/story/:userStoryId",
    controller.findAllForStory
  );

  // Create
  router.post(
    "/",
    controller.create
  );

  // Update text OR completed state
  router.put(
    "/:id",
    controller.update
  );

  // Delete
  router.delete(
    "/:id",
    controller.delete
  );

  app.use(
    "/scrumapi/acceptancecriteria",
    router
  );
};