import { describe, it, expect, vi, beforeEach } from "vitest";

// -----------------------------------------------------------------------
// We import the REAL models/crypto modules and patch their methods with
// vi.spyOn instead of using vi.mock(). vi.mock() wasn't intercepting these
// CommonJS modules reliably in this project's setup (the real Sequelize
// models and real crypto functions were still running underneath). Since
// Node/Vite share a single module instance across this file, patching a
// method directly on that shared object is visible anywhere else that
// reads the same object off the same cached module - including inside
// user.controller.js.
// -----------------------------------------------------------------------
import db from "../../models";
import * as cryptoMod from "../../authentication/crypto";

const User = db.user;
const Session = db.session;

// IMPORTANT: user.controller.js does
//   const { encrypt, getSalt, hashPassword } = require("../authentication/crypto");
// That destructures - and permanently captures - whichever functions exist
// on the module the FIRST time it's imported. So these spies must exist
// before user.controller.js is loaded for the first time, or the
// controller keeps using the real, un-spied originals. That's why the
// controller is imported dynamically below, after the spies are set up.
const getSaltSpy = vi.spyOn(cryptoMod, "getSalt");
const hashPasswordSpy = vi.spyOn(cryptoMod, "hashPassword");
const encryptSpy = vi.spyOn(cryptoMod, "encrypt");

const { default: userController } = await import("../user.controller");

// Also spy on the Sequelize model methods the controller calls.
const findOneSpy = vi.spyOn(User, "findOne");
const findAllSpy = vi.spyOn(User, "findAll");
const findByPkSpy = vi.spyOn(User, "findByPk");
const createSpy = vi.spyOn(User, "create");
const updateSpy = vi.spyOn(User, "update");
const destroySpy = vi.spyOn(User, "destroy");
const sessionCreateSpy = vi.spyOn(Session, "create");

// Convenient aliases so the rest of this file can read the same as before.
const getSalt = getSaltSpy;
const hashPassword = hashPasswordSpy;
const encrypt = encryptSpy;

// Helper to build a fresh mock Express res object for each test
function mockRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  // Clears call history AND any .mockResolvedValue/.mockRejectedValue
  // configured on the spies above, without restoring the real
  // implementations (that would be vi.restoreAllMocks() - we don't want
  // that, since it would put the real DB/crypto calls back).
  vi.resetAllMocks();
});

describe("user.controller", () => {
  // ---------------------------------------------------------------
  describe("create", () => {
    const validBody = {
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      password: "plaintext-pw",
      role: "user",
    };

    it("throws a 400 error when firstName is missing", async () => {
      const req = { body: { ...validBody, firstName: undefined } };
      const res = mockRes();

      await expect(userController.create(req, res)).rejects.toThrow(
        "First name cannot be empty for user!"
      );
    });

    it("throws a 400 error when lastName is missing", async () => {
      const req = { body: { ...validBody, lastName: undefined } };
      const res = mockRes();

      await expect(userController.create(req, res)).rejects.toThrow(
        "Last name cannot be empty for user!"
      );
    });

    it("throws a 400 error when email is missing", async () => {
      const req = { body: { ...validBody, email: undefined } };
      const res = mockRes();

      await expect(userController.create(req, res)).rejects.toThrow(
        "Email cannot be empty for user!"
      );
    });

    it("throws a 400 error when password is missing", async () => {
      const req = { body: { ...validBody, password: undefined } };
      const res = mockRes();

      await expect(userController.create(req, res)).rejects.toThrow(
        "Password cannot be empty for user!"
      );
    });

    it("returns 500 if the initial email lookup throws", async () => {
      User.findOne.mockRejectedValue(new Error("db down"));

      const req = { body: validBody };
      const res = mockRes();

      await userController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        message: `Error retrieving User with email = ${validBody.email}`,
      });
    });
  });
  

});