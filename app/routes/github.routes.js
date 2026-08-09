// route exposes getData and waits until frontend/Postman sends a request

const githubClient = require("../api/githubClient.js");

const axios = require("axios");
var router = require("express").Router();

const {
  getRepoData,
  getRepo,
  getBranches,
  getPullRequests,
} = require("../api/githubClient");

module.exports = (app) => {
  // take the repo URL and token in project's edit dialog directly and validate the Github repo with them
  router.post("/github/validate", async (req, res) => {
    const repoUrl = req.body.repoUrl;
    const token = req.body.token;

    if (!token) {
      // make sure the token was actually entered
      return res.status(400).json({
        message: "No token given for validation.",
      });
    }
    // extract owner and repo
    const url = repoUrl.replace("https://github.com/", "");
    const [owner, repoName] = url.split("/");

    try {
      const data = await githubClient.getRepoData(token, owner, repoName);
      return res.json({ valid: true, data });
    } catch (err) {
      if (err.response?.status === 401) {
        return res.status(400).json({
          message: "Bad credentials, please check your personal access token.",
        });
      }

      if (err.response?.status === 404) {
        return res.status(404).json({
          message: "This GitHub repo URL doesn't exist.",
        });
      }
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

  router.get("/github/:projectId", async (req, res) => {
    const projectId = req.params.projectId;

    const repoResponse = await axios.get(
      `http://localhost:3200/scrumapi/repos/project/${projectId}`,
      {
        headers: {
          Authorization: req.headers.authorization, // forward user's token
        },
      },
    );

    const repos = repoResponse.data;

    if (!repos.length) {
      return res
        .status(404)
        .json({ message: "No repos found for this project." });
    }

    const repo = repos[0];

    if (!repo || !repo.token) {
      return res.status(400).json({
        message:
          "No GitHub token found! Please add a valid Github Personal Access Token to your project.",
      });
    }

    const token = repo.token;

    // extract the owner
    const url = repo.repoUrl.replace("https://github.com/", "");
    const [owner, repoName] = url.split("/");

    try {
      const data = await githubClient.getRepoData(token, owner, repoName);
      res.json(data);
    } catch (err) {
      if (err.response?.status === 401) {
        return res.status(401).json({
          message:
            "Bad credentials, please check your project's personal access token.",
        });
      }
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
