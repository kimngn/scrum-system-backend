module.exports = (app) => {
  const team = require("../controllers/team.controller.js");
  const { authenticateRoute } = require("../authentication/authentication");
  var router = require("express").Router();

  router.post("/teams", [authenticateRoute], team.create);
  router.get("/teams/project/:projectId", [authenticateRoute], team.findAllForProject);
  router.get("/teams/:id", [authenticateRoute], team.findOne);
  router.put("/teams/:id", [authenticateRoute], team.update);
  router.delete("/teams/:id", [authenticateRoute], team.delete);
  router.post("/teammembers", [authenticateRoute], team.addMember);
  router.delete("/teammembers/:id", [authenticateRoute], team.removeMember);

  app.use("/scrumapi", router);
};