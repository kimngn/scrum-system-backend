module.exports = (app) => {
  const ProjectColumn = require("../controllers/projectColumn.controller.js");
  var router = require("express").Router();

  router.get("/projects/:projectId/columns", ProjectColumn.findAllForProject);
  router.post("/columns", ProjectColumn.create);
  router.put("/columns/:id", ProjectColumn.update);
  router.delete("/columns/:id", ProjectColumn.delete);

  app.use("/scrumapi", router);
};
