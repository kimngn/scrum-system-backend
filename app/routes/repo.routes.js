module.exports = (app) => {
  const repo = require("../controllers/repo.controller.js");
  const { authenticateRoute } = require("../authentication/authentication");
  var router = require("express").Router();

  router.post("/repos/", [authenticateRoute], repo.create);
  router.get("/repos/", [authenticateRoute], repo.findAll);
  router.get(
    "/repos/user/:userId",
    [authenticateRoute],
    repo.findAllForProject,
  );
  router.get("/repos/:id", [authenticateRoute], repo.findOne);
  router.put("/repos/:id", [authenticateRoute], repo.update);
  router.delete("/repos/:id", [authenticateRoute], repo.delete);
  router.delete("/repos/", [authenticateRoute], repo.deleteAll);

  app.use("/recipeapi", router);
};
