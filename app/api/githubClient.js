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
async function getRepoData(token, owner, repo) {
  const api = useGithubClient(token); // get token from DB
  const response = await api.get(`/repos/${owner}/${repo}`);
  return response.data;
}

const getRepo = async () => {
  try {
    const response = await api.get("/repos/kimngn/scrum-system-backend");
    return response.data;
  } catch (error) {
    console.error(error.response?.data || error.message);
    throw error;
  }
};

const getBranches = async () => {
  try {
    const response = await api.get(
      "/repos/kimngn/scrum-system-backend/branches",
    );
    return response.data;
  } catch (error) {
    console.error(error.response?.data || error.message);
    throw error;
  }
};

const getPullRequests = async () => {
  try {
    const response = await api.get("/repos/kimngn/scrum-system-backend/pulls");
    return response.data;
  } catch (error) {
    console.error(error.response?.data || error.message);
    throw error;
  }
};

module.exports = {
  getRepo,
  getBranches,
  getPullRequests,
  getRepoData,
  postPullRequest,
};
