module.exports = (app) => {
  const projectMembership = require("../controllers/projectMembership.controller.js");
  const { authenticateRoute } = require("../authentication/authentication");
  var router = require("express").Router();

  router.post("/projectmemberships/", [authenticateRoute], projectMembership.create);
  router.get("/projectmemberships/project/:projectId", [authenticateRoute], projectMembership.findAllForProject);
  router.put("/projectmemberships/:id", [authenticateRoute], projectMembership.update);
  router.delete("/projectmemberships/:id", [authenticateRoute], projectMembership.delete);

  app.use("/scrumapi", router);
};