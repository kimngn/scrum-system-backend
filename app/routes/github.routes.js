// route exposes getData and waits until frontend/Postman sends a request
var router = require("express").Router();
const {
  validateRepo,
  getRepo,
  getBranches,
  getPullRequests,
} = require("../api/githubClient");

module.exports = (app) => {
  router.get("/api/githubClient/repo", async (req, res) => {
    try {
      const response = await validateRepo();
      res.json(response);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/api/githubClient/repo", async (req, res) => {
    try {
      const response = await getRepo();
      res.json(response);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/api/githubClient/branches", async (req, res) => {
    try {
      const response = await getBranches();
      res.json(response);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/api/githubClient/pulls", async (req, res) => {
    try {
      const response = await getPullRequests();
      res.json(response);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.use("/scrumapi", router);
};
