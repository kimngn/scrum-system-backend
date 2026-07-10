module.exports = (app) => {
  const sprint = require("../controllers/sprint.controller.js");
  const { authenticateRoute } = require("../authentication/authentication");
  var router = require("express").Router();

  router.post("/sprints/", [authenticateRoute], sprint.create);
  router.get("/sprints/project/:projectId", [authenticateRoute], sprint.findAllForProject);
  router.get("/sprints/:id", [authenticateRoute], sprint.findOne);
  router.put("/sprints/:id", [authenticateRoute], sprint.update);
  router.delete("/sprints/:id", [authenticateRoute], sprint.delete);
  router.delete("/sprints/", [authenticateRoute], sprint.deleteAll);

  app.use("/recipeapi", router);
};