import { describe, it, expect, vi, beforeEach } from "vitest";
import db from "../models/index.js";

// ── Grab model references and spy on every method used by tools.mjs ──────────
// Spies are registered before the dynamic import so that when tools.mjs
// captures references like `const UserStory = db.userStory`, the methods on
// those objects already carry the spies.

const Project = db.project;
const UserStory = db.userStory;
const Sprint = db.sprint;
const ProjectColumn = db.projectColumn;
const StoryAssignee = db.storyAssignee;
const User = db.user;
const Branch = db.branch;
const ProjectMembership = db.projectMembership;

const projectFindByPkSpy = vi.spyOn(Project, "findAll");
const storyFindAllSpy = vi.spyOn(UserStory, "findAll");
const storyFindByPkSpy = vi.spyOn(UserStory, "findByPk");
const storyCreateSpy = vi.spyOn(UserStory, "create");
const storyUpdateSpy = vi.spyOn(UserStory, "update");
const sprintFindAllSpy = vi.spyOn(Sprint, "findAll");
const sprintFindOneSpy = vi.spyOn(Sprint, "findOne");
const columnFindAllSpy = vi.spyOn(ProjectColumn, "findAll");
const columnFindOneSpy = vi.spyOn(ProjectColumn, "findOne");
const assigneeCreateSpy = vi.spyOn(StoryAssignee, "create");
const assigneeFindOneSpy = vi.spyOn(StoryAssignee, "findOne");
const userFindByPkSpy = vi.spyOn(User, "findByPk");
const branchFindOneSpy = vi.spyOn(Branch, "findOne");
const membershipFindOneSpy = vi.spyOn(ProjectMembership, "findOne");
const membershipFindAllSpy = vi.spyOn(ProjectMembership, "findAll");
const projectFindByPkRealSpy = vi.spyOn(Project, "findByPk");

// ── Import tools after spies are active ──────────────────────────────────────
const tools = await import("./tools.mjs");

// ── Helpers ───────────────────────────────────────────────────────────────────

function parse(result) {
  return JSON.parse(result.content[0].text);
}

// Default: user 1 is a member of any project (individual tests override this).
beforeEach(() => {
  vi.clearAllMocks();
  membershipFindOneSpy.mockResolvedValue({ id: 1, userId: 1, projectId: 3, role: "member" });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("listProjects", () => {
  it("returns only projects the user is a member of", async () => {
    const project = { id: 3, name: "Alpha" };
    membershipFindAllSpy.mockResolvedValue([{ project }]);

    const out = parse(await tools.listProjects({ _userId: 1 }));
    expect(out.success).toBe(true);
    expect(out.data).toEqual([project]);
    expect(membershipFindAllSpy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 1 } }),
    );
  });

  it("returns authentication required when _userId is missing", async () => {
    const out = parse(await tools.listProjects({ _userId: undefined }));
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/auth/i);
    expect(membershipFindAllSpy).not.toHaveBeenCalled();
  });

  it("returns error on DB failure", async () => {
    membershipFindAllSpy.mockRejectedValue(new Error("db error"));
    const out = parse(await tools.listProjects({ _userId: 1 }));
    expect(out.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("getProject", () => {
  it("returns the project when the user is a member", async () => {
    projectFindByPkRealSpy.mockResolvedValue({ id: 3, name: "Scrum App" });
    const out = parse(await tools.getProject({ projectId: 3, _userId: 1 }));
    expect(out.success).toBe(true);
    expect(out.data.id).toBe(3);
  });

  it("returns access denied when user is not a project member", async () => {
    membershipFindOneSpy.mockResolvedValue(null);
    const out = parse(await tools.getProject({ projectId: 3, _userId: 1 }));
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/access denied/i);
    expect(projectFindByPkRealSpy).not.toHaveBeenCalled();
  });

  it("returns authentication required when _userId is missing", async () => {
    const out = parse(await tools.getProject({ projectId: 3, _userId: undefined }));
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/auth/i);
  });

  it("returns error when project is not found", async () => {
    projectFindByPkRealSpy.mockResolvedValue(null);
    const out = parse(await tools.getProject({ projectId: 999, _userId: 1 }));
    expect(out.success).toBe(false);
    expect(out.error).toMatch("999");
  });

  it("returns error on DB failure", async () => {
    projectFindByPkRealSpy.mockRejectedValue(new Error("timeout"));
    const out = parse(await tools.getProject({ projectId: 3, _userId: 1 }));
    expect(out.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("listStories", () => {
  it("returns all stories with includes when user is a member", async () => {
    const stories = [{ id: 1, title: "Build login", column: { title: "Backlog" }, assignee: [] }];
    storyFindAllSpy.mockResolvedValue(stories);

    const out = parse(await tools.listStories({ projectId: 3, _userId: 1 }));
    expect(out.success).toBe(true);
    expect(out.data).toEqual(stories);
    expect(storyFindAllSpy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { projectId: 3 } }),
    );
  });

  it("returns access denied when user is not a member", async () => {
    membershipFindOneSpy.mockResolvedValue(null);
    const out = parse(await tools.listStories({ projectId: 3, _userId: 1 }));
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/access denied/i);
    expect(storyFindAllSpy).not.toHaveBeenCalled();
  });

  it("returns empty array when the project has no stories", async () => {
    storyFindAllSpy.mockResolvedValue([]);
    const out = parse(await tools.listStories({ projectId: 3, _userId: 1 }));
    expect(out.success).toBe(true);
    expect(out.data).toEqual([]);
  });

  it("returns error on DB failure", async () => {
    storyFindAllSpy.mockRejectedValue(new Error("connection refused"));
    const out = parse(await tools.listStories({ projectId: 3, _userId: 1 }));
    expect(out.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("listSprints", () => {
  it("returns sprints ordered by startDate when user is a member", async () => {
    const sprints = [
      { id: 1, name: "Sprint 1", status: "completed" },
      { id: 2, name: "Sprint 2", status: "active" },
    ];
    sprintFindAllSpy.mockResolvedValue(sprints);

    const out = parse(await tools.listSprints({ projectId: 3, _userId: 1 }));
    expect(out.success).toBe(true);
    expect(out.data).toEqual(sprints);
    expect(sprintFindAllSpy).toHaveBeenCalledWith({
      where: { projectId: 3 },
      order: [["startDate", "ASC"]],
    });
  });

  it("returns access denied when user is not a member", async () => {
    membershipFindOneSpy.mockResolvedValue(null);
    const out = parse(await tools.listSprints({ projectId: 3, _userId: 1 }));
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/access denied/i);
  });

  it("returns error on DB failure", async () => {
    sprintFindAllSpy.mockRejectedValue(new Error("db error"));
    const out = parse(await tools.listSprints({ projectId: 3, _userId: 1 }));
    expect(out.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("listColumns", () => {
  it("returns columns in display order when user is a member", async () => {
    const cols = [
      { id: 1, title: "Backlog", displayOrder: 1 },
      { id: 6, title: "Done", displayOrder: 6 },
    ];
    columnFindAllSpy.mockResolvedValue(cols);

    const out = parse(await tools.listColumns({ projectId: 3, _userId: 1 }));
    expect(out.success).toBe(true);
    expect(out.data).toEqual(cols);
  });

  it("returns access denied when user is not a member", async () => {
    membershipFindOneSpy.mockResolvedValue(null);
    const out = parse(await tools.listColumns({ projectId: 3, _userId: 1 }));
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/access denied/i);
  });

  it("returns error on DB failure", async () => {
    columnFindAllSpy.mockRejectedValue(new Error("db error"));
    const out = parse(await tools.listColumns({ projectId: 3, _userId: 1 }));
    expect(out.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("getStoryDetails", () => {
  it("returns full story details when user is a member", async () => {
    const story = { id: 5, projectId: 3, title: "Build login", column: { title: "In Progress" }, assignee: [] };
    storyFindByPkSpy.mockResolvedValue(story);

    const out = parse(await tools.getStoryDetails({ storyId: 5, _userId: 1 }));
    expect(out.success).toBe(true);
    expect(out.data.id).toBe(5);
  });

  it("returns access denied when user is not a member of the story's project", async () => {
    storyFindByPkSpy.mockResolvedValue({ id: 5, projectId: 3 });
    membershipFindOneSpy.mockResolvedValue(null);

    const out = parse(await tools.getStoryDetails({ storyId: 5, _userId: 2 }));
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/access denied/i);
  });

  it("returns error when story is not found", async () => {
    storyFindByPkSpy.mockResolvedValue(null);
    const out = parse(await tools.getStoryDetails({ storyId: 999, _userId: 1 }));
    expect(out.success).toBe(false);
    expect(out.error).toMatch("999");
  });

  it("returns error on DB failure", async () => {
    storyFindByPkSpy.mockRejectedValue(new Error("timeout"));
    const out = parse(await tools.getStoryDetails({ storyId: 5, _userId: 1 }));
    expect(out.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("getStoryPullRequest", () => {
  it("returns branch info when user is a member and branch is linked", async () => {
    storyFindByPkSpy.mockResolvedValue({ id: 5, projectId: 3 });
    branchFindOneSpy.mockResolvedValue({ id: 10, title: "feature/login", repoId: "repo-abc" });

    const out = parse(await tools.getStoryPullRequest({ storyId: 5, _userId: 1 }));
    expect(out.success).toBe(true);
    expect(out.data.branch.title).toBe("feature/login");
    expect(out.data.note).toBeDefined();
  });

  it("returns null branch when no branch is linked", async () => {
    storyFindByPkSpy.mockResolvedValue({ id: 5, projectId: 3 });
    branchFindOneSpy.mockResolvedValue(null);

    const out = parse(await tools.getStoryPullRequest({ storyId: 5, _userId: 1 }));
    expect(out.success).toBe(true);
    expect(out.data.branch).toBeNull();
  });

  it("returns access denied when user is not a member", async () => {
    storyFindByPkSpy.mockResolvedValue({ id: 5, projectId: 3 });
    membershipFindOneSpy.mockResolvedValue(null);

    const out = parse(await tools.getStoryPullRequest({ storyId: 5, _userId: 2 }));
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/access denied/i);
  });

  it("returns error when story is not found", async () => {
    storyFindByPkSpy.mockResolvedValue(null);
    const out = parse(await tools.getStoryPullRequest({ storyId: 999, _userId: 1 }));
    expect(out.success).toBe(false);
  });

  it("returns error on DB failure", async () => {
    storyFindByPkSpy.mockRejectedValue(new Error("db error"));
    const out = parse(await tools.getStoryPullRequest({ storyId: 5, _userId: 1 }));
    expect(out.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("createUserStory", () => {
  const base = {
    projectId: 3,
    columnId: 1,
    title: "Build login page",
    description: "Create the login UI",
    priority: "High",
    storyPoint: 5,
    type: "User Story",
    _userId: 1,
  };

  it("creates a story and sets status from the column title", async () => {
    columnFindOneSpy.mockResolvedValue({ id: 1, title: "Backlog", projectId: 3 });
    storyCreateSpy.mockResolvedValue({ id: 10, ...base, status: "Backlog" });

    const out = parse(await tools.createUserStory(base));
    expect(out.success).toBe(true);
    expect(storyCreateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ status: "Backlog", projectId: 3, columnId: 1 }),
    );
    expect(out.message).toMatch(/created/i);
  });

  it("returns access denied when user is not a project member", async () => {
    membershipFindOneSpy.mockResolvedValue(null);
    const out = parse(await tools.createUserStory(base));
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/access denied/i);
    expect(storyCreateSpy).not.toHaveBeenCalled();
  });

  it("trims the title before saving", async () => {
    columnFindOneSpy.mockResolvedValue({ id: 1, title: "Backlog" });
    storyCreateSpy.mockResolvedValue({ id: 11 });
    await tools.createUserStory({ ...base, title: "  spaced title  " });
    expect(storyCreateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ title: "spaced title" }),
    );
  });

  it("returns error when title is empty", async () => {
    const out = parse(await tools.createUserStory({ ...base, title: "" }));
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/title/i);
    expect(storyCreateSpy).not.toHaveBeenCalled();
  });

  it("returns error when title is only whitespace", async () => {
    const out = parse(await tools.createUserStory({ ...base, title: "   " }));
    expect(out.success).toBe(false);
    expect(storyCreateSpy).not.toHaveBeenCalled();
  });

  it("returns error when column not found in the project", async () => {
    columnFindOneSpy.mockResolvedValue(null);
    const out = parse(await tools.createUserStory(base));
    expect(out.success).toBe(false);
    expect(storyCreateSpy).not.toHaveBeenCalled();
  });

  it("returns error when sprint ID is given but not found in the project", async () => {
    columnFindOneSpy.mockResolvedValue({ id: 1, title: "Backlog" });
    sprintFindOneSpy.mockResolvedValue(null);
    const out = parse(await tools.createUserStory({ ...base, sprintId: 99 }));
    expect(out.success).toBe(false);
    expect(storyCreateSpy).not.toHaveBeenCalled();
  });

  it("succeeds when a valid sprintId is provided", async () => {
    columnFindOneSpy.mockResolvedValue({ id: 1, title: "To Do" });
    sprintFindOneSpy.mockResolvedValue({ id: 2, projectId: 3 });
    storyCreateSpy.mockResolvedValue({ id: 12 });
    const out = parse(await tools.createUserStory({ ...base, sprintId: 2 }));
    expect(out.success).toBe(true);
    expect(storyCreateSpy).toHaveBeenCalledWith(expect.objectContaining({ sprintId: 2 }));
  });

  it("returns error on DB failure", async () => {
    columnFindOneSpy.mockResolvedValue({ id: 1, title: "Backlog" });
    storyCreateSpy.mockRejectedValue(new Error("db error"));
    const out = parse(await tools.createUserStory(base));
    expect(out.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("moveUserStory", () => {
  it("updates column and status, then returns the updated story", async () => {
    storyFindByPkSpy
      .mockResolvedValueOnce({ id: 5, projectId: 3 })
      .mockResolvedValueOnce({ id: 5, columnId: 3, status: "In Progress", projectId: 3 });
    columnFindOneSpy.mockResolvedValue({ id: 3, title: "In Progress" });
    storyUpdateSpy.mockResolvedValue([1]);

    const out = parse(await tools.moveUserStory({ storyId: 5, columnId: 3, _userId: 1 }));
    expect(out.success).toBe(true);
    expect(storyUpdateSpy).toHaveBeenCalledWith(
      { columnId: 3, status: "In Progress" },
      { where: { id: 5 } },
    );
    expect(out.message).toMatch(/In Progress/);
  });

  it("returns access denied when user is not a member of the story's project", async () => {
    storyFindByPkSpy.mockResolvedValue({ id: 5, projectId: 3 });
    membershipFindOneSpy.mockResolvedValue(null);

    const out = parse(await tools.moveUserStory({ storyId: 5, columnId: 3, _userId: 2 }));
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/access denied/i);
    expect(storyUpdateSpy).not.toHaveBeenCalled();
  });

  it("returns error when story is not found", async () => {
    storyFindByPkSpy.mockResolvedValue(null);
    const out = parse(await tools.moveUserStory({ storyId: 999, columnId: 3, _userId: 1 }));
    expect(out.success).toBe(false);
    expect(out.error).toMatch("999");
  });

  it("returns error when destination column not found", async () => {
    storyFindByPkSpy.mockResolvedValue({ id: 5, projectId: 3 });
    columnFindOneSpy.mockResolvedValue(null);
    const out = parse(await tools.moveUserStory({ storyId: 5, columnId: 99, _userId: 1 }));
    expect(out.success).toBe(false);
    expect(storyUpdateSpy).not.toHaveBeenCalled();
  });

  it("returns error on DB failure", async () => {
    storyFindByPkSpy.mockRejectedValue(new Error("db error"));
    const out = parse(await tools.moveUserStory({ storyId: 5, columnId: 3, _userId: 1 }));
    expect(out.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("assignUserStory", () => {
  it("creates a new assignment and returns user name", async () => {
    storyFindByPkSpy.mockResolvedValue({ id: 5, projectId: 3 });
    userFindByPkSpy.mockResolvedValue({ id: 2, firstName: "Kim", lastName: "Nguyen" });
    assigneeFindOneSpy.mockResolvedValue(null);
    assigneeCreateSpy.mockResolvedValue({ id: 20, userStoryId: 5, userId: 2 });

    const out = parse(await tools.assignUserStory({ storyId: 5, userId: 2, _userId: 1 }));
    expect(out.success).toBe(true);
    expect(out.data.userName).toBe("Kim Nguyen");
    expect(assigneeCreateSpy).toHaveBeenCalledWith({ userStoryId: 5, userId: 2 });
  });

  it("returns access denied when user is not a member of the story's project", async () => {
    storyFindByPkSpy.mockResolvedValue({ id: 5, projectId: 3 });
    membershipFindOneSpy.mockResolvedValue(null);

    const out = parse(await tools.assignUserStory({ storyId: 5, userId: 2, _userId: 99 }));
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/access denied/i);
    expect(assigneeCreateSpy).not.toHaveBeenCalled();
  });

  it("returns success without duplicate when user is already assigned", async () => {
    storyFindByPkSpy.mockResolvedValue({ id: 5, projectId: 3 });
    userFindByPkSpy.mockResolvedValue({ id: 2, firstName: "Kim", lastName: "Nguyen" });
    assigneeFindOneSpy.mockResolvedValue({ id: 20 });

    const out = parse(await tools.assignUserStory({ storyId: 5, userId: 2, _userId: 1 }));
    expect(out.success).toBe(true);
    expect(out.data.alreadyAssigned).toBe(true);
    expect(assigneeCreateSpy).not.toHaveBeenCalled();
  });

  it("returns error when story is not found", async () => {
    storyFindByPkSpy.mockResolvedValue(null);
    const out = parse(await tools.assignUserStory({ storyId: 999, userId: 2, _userId: 1 }));
    expect(out.success).toBe(false);
    expect(out.error).toMatch("999");
  });

  it("returns error when assignee user is not found", async () => {
    storyFindByPkSpy.mockResolvedValue({ id: 5, projectId: 3 });
    userFindByPkSpy.mockResolvedValue(null);

    const out = parse(await tools.assignUserStory({ storyId: 5, userId: 999, _userId: 1 }));
    expect(out.success).toBe(false);
    expect(out.error).toMatch("999");
    expect(assigneeCreateSpy).not.toHaveBeenCalled();
  });

  it("returns error on DB failure", async () => {
    storyFindByPkSpy.mockRejectedValue(new Error("db error"));
    const out = parse(await tools.assignUserStory({ storyId: 5, userId: 2, _userId: 1 }));
    expect(out.success).toBe(false);
  });
});
