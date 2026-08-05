module.exports = (app) => {
  const branch = require("../controllers/branch.controller.js");
  const { authenticateRoute } = require("../authentication/authentication");
  var router = require("express").Router();

  router.post("/branches/", [authenticateRoute], branch.create);

  router.get("/branches/", [authenticateRoute], branch.findAllBranches);

  router.get(
    "/branches/story/:storyId",
    [authenticateRoute],
    branch.findBranchByStoryId,
  );

  router.delete("/branches/", [authenticateRoute], branch.deleteAll);
  app.use("/scrumapi", router);
};
