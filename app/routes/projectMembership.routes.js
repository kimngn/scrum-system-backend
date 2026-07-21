module.exports = (app) => {
  const projectMembership = require("../controllers/projectMembership.controller.js");
  const { authenticateRoute } = require("../authentication/authentication");
  var router = require("express").Router();

  router.post("/projectmemberships/", [authenticateRoute], projectMembership.create);
  router.get("/projectmemberships/project/:projectId", [authenticateRoute], projectMembership.findAllForProject);
  router.delete("/projectmemberships/:id", [authenticateRoute], projectMembership.delete);

  app.use("/recipeapi", router);
};