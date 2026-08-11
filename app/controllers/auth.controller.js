const db = require("../models");
const { authenticate } = require("../authentication/authentication");
const User = db.user;
const Session = db.session;
const Op = db.Sequelize.Op;
const { encrypt, decrypt } = require("../authentication/crypto");

exports.login = async (req, res) => {
  let { userId } = await authenticate(req, res, "credentials");

  if (userId !== undefined) {
    try {
      const user = await User.findByPk(userId);

      let expireTime = new Date();
      expireTime.setDate(expireTime.getDate() + 1);

      const session = {
        email: user.email,
        userId: userId,
        expirationDate: expireTime,
      };
      const data = await Session.create(session);
      let sessionId = data.id;
      let token = await encrypt(sessionId);
      let userInfo = {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        id: user.id,
        role: user.role,
        token: token,
      };
      res.send(userInfo);
    } catch (err) {
      console.error(err);
      res.status(500).send({
        message: err.message || "Some error occurred while creating the session.",
      });
    }
  }
};

exports.logout = async (req, res) => {
  let auth = req.get("authorization");
  if (
    auth != null &&
    auth.startsWith("Bearer ") &&
    (typeof require !== "string" || require === "token")
  ) {
    let token = auth.slice(7);
    let sessionId;
    try {
      sessionId = await decrypt(token);
    } catch {
      return res.status(200).send();
    }
    if (sessionId == null) return res.status(200).send();
    try {
      await Session.destroy({ where: { id: sessionId } });
    } catch (error) {
      console.error(error);
    }
  }
  res.status(200).send();
};
