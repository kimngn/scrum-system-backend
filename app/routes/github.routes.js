// route exposes getData and waits until frontend/Postman sends a request

const githubClient = require("../api/githubClient.js");

const axios = require("axios");
var router = require("express").Router();

const {
  getRepoData,
  getBranches,
  getShaAndDefaultBranch,
  getPullRequests,
  postBranch,
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

  // grab branches from Github

  router.post("/api/github/branches", async (req, res) => {
    const repoUrl = req.body.repoUrl;
    const token = req.body.token;

    if (!token) {
      // make sure the project actually has a token
      return res.status(400).json({
        message: "No personal access token associated with this project.",
      });
    }
    // extract owner and repo
    const url = repoUrl.replace("https://github.com/", "");
    const [owner, repoName] = url.split("/");

    try {
      const response = await githubClient.getBranches(token, owner, repoName);
      console.log("Branches:" + response);
      return res.json(response);
    } catch (err) {
      if (err.response?.status === 401 || 404) {
        return res.status(400).json({
          message: "Failed to retrieve branches.",
        });
      }
    }
  });

  router.post("/api/github/main", async (req, res) => {
    const repoUrl = req.body.repoUrl;
    const token = req.body.token;

    if (!token) {
      // make sure the project actually has a token
      return res.status(400).json({
        message: "No personal access token associated with this project.",
      });
    }
    // extract owner and repo
    const url = repoUrl.replace("https://github.com/", "");
    const [owner, repoName] = url.split("/");

    try {
      const response = await githubClient.getShaAndDefaultBranch(
        token,
        owner,
        repoName,
      );
      console.log("Sha:", response.sha);
      console.log("Ref:", response.ref);

      return res.json(response);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 404) {
        return res.status(400).json({
          message:
            "Failed to retrieve sha and ref." + err.response.data.message,
        });
      }
    }
  });

  // grab pull requests from Github
  router.post("/api/github/pulls", async (req, res) => {
    console.log("BODY:", req.body);
    const repoUrl = req.body.repoUrl;
    const token = req.body.token;
    const branchName = req.body.branchName;

    if (!token) {
      // make sure the project actually has a token
      return res.status(400).json({
        message: "No personal access token associated with this project.",
      });
    }
    // extract owner and repo
    const url = repoUrl.replace("https://github.com/", "");
    const [owner, repoName] = url.split("/");

    try {
      const response = await githubClient.getPullRequests(
        token,
        owner,
        repoName,
        branchName,
      );
      return res.json(response);
    } catch (err) {
      return res.status(400).json({
        message: "Failed to retrieve PRs.",
      });
    }
  });

  // post new branch to Github
  router.post("/api/github/newBranch", async (req, res) => {
    console.log("BODY:", req.body);
    const repoUrl = req.body.repoUrl;
    const token = req.body.token;
    const newBranchName = req.body.newBranchName;
    const sha = req.body.sha;

    if (!token) {
      // make sure the project actually has a token
      return res.status(400).json({
        message: "No personal access token associated with this project.",
      });
    }
    // extract owner and repo
    const url = repoUrl.replace("https://github.com/", "");
    const [owner, repoName] = url.split("/");

    try {
      const response = await githubClient.postBranch(
        token,
        owner,
        repoName,
        newBranchName,
        sha,
      );
      return res.json(response);
    } catch (err) {
      return res.status(400).json({
        message: "Failed to create a new branch in Github.",
      });
    }
  });

  app.use("/scrumapi", router);
};
