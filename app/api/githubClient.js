// https://axios.rest/pages/getting-started/first-steps
// https://axios.rest/pages/advanced/authentication.html

// anything that needs to directly go through GitHub has to be done here since api has a token
const axios = require("axios");

const api = axios.create({ baseURL: "https://api.github.com" });

// authenticate
api.interceptors.request.use((config) => {
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`); // put PAT here
  }
  return config;
});

const validateRepo = async (repoUrl) => {
  // just getRepo but with different error?
  try {
    const response = await api.get(repoUrl);
    return response.data;
  } catch (error) {
    console.error(error.response?.data || error.message);
    throw new Error("Repository doesn't exist");
  }
};

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

module.exports = { validateRepo, getRepo, getBranches, getPullRequests };
