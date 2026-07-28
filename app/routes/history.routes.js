module.exports = (app) => {
  const history = require("../controllers/history.controller.js");
  const { authenticateRoute } = require("../authentication/authentication");
  var router = require("express").Router();

  router.post("/histories/", [authenticateRoute], history.create);

  router.get(
    "/histories/project/",
    [authenticateRoute],
    history.findProjectActions,
  );

  router.get(
    "/histories/project/:projectId",
    [authenticateRoute],
    history.findProjectActionsByProjectId,
  );

  router.delete("/histories/", [authenticateRoute], history.deleteAll);

  app.use("/scrumapi", router);
};
