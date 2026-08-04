import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

// -----------------------------------------------------------------------
// Load the same Sequelize model objects used by the controller.
// -----------------------------------------------------------------------
const db = require("../../models");

const UserStory = db.userStory;
const ProjectColumn = db.projectColumn;
const StoryAssignee = db.storyAssignee;
const User = db.user;

// -----------------------------------------------------------------------
// Create spies ONCE before importing the controller.
// -----------------------------------------------------------------------
const findAllSpy = vi.spyOn(UserStory, "findAll");
const countSpy = vi.spyOn(UserStory, "count");
const createSpy = vi.spyOn(UserStory, "create");
const updateSpy = vi.spyOn(UserStory, "update");
const findByPkSpy = vi.spyOn(UserStory, "findByPk");
const destroySpy = vi.spyOn(UserStory, "destroy");

const columnFindByPkSpy = vi.spyOn(
  ProjectColumn,
  "findByPk",
);

// -----------------------------------------------------------------------
// Import controller only after spies are active.
// -----------------------------------------------------------------------
const { default: userStoryController } = await import(
  "../userStory.controller"
);

// -----------------------------------------------------------------------
// Mock Express response.
// -----------------------------------------------------------------------
function mockRes() {
  const res = {};

  res.status = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);

  return res;
}

// -----------------------------------------------------------------------
// Clear calls and restore safe default responses before every test.
// Do not use resetAllMocks(), because it can remove spy behavior.
// -----------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();

  findAllSpy.mockResolvedValue([]);
  countSpy.mockResolvedValue(0);
  createSpy.mockResolvedValue({});
  updateSpy.mockResolvedValue([0]);
  findByPkSpy.mockResolvedValue(null);
  destroySpy.mockResolvedValue(0);

  columnFindByPkSpy.mockResolvedValue({
    id: 1,
    title: "Backlog",
  });
});

describe("userStory.controller", () => {
  // =====================================================================
  // FIND ALL FOR PROJECT
  // =====================================================================
  describe("findAllForProject", () => {
    it("returns all stories for the requested project", async () => {
      const req = {
        params: {
          projectId: "3",
        },
      };

      const res = mockRes();

      const stories = [
        {
          id: 1,
          title: "Create Issues page",
          projectId: 3,
          columnId: 1,
          column: {
            id: 1,
            title: "Backlog",
          },
          assignee: [
            {
              id: 10,
              userStoryId: 1,
              userId: 2,
              user: {
                id: 2,
                firstName: "Kim",
                lastName: "Nguyen",
                email: "kim@example.com",
              },
            },
          ],
        },
      ];

      findAllSpy.mockResolvedValue(stories);

      await userStoryController.findAllForProject(
        req,
        res,
      );

      expect(findAllSpy).toHaveBeenCalledTimes(1);

      expect(findAllSpy).toHaveBeenCalledWith({
        where: {
          projectId: "3",
        },
        include: [
          {
            model: ProjectColumn,
            as: "column",
          },
          {
            model: StoryAssignee,
            as: "assignee",
            include: [
              {
                model: User,
                as: "user",
                attributes: [
                  "id",
                  "firstName",
                  "lastName",
                  "email",
                ],
              },
            ],
          },
        ],
      });

      expect(res.send).toHaveBeenCalledWith(stories);
      expect(res.status).not.toHaveBeenCalled();
    });

    it("returns an empty array when the project has no stories", async () => {
      const req = {
        params: {
          projectId: "99",
        },
      };

      const res = mockRes();

      findAllSpy.mockResolvedValue([]);

      await userStoryController.findAllForProject(
        req,
        res,
      );

      expect(res.send).toHaveBeenCalledWith([]);
      expect(res.status).not.toHaveBeenCalled();
    });

    it("returns 500 when retrieving project stories fails", async () => {
      const req = {
        params: {
          projectId: "3",
        },
      };

      const res = mockRes();

      findAllSpy.mockRejectedValue(
        new Error("Database query failed"),
      );

      await userStoryController.findAllForProject(
        req,
        res,
      );

      expect(res.status).toHaveBeenCalledWith(500);

      expect(res.send).toHaveBeenCalledWith({
        message: "Database query failed",
      });
    });
  });

  // =====================================================================
  // FIND ALL
  // =====================================================================
  describe("findAll", () => {
    it("returns all user stories", async () => {
      const req = {};
      const res = mockRes();

      const stories = [
        {
          id: 1,
          title: "First story",
        },
        {
          id: 2,
          title: "Second story",
        },
      ];

      countSpy.mockResolvedValue(2);
      findAllSpy.mockResolvedValue(stories);

      await userStoryController.findAll(req, res);

      expect(countSpy).toHaveBeenCalledTimes(1);
      expect(findAllSpy).toHaveBeenCalledTimes(1);

      expect(res.send).toHaveBeenCalledWith(stories);
      expect(res.status).not.toHaveBeenCalled();
    });

    it("returns an empty array when no stories exist", async () => {
      const req = {};
      const res = mockRes();

      countSpy.mockResolvedValue(0);
      findAllSpy.mockResolvedValue([]);

      await userStoryController.findAll(req, res);

      expect(res.send).toHaveBeenCalledWith([]);
    });

    it("returns 500 when retrieving stories fails", async () => {
      const req = {};
      const res = mockRes();

      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      countSpy.mockResolvedValue(1);

      findAllSpy.mockRejectedValue(
        new Error("Unable to retrieve stories"),
      );

      await userStoryController.findAll(req, res);

      expect(consoleErrorSpy).toHaveBeenCalled();

      expect(res.status).toHaveBeenCalledWith(500);

      expect(res.send).toHaveBeenCalledWith({
        message: "Unable to retrieve stories",
      });

      consoleErrorSpy.mockRestore();
    });
  });

  // =====================================================================
  // CREATE
  // =====================================================================
  describe("create", () => {
    const validBody = {
      title: "Create backlog page",
      description: "Create the backlog interface",
      priority: "High",
      storyPoint: 5,
      projectId: 3,
      columnId: 1,
      type: "Issue",
    };

    it("creates a user story successfully", async () => {
      const req = {
        body: validBody,
      };

      const res = mockRes();

      const createdStory = {
        id: 15,
        ...validBody,
        status: "Backlog",
      };

      columnFindByPkSpy.mockResolvedValue({
        id: 1,
        title: "Backlog",
      });

      createSpy.mockResolvedValue(createdStory);

      await userStoryController.create(req, res);

      expect(columnFindByPkSpy).toHaveBeenCalledWith(1);

      expect(createSpy).toHaveBeenCalledWith({
        title: "Create backlog page",
        description: "Create the backlog interface",
        priority: "High",
        storyPoint: 5,
        projectId: 3,
        columnId: 1,
        type: "Issue",
        status: "Backlog",
      });

      expect(res.send).toHaveBeenCalledWith(
        createdStory,
      );

      expect(res.status).not.toHaveBeenCalled();
    });

    it("sets the story status from the selected column", async () => {
      const req = {
        body: {
          ...validBody,
          columnId: 2,
        },
      };

      const res = mockRes();

      columnFindByPkSpy.mockResolvedValue({
        id: 2,
        title: "To Do",
      });

      createSpy.mockResolvedValue({
        id: 16,
        ...req.body,
        status: "To Do",
      });

      await userStoryController.create(req, res);

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          columnId: 2,
          status: "To Do",
        }),
      );
    });

    it("returns 400 when finding the column fails", async () => {
      const req = {
        body: validBody,
      };

      const res = mockRes();

      columnFindByPkSpy.mockRejectedValue(
        new Error("Column query failed"),
      );

      await userStoryController.create(req, res);

      expect(createSpy).not.toHaveBeenCalled();

      expect(res.status).toHaveBeenCalledWith(400);

      expect(res.send).toHaveBeenCalledWith({
        message: "Column query failed",
      });
    });

    it("returns 400 when creating the story fails", async () => {
      const req = {
        body: validBody,
      };

      const res = mockRes();

      columnFindByPkSpy.mockResolvedValue({
        id: 1,
        title: "Backlog",
      });

      createSpy.mockRejectedValue(
        new Error("Create failed"),
      );

      await userStoryController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(400);

      expect(res.send).toHaveBeenCalledWith({
        message: "Create failed",
      });
    });
  });

  // =====================================================================
  // UPDATE
  // =====================================================================
  describe("update", () => {
    it("updates a story successfully", async () => {
      const req = {
        params: {
          id: "5",
        },
        body: {
          title: "Updated story",
          priority: "Medium",
        },
      };

      const res = mockRes();

      const updatedStory = {
        id: 5,
        title: "Updated story",
        priority: "Medium",
      };

      updateSpy.mockResolvedValue([1]);
      findByPkSpy.mockResolvedValue(updatedStory);

      await userStoryController.update(req, res);

      expect(columnFindByPkSpy).not.toHaveBeenCalled();

      expect(updateSpy).toHaveBeenCalledWith(
        {
          title: "Updated story",
          priority: "Medium",
        },
        {
          where: {
            id: "5",
          },
        },
      );

      expect(findByPkSpy).toHaveBeenCalledWith("5");

      expect(res.send).toHaveBeenCalledWith(
        updatedStory,
      );
    });

    it("updates the status when columnId changes", async () => {
      const req = {
        params: {
          id: "5",
        },
        body: {
          columnId: 3,
        },
      };

      const res = mockRes();

      columnFindByPkSpy.mockResolvedValue({
        id: 3,
        title: "In Progress",
      });

      updateSpy.mockResolvedValue([1]);

      findByPkSpy.mockResolvedValue({
        id: 5,
        columnId: 3,
        status: "In Progress",
      });

      await userStoryController.update(req, res);

      expect(columnFindByPkSpy).toHaveBeenCalledWith(3);

      expect(updateSpy).toHaveBeenCalledWith(
        {
          columnId: 3,
          status: "In Progress",
        },
        {
          where: {
            id: "5",
          },
        },
      );

      expect(res.send).toHaveBeenCalledWith({
        id: 5,
        columnId: 3,
        status: "In Progress",
      });
    });

    it("returns 400 when updating fails", async () => {
      const req = {
        params: {
          id: "5",
        },
        body: {
          title: "Updated story",
        },
      };

      const res = mockRes();

      updateSpy.mockRejectedValue(
        new Error("Update failed"),
      );

      await userStoryController.update(req, res);

      expect(res.status).toHaveBeenCalledWith(400);

      expect(res.send).toHaveBeenCalledWith({
        message: "Update failed",
      });
    });

    it("returns 400 when finding the new column fails", async () => {
      const req = {
        params: {
          id: "5",
        },
        body: {
          columnId: 4,
        },
      };

      const res = mockRes();

      columnFindByPkSpy.mockRejectedValue(
        new Error("Column lookup failed"),
      );

      await userStoryController.update(req, res);

      expect(updateSpy).not.toHaveBeenCalled();

      expect(res.status).toHaveBeenCalledWith(400);

      expect(res.send).toHaveBeenCalledWith({
        message: "Column lookup failed",
      });
    });
  });

  // =====================================================================
  // DELETE
  // =====================================================================
  describe("delete", () => {
    it("deletes a user story successfully", async () => {
      const req = {
        params: {
          id: "8",
        },
      };

      const res = mockRes();

      destroySpy.mockResolvedValue(1);

      await userStoryController.delete(req, res);

      expect(destroySpy).toHaveBeenCalledWith({
        where: {
          id: "8",
        },
      });

      expect(res.send).toHaveBeenCalledWith({
        message:
          "User story was deleted successfully!",
      });

      expect(res.status).not.toHaveBeenCalled();
    });

    it("returns 404 when the story does not exist", async () => {
      const req = {
        params: {
          id: "999",
        },
      };

      const res = mockRes();

      destroySpy.mockResolvedValue(0);

      await userStoryController.delete(req, res);

      expect(res.status).toHaveBeenCalledWith(404);

      expect(res.send).toHaveBeenCalledWith({
        message:
          "Cannot find user story with id = 999.",
      });
    });

    it("returns 400 when deleting the story fails", async () => {
      const req = {
        params: {
          id: "8",
        },
      };

      const res = mockRes();

      destroySpy.mockRejectedValue(
        new Error("Delete failed"),
      );

      await userStoryController.delete(req, res);

      expect(res.status).toHaveBeenCalledWith(400);

      expect(res.send).toHaveBeenCalledWith({
        message: "Delete failed",
      });
    });
    //---business logic ---//
    //Status must match the selected column when creating
    it("sets story status to the selected column title", async () => {
        const req = {
            body: {
            title: "Create login page",
            description: "Build the login screen",
            priority: "High",
            storyPoint: 5,
            projectId: 3,
            columnId: 2,
            type: "User Story",
            },
        };

        const res = mockRes();

        columnFindByPkSpy.mockResolvedValue({
            id: 2,
            title: "To Do",
        });

        createSpy.mockResolvedValue({
            id: 20,
            ...req.body,
            status: "To Do",
        });

        await userStoryController.create(req, res);

        expect(createSpy).toHaveBeenCalledWith({
            title: "Create login page",
            description: "Build the login screen",
            priority: "High",
            storyPoint: 5,
            projectId: 3,
            columnId: 2,
            type: "User Story",
            status: "To Do",
        });
    });
    //---Moving a story must update its status
    it("changes story status when the story moves to another column", async () => {
        const req = {
            params: {
            id: "10",
            },
            body: {
            columnId: 3,
            },
        };

        const res = mockRes();

        columnFindByPkSpy.mockResolvedValue({
            id: 3,
            title: "In Progress",
        });

        updateSpy.mockResolvedValue([1]);

        findByPkSpy.mockResolvedValue({
            id: 10,
            columnId: 3,
            status: "In Progress",
        });

        await userStoryController.update(req, res);

        expect(updateSpy).toHaveBeenCalledWith(
            {
            columnId: 3,
            status: "In Progress",
            },
            {
            where: {
                id: "10",
            },
            },
        );

        expect(res.send).toHaveBeenCalledWith({
            id: 10,
            columnId: 3,
            status: "In Progress",
        });
    });
  });
});