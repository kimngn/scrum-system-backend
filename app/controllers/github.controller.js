const { getData } = require("../api/githubClient"); // branch

exports.findBranchName = async (req, res) => {
  try {
    const raw = await getData(req.params.name); // call API per request

    const data = {
      name: raw.name, // filter here
    };
    console.log(data);
    res.send(data);
  } catch (err) {
    res
      .status(500)
      .send({ message: err.message || "Error retrieving branch name." });
  }
};
