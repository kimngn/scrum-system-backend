// https://axios.rest/pages/getting-started/first-steps
// https://axios.rest/pages/advanced/authentication.html

const axios = require("axios");

const api = axios.create({ baseURL: "https://api.github.com" });

api.interceptors.request.use((config) => {
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`); // put PAT here
  }
  return config;
});

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

module.exports = { getRepo, getBranches, getPullRequests };
