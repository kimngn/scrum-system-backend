const db = require("../models");

const Retrospective = db.retrospective;

/**
 * Get retrospective for a sprint
 */
exports.findBySprint = async (req, res) => {
  try {
    const sprintId = req.params.sprintId;

    const retrospective = await Retrospective.findOne({
      where: {
        sprintId: sprintId,
      },
    });

    if (!retrospective) {
      return res.status(200).json(null);
    }

    const result = retrospective.toJSON();

    // Convert stored JSON strings back into arrays
    result.wentWell = parseArray(result.wentWell);
    result.wentWrong = parseArray(result.wentWrong);
    result.improvements = parseArray(result.improvements);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error retrieving retrospective:", error);

    res.status(500).json({
      message: "Error retrieving retrospective.",
    });
  }
};


/**
 * Create OR update retrospective
 */
exports.save = async (req, res) => {
  try {
    const {
      sprintId,
      wentWell = [],
      wentWrong = [],
      improvements = [],
    } = req.body;

    if (!sprintId) {
      return res.status(400).json({
        message: "Sprint ID is required.",
      });
    }

    let retrospective = await Retrospective.findOne({
      where: {
        sprintId: sprintId,
      },
    });

    const data = {
      sprintId,
      wentWell: JSON.stringify(wentWell),
      wentWrong: JSON.stringify(wentWrong),
      improvements: JSON.stringify(improvements),
    };

    if (retrospective) {
      await retrospective.update(data);
    } else {
      retrospective = await Retrospective.create(data);
    }

    const result = retrospective.toJSON();

    result.wentWell = parseArray(result.wentWell);
    result.wentWrong = parseArray(result.wentWrong);
    result.improvements = parseArray(result.improvements);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error saving retrospective:", error);

    res.status(500).json({
      message: "Error saving retrospective.",
    });
  }
};


function parseArray(value) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}