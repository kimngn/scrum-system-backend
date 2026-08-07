module.exports = (app) => {
  const branch = require("../controllers/branch.controller.js");
  const { authenticateRoute } = require("../authentication/authentication");
  var router = require("express").Router();

  router.post("/branches/", [authenticateRoute], branch.create);

  router.put("/branches/:id", [authenticateRoute], branch.update);

  router.get("/branches/", [authenticateRoute], branch.findAllBranches);

  router.get(
    "/branches/story/:userStoryId",
    [authenticateRoute],
    branch.findBranchByStoryId,
  );

  router.delete("/branches/:id", [authenticateRoute], branch.delete);
  app.use("/scrumapi", router);
};
