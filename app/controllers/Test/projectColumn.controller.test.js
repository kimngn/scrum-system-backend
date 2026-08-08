import { describe, it, expect, vi, beforeEach } from "vitest";

const db = require("../../models");
const ProjectColumn = db.projectColumn;
const findAllSpy = vi.spyOn(ProjectColumn, "findAll");
const createSpy = vi.spyOn(ProjectColumn, "create");
const updateSpy = vi.spyOn(ProjectColumn, "update");
const findByPkSpy = vi.spyOn(ProjectColumn, "findByPk");
const destroySpy = vi.spyOn(ProjectColumn, "destroy");

// Import controller after spies are set
const { default: projectColumnController } = await import("../projectColumn.controller");

function mockRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res;
}

// Don't recreate spies inside beforeEach.
// Only reset call history.
beforeEach(() => {
  vi.clearAllMocks(); // NOT resetAllMocks()
});

describe("projectColumn.controller", () => {
  describe("create", () => {
    const validBody = { title: "Backlog", displayOrder: 1, projectId: 1, role: "lead" };

    it("rejects with 401 when the caller isn't a lead or admin", async () => {
      const req = { body: { ...validBody, role: "member" } };
      const res = mockRes();

      await projectColumnController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(createSpy).not.toHaveBeenCalled();
    });

    it("allows an admin to create a column", async () => {
      const created = { id: 1, title: "Backlog", displayOrder: 1, projectId: 1 };
      createSpy.mockResolvedValue(created);

      const req = { body: { ...validBody, role: "admin" } };
      const res = mockRes();

      await projectColumnController.create(req, res);

      expect(createSpy).toHaveBeenCalledWith({
        title: "Backlog",
        displayOrder: 1,
        projectId: 1,
      });
      expect(res.send).toHaveBeenCalledWith(created);
    });

    it("creates the column and returns 200 when the caller is a lead", async () => {
      const created = { id: 1, title: "Backlog", displayOrder: 1, projectId: 1 };
      createSpy.mockResolvedValue(created);

      const req = { body: validBody };
      const res = mockRes();

      await projectColumnController.create(req, res);

      expect(createSpy).toHaveBeenCalledWith({
        title: "Backlog",
        displayOrder: 1,
        projectId: 1,
      });
      expect(res.send).toHaveBeenCalledWith(created);
    });

    it("returns 400 when creation fails", async () => {
      createSpy.mockRejectedValue(new Error("title cannot be null"));

      const req = { body: validBody };
      const res = mockRes();

      await projectColumnController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("update", () => {
    it("rejects with 401 when the caller isn't a lead or admin", async () => {
      const req = { params: { id: 1 }, body: { title: "Renamed", role: "member" } };
      const res = mockRes();

      await projectColumnController.update(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it("updates the column and returns 200 when the caller is a lead", async () => {
      updateSpy.mockResolvedValue([1]);
      const updated = { id: 1, title: "Renamed" };
      findByPkSpy.mockResolvedValue(updated);

      const req = { params: { id: 1 }, body: { title: "Renamed", role: "lead" } };
      const res = mockRes();

      await projectColumnController.update(req, res);

      expect(updateSpy).toHaveBeenCalledWith(req.body, { where: { id: 1 } });
      expect(res.send).toHaveBeenCalledWith(updated);
    });

    it("returns 400 when the update fails", async () => {
      updateSpy.mockRejectedValue(new Error("db down"));

      const req = { params: { id: 1 }, body: { title: "Renamed", role: "lead" } };
      const res = mockRes();

      await projectColumnController.update(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("delete", () => {
    it("rejects with 401 when the caller isn't a lead or admin", async () => {
      const req = { params: { id: 1 }, body: { role: "member" } };
      const res = mockRes();

      await projectColumnController.delete(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(destroySpy).not.toHaveBeenCalled();
    });

    it("deletes the column and returns 200 when the caller is a lead", async () => {
      destroySpy.mockResolvedValue(1);

      const req = { params: { id: 1 }, body: { role: "lead" } };
      const res = mockRes();

      await projectColumnController.delete(req, res);

      expect(res.send).toHaveBeenCalledWith({ message: "Column deleted successfully!" });
    });

    it("returns 400 when the column doesn't exist", async () => {
      destroySpy.mockResolvedValue(0);

      const req = { params: { id: 999 }, body: { role: "lead" } };
      const res = mockRes();

      await projectColumnController.delete(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("findAllForProject", () => {
    it("returns all columns for a project in display order", async () => {
      const columns = [{ id: 1, title: "Backlog", displayOrder: 1 }];
      findAllSpy.mockResolvedValue(columns);

      const req = { params: { projectId: 1 } };
      const res = mockRes();

      await projectColumnController.findAllForProject(req, res);

      expect(findAllSpy).toHaveBeenCalledWith({
        where: { projectId: 1 },
        order: [["displayOrder", "ASC"]],
      });
      expect(res.send).toHaveBeenCalledWith(columns);
    });

    it("returns 500 if the lookup fails", async () => {
      findAllSpy.mockRejectedValue(new Error("db down"));

      const req = { params: { projectId: 1 } };
      const res = mockRes();

      await projectColumnController.findAllForProject(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
