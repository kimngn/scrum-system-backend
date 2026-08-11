const db = require("../models");
const User = db.user;
const Session = db.session;
const Op = db.Sequelize.Op;
const { encrypt, getSalt, hashPassword } = require("../authentication/crypto");

// Create and Save a new User
exports.create = async (req, res) => {
  // Validate request
  if (req.body.firstName === undefined) {
    const error = new Error("First name cannot be empty for user!");
    error.statusCode = 400;
    throw error;
  } else if (req.body.lastName === undefined) {
    const error = new Error("Last name cannot be empty for user!");
    error.statusCode = 400;
    throw error;
  } else if (req.body.email === undefined) {
    const error = new Error("Email cannot be empty for user!");
    error.statusCode = 400;
    throw error;
  } else if (req.body.password === undefined) {
    const error = new Error("Password cannot be empty for user!");
    error.statusCode = 400;
    throw error;
  }
  if (req.body.role === undefined) {
    req.body.role = "member";
  }

  try {
    const data = await User.findOne({
      // returns null if no user is found
      where: {
        email: req.body.email,
      },
    });

    if (data) {
      // if an existing user is found
      return res.status(409).send({
        message: `This email is already in use.`,
      });
    }

    console.log("email not found");

    let salt = await getSalt();
    let hash = await hashPassword(req.body.password, salt);

    // Create a User
    const user = {
      id: req.body.id,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      password: hash,
      salt: salt,
      role: req.body.role,
    };

    try {
      const createdUser = await User.create(user);
      let userId = createdUser.id;

      let expireTime = new Date();
      expireTime.setDate(expireTime.getDate() + 1);

      const session = {
        email: req.body.email,
        userId: userId,
        expirationDate: expireTime,
      };
      const sessionData = await Session.create(session);
      let sessionId = sessionData.id;
      let token = await encrypt(sessionId);

      let userInfo = {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        id: userId,
        role: req.body.role,
        token: token,
      };
      res.send(userInfo);
    } catch (err) {
      console.log(err);
      res.status(500).send({
        message: err.message || "Some error occurred while creating the User.",
      });
    }
  } catch (err) {
    return res.status(500).send({
      message: `Error retrieving User with email = ` + req.body.email,
    });
  }
};

// Retrieve all Users from the database.
exports.findAll = async (req, res) => {
  const id = req.query.id;
  var condition = id ? { id: { [Op.like]: `%${id}%` } } : null;

  try {
    const data = await User.findAll({ where: condition });
    res.send(data);
  } catch (err) {
    res.status(500).send({
      message: err.message || "Some error occurred while retrieving users.",
    });
  }
};

// Find a single User with an id
exports.findOne = async (req, res) => {
  const id = req.params.id;

  try {
    const data = await User.findByPk(id);
    if (data) {
      res.send(data);
    } else {
      res.status(404).send({
        message: `Cannot find User with id = ${id}.`,
      });
    }
  } catch (err) {
    res.status(500).send({
      message: err.message || "Error retrieving User with id = " + id,
    });
  }
};

// Find all users who share a project with the specified user
exports.findRelated = async (req, res) => {
  const id = parseInt(req.params.userId, 10);

  try {
    const memberships = await db.projectMembership.findAll({
      where: { userId: id },
    });
    const projectIds = memberships.map((m) => m.projectId);

    const relatedUserIds = new Set([id]);
    if (projectIds.length > 0) {
      const related = await db.projectMembership.findAll({
        where: { projectId: { [Op.in]: projectIds } },
        attributes: ["userId"],
      });
      related.forEach((r) => relatedUserIds.add(r.userId));
    }

    const data = await User.findAll({
      where: { id: { [Op.in]: Array.from(relatedUserIds) } },
    });
    res.send(data);
  } catch (err) {
    res.status(500).send({
      message: err.message || "Error retrieving related users.",
    });
  }
};

// Find a single User with an email
exports.findByEmail = async (req, res) => {
  const email = req.params.email;

  try {
    const data = await User.findOne({
      where: {
        email: email,
      },
    });
    if (data) {
      res.send(data);
    } else {
      res.send({ email: "not found" });
      /*res.status(404).send({
        message: `Cannot find User with email=${email}.`
      });*/
    }
  } catch (err) {
    res.status(500).send({
      message: err.message || "Error retrieving User with email=" + email,
    });
  }
};

// Update a User by the id in the request
exports.update = async (req, res) => {
  const id = req.params.id;
  // Only update user so pass and salt don't get touched.
  const userInfo = {
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    role: req.body.role,
  };
  try {
    const number = await User.update(userInfo, {
      where: { id: id },
    });

    if (number == 1) {
      res.send({
        message: "User was updated successfully.",
      });
    } else {
      res.send({
        message: `Cannot update User with id = ${id}. Maybe User was not found or req.body is empty!`,
      });
    }
  } catch (err) {
    res.status(500).send({
      message: err.message || "Error updating User with id =" + id,
    });
  }
};

// Lance's solution to password issue
exports.updatePassword = async (req, res) => {
  const id = req.params.id;
  if (req.body.password === undefined) {
    const error = new Error("Password cannot be empty for user!");
    error.statusCode = 400;
    throw error;
  } // Create new salt and has for new password.
  try {
    let salt = await getSalt();
    let hash = await hashPassword(req.body.password, salt);

    const number = await User.update(
      { password: hash, salt: salt },
      {
        where: { id: id },
      },
    );

    if (number == 1) {
      res.send({
        message: "User was deleted successfully!",
      });
    } else {
      res.send({
        message: `Cannot delete User with id = ${id}. Maybe User was not found!`,
      });
    }
  } catch (err) {
    res.status(500).send({
      message: err.message || "Could not delete User with id = " + id,
    });
  }
};

// Delete a User with the specified id in the request
exports.delete = async (req, res) => {
  const id = req.params.id;

  try {
    const targetUser = await User.findByPk(id, { attributes: ["role"] });
    if (!targetUser) {
      return res.status(404).send({
        message: `Cannot delete User with id = ${id}. Maybe User was not found!`,
      });
    }

    const requester = await User.findByPk(req.userId, { attributes: ["role"] });
    if (requester?.role === "lead" && targetUser?.role === "admin") {
      return res.status(403).send({ message: "Project leads cannot delete admin users." });
    }

    const number = await User.destroy({
      where: { id: id },
    });
    if (number == 1) {
      res.send({
        message: "User was deleted successfully!",
      });
    } else {
      res.send({
        message: `Cannot delete User with id = ${id}. Maybe User was not found!`,
      });
    }
  } catch (err) {
    res.status(500).send({
      message: err.message || "Could not delete User with id = " + id,
    });
  }
};

// Delete all People from the database.
exports.deleteAll = async (req, res) => {
  try {
    const number = await User.destroy({
      where: {},
      truncate: false,
    });
    res.send({ message: `${number} People were deleted successfully!` });
  } catch (err) {
    res.status(500).send({
      message: err.message || "Some error occurred while removing all people.",
    });
  }
};
