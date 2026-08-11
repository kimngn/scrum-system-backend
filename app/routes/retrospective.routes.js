module.exports = (app) => {
  const retrospective = require("../controllers/retrospective.controller.js");

  const router = require("express").Router();

  router.get(
    "/retrospectives/sprint/:sprintId",
    retrospective.findBySprint
  );

  router.post(
    "/retrospectives",
    retrospective.save
  );

  app.use("/scrumapi", router);
};