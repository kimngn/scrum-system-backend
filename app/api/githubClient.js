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

  return response.data
    .filter((b) => !["main", "master", "dev"].includes(b.name)) // remove dev, main, master
    .map((branch) => ({
      name: branch.name, // just want the name, not all the data it returns
    }));
}

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
  getBranches,
  getPullRequests,
  getRepoData,
};
