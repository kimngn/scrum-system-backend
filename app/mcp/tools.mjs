/**
 * MCP tool handler functions.
 *
 * Each function takes the tool arguments, queries the database via Sequelize,
 * and returns a valid MCP content block.  They are kept separate from
 * server.mjs so they can be tested without starting the stdio transport.
 *
 * Authorization: every project-scoped tool verifies that _userId (always
 * injected and overridden by the chat controller from the verified session
 * token) holds a ProjectMembership row for the requested project.
 * A missing or non-member _userId is rejected before any data is returned.
 *
 * Write tools are only reached after the chat controller has validated a
 * per-user, single-use, time-limited confirmation token (pendingActions.js).
 *
 * Internal error details and stack traces are never forwarded to callers.
 */

import db from "../models/index.js";

const Project = db.project;
const UserStory = db.userStory;
const Sprint = db.sprint;
const ProjectColumn = db.projectColumn;
const StoryAssignee = db.storyAssignee;
const User = db.user;
const Branch = db.branch;
const ProjectMembership = db.projectMembership;

// ── Response helpers ─────────────────────────────────────────────────────────

function ok(data, message) {
  const payload = { success: true, data };
  if (message) payload.message = message;
  return { content: [{ type: "text", text: JSON.stringify(payload) }] };
}

function fail(error) {
  return { content: [{ type: "text", text: JSON.stringify({ success: false, error }) }] };
}

// ── Authorization helper ──────────────────────────────────────────────────────

async function requireMembership(userId, projectId) {
  if (!userId) return fail("Authentication required.");
  // Admins can access any project without membership
  const user = await User.findByPk(userId, { attributes: ["role"] });
  if (user && user.role === "admin") return null; // null = access granted
  const membership = await ProjectMembership.findOne({ where: { userId, projectId } });
  if (!membership) return fail("Access denied to this project.");
  return null; // null = access granted
}

// ── Read tools ───────────────────────────────────────────────────────────────

export async function listProjects({ _userId } = {}) {
  try {
    if (!_userId) return fail("Authentication required.");
    const memberships = await ProjectMembership.findAll({
      where: { userId: _userId },
      include: [{ model: Project, as: "project" }],
    });
    return ok(memberships.map((m) => m.project));
  } catch {
    return fail("Failed to list projects.");
  }
}

export async function getProject({ projectId, _userId }) {
  try {
    const denied = await requireMembership(_userId, projectId);
    if (denied) return denied;
    const project = await Project.findByPk(projectId);
    if (!project) return fail(`Project ${projectId} not found.`);
    return ok(project);
  } catch {
    return fail("Failed to get project.");
  }
}

export async function listStories({ projectId, _userId }) {
  try {
    const denied = await requireMembership(_userId, projectId);
    if (denied) return denied;
    const stories = await UserStory.findAll({
      where: { projectId },
      include: [
        { model: ProjectColumn, as: "column" },
        { model: Sprint, as: "sprint" },
        {
          model: StoryAssignee,
          as: "assignee",
          include: [{ model: User, as: "user", attributes: ["id", "firstName", "lastName"] }],
        },
      ],
    });
    return ok(stories);
  } catch {
    return fail("Failed to list stories.");
  }
}

export async function listSprints({ projectId, _userId }) {
  try {
    const denied = await requireMembership(_userId, projectId);
    if (denied) return denied;
    const sprints = await Sprint.findAll({
      where: { projectId },
      order: [["startDate", "ASC"]],
    });
    return ok(sprints);
  } catch {
    return fail("Failed to list sprints.");
  }
}

export async function listColumns({ projectId, _userId }) {
  try {
    const denied = await requireMembership(_userId, projectId);
    if (denied) return denied;
    const columns = await ProjectColumn.findAll({
      where: { projectId },
      order: [["displayOrder", "ASC"]],
    });
    return ok(columns);
  } catch {
    return fail("Failed to list columns.");
  }
}

export async function getStoryDetails({ storyId, _userId }) {
  try {
    const story = await UserStory.findByPk(storyId, {
      include: [
        { model: ProjectColumn, as: "column" },
        { model: Sprint, as: "sprint" },
        {
          model: StoryAssignee,
          as: "assignee",
          include: [{ model: User, as: "user", attributes: ["id", "firstName", "lastName", "email"] }],
        },
      ],
    });
    if (!story) return fail(`Story ${storyId} not found.`);
    const denied = await requireMembership(_userId, story.projectId);
    if (denied) return denied;
    return ok(story);
  } catch {
    return fail("Failed to get story details.");
  }
}

export async function getStoryPullRequest({ storyId, _userId }) {
  try {
    const story = await UserStory.findByPk(storyId);
    if (!story) return fail(`Story ${storyId} not found.`);
    const denied = await requireMembership(_userId, story.projectId);
    if (denied) return denied;

    const branch = await Branch.findOne({
      where: { userStoryId: storyId },
      order: [["createdAt", "ASC"]],
    });

    if (!branch) {
      return ok({ branch: null }, "No branch is linked to this story.");
    }

    return ok({
      branch: { id: branch.id, title: branch.title, repoId: branch.repoId },
      note: "Pull request URL is not stored in this system. Use the branch name to find the PR on GitHub.",
    });
  } catch {
    return fail("Failed to get story branch.");
  }
}

// ── Write tools ──────────────────────────────────────────────────────────────
// These handlers are only invoked AFTER the chat controller has consumed a
// valid, per-user, single-use confirmation token (see pendingActions.js).
// Authorization is enforced here as a second layer.

export async function createUserStory({
  projectId, columnId, title, description,
  priority, storyPoint, type, sprintId, _userId,
}) {
  try {
    const denied = await requireMembership(_userId, projectId);
    if (denied) return denied;

    if (!title || title.trim() === "") return fail("Title is required.");

    const column = await ProjectColumn.findOne({ where: { id: columnId, projectId } });
    if (!column) return fail(`Column ${columnId} not found in project ${projectId}.`);

    if (sprintId != null) {
      const sprint = await Sprint.findOne({ where: { id: sprintId, projectId } });
      if (!sprint) return fail(`Sprint ${sprintId} not found in project ${projectId}.`);
    }

    const story = await UserStory.create({
      title: title.trim(),
      description: description || null,
      priority: priority || null,
      storyPoint: storyPoint != null ? Number(storyPoint) : null,
      status: column.title,
      projectId,
      columnId,
      sprintId: sprintId || null,
      type: type || null,
    });

    return ok(story, "User story created successfully.");
  } catch {
    return fail("Failed to create user story.");
  }
}

export async function moveUserStory({ storyId, columnId, _userId }) {
  try {
    const story = await UserStory.findByPk(storyId);
    if (!story) return fail(`Story ${storyId} not found.`);
    const denied = await requireMembership(_userId, story.projectId);
    if (denied) return denied;

    const column = await ProjectColumn.findOne({
      where: { id: columnId, projectId: story.projectId },
    });
    if (!column) return fail(`Column ${columnId} not found in this story's project.`);

    await UserStory.update({ columnId, status: column.title }, { where: { id: storyId } });
    const updated = await UserStory.findByPk(storyId);

    return ok(updated, `Story moved to "${column.title}".`);
  } catch {
    return fail("Failed to move story.");
  }
}

export async function assignUserStory({ storyId, userId, _userId }) {
  try {
    const story = await UserStory.findByPk(storyId);
    if (!story) return fail(`Story ${storyId} not found.`);
    const denied = await requireMembership(_userId, story.projectId);
    if (denied) return denied;

    const user = await User.findByPk(userId, {
      attributes: ["id", "firstName", "lastName"],
    });
    if (!user) return fail(`User ${userId} not found.`);

    const existing = await StoryAssignee.findOne({
      where: { userStoryId: storyId, userId },
    });
    if (existing) {
      return ok(
        { alreadyAssigned: true },
        `${user.firstName} ${user.lastName} is already assigned to this story.`,
      );
    }

    const assignment = await StoryAssignee.create({ userStoryId: storyId, userId });

    return ok(
      { id: assignment.id, storyId, userId, userName: `${user.firstName} ${user.lastName}` },
      `${user.firstName} ${user.lastName} assigned to story successfully.`,
    );
  } catch {
    return fail("Failed to assign user to story.");
  }
}
