module.exports = (app) => {
  const project = require("../controllers/project.controller.js");
  const { authenticateRoute } = require("../authentication/authentication");
  var router = require("express").Router();

  router.post("/projects/", [authenticateRoute], project.create);
  router.get("/projects/user/:userId", [authenticateRoute], project.findAllForUser);
  router.get("/projects/:id", [authenticateRoute], project.findOne);
  router.put("/projects/:id", [authenticateRoute], project.update);
  router.delete("/projects/:id", [authenticateRoute], project.delete);
  router.delete("/projects/", [authenticateRoute], project.deleteAll);

  app.use("/recipeapi", router);
};