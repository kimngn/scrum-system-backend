import { describe, it, expect, vi, beforeEach } from "vitest";

// -----------------------------------------------------------------------
// Load REAL Sequelize models using CommonJS (same as controller)
// -----------------------------------------------------------------------
const db = require("../../models");
const Project = db.project;
const ProjectMembership = db.projectMembership;

// -----------------------------------------------------------------------
// IMPORTANT: spies must be created OUTSIDE beforeEach.
// If you recreate spies inside beforeEach, Vitest loses the patched methods.
// -----------------------------------------------------------------------

const Sprint = db.sprint || { findAll: vi.fn() };

const findAllSpy = vi.spyOn(Project, "findAll");
const findByPkSpy = vi.spyOn(Project, "findByPk");
const createSpy = vi.spyOn(Project, "create");
const updateSpy = vi.spyOn(Project, "update");
const destroySpy = vi.spyOn(Project, "destroy");

vi.spyOn(Sprint, "findAll");
Sprint.findAll.mockResolvedValue([]);

// project.controller.js adds the creator as a project lead
vi.spyOn(ProjectMembership, "create");
ProjectMembership.create.mockResolvedValue({});

// Import controller AFTER spies are set
const { default: projectController } = await import("../project.controller");

// Debug check
console.log("Spy active:", Project.destroy === destroySpy);

// Mock Express res
function mockRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res;
}

// -----------------------------------------------------------------------
// FIX: DO NOT recreate spies inside beforeEach.
// Only reset call history.
// -----------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks(); // NOT resetAllMocks()
});

describe("project.controller", () => {
  // ---------------------------------------------------------------
  // CREATE
  // ---------------------------------------------------------------
  describe("create", () => {
    const validBody = {
      name: "Test Project",
      description: "A sample project",
      status: "active",
      startDate: null,
      endDate: null,
      userId: 1,
    };

    it("returns 400 when name is missing", async () => {
      const req = { body: { ...validBody, name: undefined } };
      const res = mockRes();

      await projectController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        message: "Name cannot be empty!",
      });
    });

    it("returns 400 when description is missing", async () => {
      const req = { body: { ...validBody, description: undefined } };
      const res = mockRes();

      await projectController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        message: "Description cannot be empty!",
      });
    });
    it("returns 400 when status is missing", async () => {
      const req = { body: { ...validBody, status: undefined } };
      const res = mockRes();

      await projectController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        message: "Status cannot be empty!",
      });
    });
    it("returns 400 when userId is missing", async () => {
      const req = { body: { ...validBody, userId: undefined } };
      const res = mockRes();

      await projectController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        message: "User Id cannot be empty!",
      });
    });

    it("returns 500 if Project.create throws", async () => {
      Project.create.mockRejectedValue(new Error("db down"));

      const req = { body: validBody };
      const res = mockRes();

      await projectController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        message: "db down",
      });
    });

    it("returns created project on success", async () => {
      const fakeProject = { id: 123, ...validBody };
      Project.create.mockResolvedValue(fakeProject);

      const req = { body: validBody };
      const res = mockRes();

      await projectController.create(req, res);

      expect(res.send).toHaveBeenCalledWith(fakeProject);
    });
  });

  // ---------------------------------------------------------------
  // update
  // ---------------------------------------------------------------
  describe("update", () => {
    const updateBody = {
      name: "Updated",
      description: "Updated desc",
      status: "done",
    };

    it("returns 500 if update throws", async () => {
      Project.update.mockRejectedValue(new Error("db down"));

      const req = { params: { id: 1 }, body: updateBody };
      const res = mockRes();

      await projectController.update(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        message: "db down",
      });
    });

    it("returns success message when update works", async () => {
      Project.update.mockResolvedValue([1]); // Sequelize returns [affectedRows]

      const req = { params: { id: 1 }, body: updateBody };
      const res = mockRes();

      await projectController.update(req, res);

      expect(res.send).toHaveBeenCalledWith({
        message: "Project was updated successfully.",
      });
    });
  });

  // ---------------------------------------------------------------
  // delete
  // ---------------------------------------------------------------
  describe("delete", () => {
    it("returns 500 if destroy throws", async () => {
      Project.destroy.mockRejectedValue(new Error("db down"));

      const req = { params: { id: 1 } };
      const res = mockRes();

      await projectController.delete(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        message: "db down",
      });
    });

    it("returns success message when destroy works", async () => {
      Project.destroy.mockResolvedValue(1); // 1 row deleted

      const req = { params: { id: 1 } };
      const res = mockRes();

      await projectController.delete(req, res);

      expect(res.send).toHaveBeenCalledWith({
        message: "Project was deleted successfully!",
      });
    });
  });
  //-------------------------
  //business logic : Every project must have a name
  //------------------------
  it("should not create a project without a name", async () => {
      const req = {
        body: {
          description: "Project Description",
          status: "Active",
          userId: 1,
        },
      };

      const res = mockRes();

      await projectController.create(req, res);

      expect(Project.create).not.toHaveBeenCalled();

      expect(res.status).toHaveBeenCalledWith(400);

      expect(res.send).toHaveBeenCalledWith({
        message: "Name cannot be empty!",
      });
   });
   //-------------------
   //If the user doesn't choose dates, the backend stores null.
   //------------------
   it("should default startDate and endDate to null", async () => {
      const req = {
        body: {
          name: "Project A",
          description: "Test",
          status: "Active",
          userId: 1,
        },
      };

      const res = mockRes();

      Project.create.mockResolvedValue({ id: 1 });

      await projectController.create(req, res);

      expect(Project.create).toHaveBeenCalledWith({
        name: "Project A",
        description: "Test",
        status: "Active",
        startDate: null,
        endDate: null,
        userId: 1,
      });
    });
});
