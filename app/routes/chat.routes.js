module.exports = (app) => {
  const chat = require("../controllers/chat.controller.js");
  const { authenticateRoute } = require("../authentication/authentication");
  var router = require("express").Router();

  router.post("/chat", [authenticateRoute], chat.sendMessage);

  app.use("/scrumapi", router);
};
