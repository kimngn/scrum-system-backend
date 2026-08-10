// https://axios.rest/pages/getting-started/first-steps
// https://axios.rest/pages/advanced/authentication.html

// anything that needs to directly go through GitHub has to be done here since api has a token
const axios = require("axios");

// authenticate
function useGithubClient(token) {
  const api = axios.create({ baseURL: "https://api.github.com" });

  api.interceptors.request.use((config) => {
    config.headers.set("Authorization", `Bearer ${token}`);
    return config;
  });
  return api;
}

// no longer using .env token
async function getRepoData(token, owner, repoName) {
  const api = useGithubClient(token); // prepare the API to make calls to Github
  const response = await api.get(`/repos/${owner}/${repoName}`);
  return response.data;
}

async function getBranches(token, owner, repoName) {
  const api = useGithubClient(token); // prepare the API to make calls to Github
  const response = await api.get(`/repos/${owner}/${repoName}/branches`);

  return (
    response.data

      // asked for help from AI on this one
      .filter((b) => !["main", "master", "dev"].includes(b.name)) // remove dev, main, master
      .map((branch) => ({
        name: branch.name, // just want the name, not all the data it returns
      }))
  );
}

const getPullRequests = async (token, owner, repoName, branchName) => {
  console.log("OWNER:" + owner);
  console.log("branchName:" + branchName);
  const api = useGithubClient(token); // prepare the API to make calls to Github
  try {
    const response = await api.get(
      `/repos/${owner}/${repoName}/pulls?state=all&per_page=100`, // fetch all PRs (can't get branchName to match exact branch format)
      // funny bug where first 30 PRs are fetched because of 30 PRs per page
    );

    console.log("All PRs:");

    for (const pr of response.data) {
      console.log("PR head.ref:", pr.head.ref);
      console.log("PR branchname:", branchName);
    }

    const filtered = response.data.filter((pr) => pr.head.ref === branchName); // filter fetched PRs by branchName

    return filtered.map((pr) => ({
      // map PR to an object (remove data that won't be used)
      author: pr.user.login,
      number: pr.number,
      title: pr.title,
      state: pr.state,
      createdAt: pr.created_at,
      mergedAt: pr.merged_at,
      mergedBy: pr.merged_by?.login ?? null,
      assignee: pr.assignee?.login ?? null,
      url: pr.html_url,
    }));
  } catch (error) {
    console.error(error.response?.data || error.message);
    throw error;
  }
};

const postPullRequest = async (story, pr) => {
  // need title, body, head, base

  console.log("Story Title:" + story.title);
  console.log("Story Description:" + story.body);
  const api = useGithubClient(token); // prepare the API to make calls to Github
};

module.exports = {
  getBranches,
  getPullRequests,
  getRepoData,
  postPullRequest,
};
