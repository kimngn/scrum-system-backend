/**
 * Scrum System MCP Server (Node.js / stdio)
 *
 * Spawned as a child process by app/controllers/chat.controller.js.
 * The chat controller already validates the user's Bearer token before
 * forwarding any request here, so no additional auth is needed.
 *
 * Tool implementations live in tools.mjs so they can be unit-tested
 * independently of the stdio transport.
 *
 * IMPORTANT — stdout must stay silent:
 * The MCP stdio transport uses stdout exclusively for JSON-RPC frames.
 * Any stray byte written to stdout (including from import-time module
 * initialisation) would corrupt the protocol and break the client.
 *
 * Static imports are hoisted and evaluated BEFORE any module-body code,
 * so a console.log override placed textually before a static import does
 * NOT prevent import-time logging.  All imports in this file are therefore
 * dynamic (await import()), placed AFTER the console redirect below.  This
 * guarantees the override is active before any dependency code runs.
 */

// Override ALL console output methods to use stderr.
// Must come before every dynamic import.
const _toStderr = (...a) => process.stderr.write("[mcp] " + a.map(String).join(" ") + "\n");
console.log   = _toStderr;
console.info  = _toStderr;
console.warn  = _toStderr;
console.debug = _toStderr;
// console.error already writes to stderr by default — leave it alone.

// ── Dynamic imports (all run after the redirect above) ────────────────────────
const dotenv                              = await import("dotenv");
dotenv.default.config();
const { McpServer, ResourceTemplate }     = await import("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport }            = await import("@modelcontextprotocol/sdk/server/stdio.js");
const { z }                               = await import("zod");
const tools                               = await import("./tools.mjs");
const { default: db }                     = await import("../models/index.js");

const Sprint         = db.sprint;
const UserStory      = db.userStory;
const ProjectColumn  = db.projectColumn;
const StoryAssignee  = db.storyAssignee;
const User           = db.user;

const server = new McpServer({ name: "scrum-system", version: "2.0.0" });

// ── Read tools ───────────────────────────────────────────────────────────────

server.tool(
  "list_projects",
  "Lists every project you are a member of, with its name, status, and dates.",
  {
    _userId: z.number().optional().describe("DO NOT SET — injected by the server with your authenticated user ID."),
  },
  tools.listProjects,
);

server.tool(
  "get_project",
  "Gets a single project's name, description, status, start date, and end date. Only accessible if you are a project member.",
  {
    projectId: z.number().describe("Numeric project ID"),
    _userId: z.number().optional().describe("DO NOT SET — injected by the server."),
  },
  tools.getProject,
);

server.tool(
  "list_stories",
  "Gets every user story for a project, including its column (status), sprint, priority, story points, type, and assignees. " +
  "Story status matches the column title (e.g. Backlog, To Do, In Progress, Ready for Test, Testing, Done). " +
  "Use this data to count stories, compute velocity, find unassigned work, or group by status.",
  {
    projectId: z.number().describe("Numeric project ID"),
    _userId: z.number().optional().describe("DO NOT SET — injected by the server."),
  },
  tools.listStories,
);

server.tool(
  "list_sprints",
  "Gets every sprint for a project ordered by start date. " +
  "Status is one of: planned, active, completed. " +
  "Use this to identify the active sprint, check for overdue sprints (end date passed but not completed), or summarize progress.",
  {
    projectId: z.number().describe("Numeric project ID"),
    _userId: z.number().optional().describe("DO NOT SET — injected by the server."),
  },
  tools.listSprints,
);

server.tool(
  "list_columns",
  "Gets every storyboard column for a project in display order. " +
  "Column titles are the valid story statuses for this project (e.g. Backlog, To Do, In Progress, Done). " +
  "Call this before create_user_story or move_user_story to get valid column IDs.",
  {
    projectId: z.number().describe("Numeric project ID"),
    _userId: z.number().optional().describe("DO NOT SET — injected by the server."),
  },
  tools.listColumns,
);

server.tool(
  "get_story_details",
  "Gets the full details of a single user story: title, description, priority, story points, type, column (status), sprint, and assignees.",
  {
    storyId: z.number().describe("Numeric story ID"),
    _userId: z.number().optional().describe("DO NOT SET — injected by the server."),
  },
  tools.getStoryDetails,
);

server.tool(
  "get_story_pull_request",
  "Returns the GitHub branch linked to a user story. " +
  "Note: pull request URLs are not stored in the database. Use the branch name to find the PR on GitHub.",
  {
    storyId: z.number().describe("Numeric story ID"),
    _userId: z.number().optional().describe("DO NOT SET — injected by the server."),
  },
  tools.getStoryPullRequest,
);

// ── Write tools ──────────────────────────────────────────────────────────────

server.tool(
  "create_user_story",
  "Creates a new user story in a project. " +
  "Call list_columns first to get valid column IDs. The story's status is set automatically from the column title. " +
  "Call this tool once to propose the action. The server will return requiresConfirmation: true. " +
  "Tell the user exactly what will happen and ask them to reply 'yes' or 'no'. " +
  "Do NOT call this tool again in the same turn — confirmation is handled server-side.",
  {
    projectId: z.number().describe("Numeric project ID"),
    columnId: z.number().describe("ID of the column to place the story in (determines its initial status)"),
    title: z.string().describe("Story title (required)"),
    description: z.string().optional().describe("Story description"),
    priority: z.string().optional().describe("Priority: Low, Medium, or High"),
    storyPoint: z.number().optional().describe("Story point estimate"),
    type: z.enum(["Bug", "Blocker", "Issue", "User Story"]).optional().describe("Story type"),
    sprintId: z.number().optional().describe("Sprint ID to assign this story to (optional)"),
    _userId: z.number().optional().describe("DO NOT SET — injected by the server."),
  },
  tools.createUserStory,
);

server.tool(
  "move_user_story",
  "Moves a user story to a different storyboard column, which also updates its status. " +
  "Call list_columns to find valid column IDs. " +
  "Call this tool once to propose the action; the server returns requiresConfirmation: true. " +
  "Do NOT call this tool again in the same turn — confirmation is handled server-side.",
  {
    storyId: z.number().describe("Numeric story ID"),
    columnId: z.number().describe("ID of the destination column"),
    _userId: z.number().optional().describe("DO NOT SET — injected by the server."),
  },
  tools.moveUserStory,
);

server.tool(
  "assign_user_story",
  "Assigns a user to a user story. " +
  "User IDs appear in the assignee list returned by list_stories or get_story_details. " +
  "Call this tool once to propose the action; the server returns requiresConfirmation: true. " +
  "Do NOT call this tool again in the same turn — confirmation is handled server-side.",
  {
    storyId: z.number().describe("Numeric story ID"),
    userId: z.number().describe("Numeric user ID to assign"),
    _userId: z.number().optional().describe("DO NOT SET — injected by the server."),
  },
  tools.assignUserStory,
);

// ── Resources ─────────────────────────────────────────────────────────────────
// Resources can be read by any MCP client (e.g. the Inspector).
// The chat controller does not currently fetch resources directly.

server.resource(
  "project-backlog",
  new ResourceTemplate("project://{projectId}/backlog", { list: undefined }),
  async (uri, { projectId }) => {
    try {
      const columns = await ProjectColumn.findAll({
        where: { projectId },
        order: [["displayOrder", "ASC"]],
      });
      const backlogCol = columns.find((c) => c.title.toLowerCase() === "backlog") || columns[0];
      const stories = backlogCol
        ? await UserStory.findAll({ where: { projectId, columnId: backlogCol.id } })
        : [];
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify({ projectId, backlogColumn: backlogCol?.title ?? null, stories }),
          mimeType: "application/json",
        }],
      };
    } catch {
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify({ error: "Failed to load backlog." }),
          mimeType: "application/json",
        }],
      };
    }
  },
);

server.resource(
  "active-sprint",
  new ResourceTemplate("project://{projectId}/active-sprint", { list: undefined }),
  async (uri, { projectId }) => {
    try {
      const sprint = await Sprint.findOne({ where: { projectId, status: "active" } });
      if (!sprint) {
        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify({ sprint: null, stories: [], message: "No active sprint." }),
            mimeType: "application/json",
          }],
        };
      }
      const stories = await UserStory.findAll({
        where: { sprintId: sprint.id },
        include: [
          { model: ProjectColumn, as: "column" },
          {
            model: StoryAssignee,
            as: "assignee",
            include: [{ model: User, as: "user", attributes: ["id", "firstName", "lastName"] }],
          },
        ],
      });
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify({ sprint, stories }),
          mimeType: "application/json",
        }],
      };
    } catch {
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify({ error: "Failed to load active sprint." }),
          mimeType: "application/json",
        }],
      };
    }
  },
);

// ── Prompts ───────────────────────────────────────────────────────────────────

server.prompt(
  "acceptance_criteria",
  "Generate Given/When/Then acceptance criteria for a user story feature.",
  { feature: z.string().describe("Short description of the feature or behaviour to cover") },
  async ({ feature }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text:
          `Write detailed Given/When/Then acceptance criteria for the following feature:\n\n"${feature}"\n\n` +
          "Format each criterion as:\n" +
          "  Given <precondition>\n" +
          "  When <action>\n" +
          "  Then <expected result>\n\n" +
          "Include at least one happy-path scenario and one edge or error case.",
      },
    }],
  }),
);

server.prompt(
  "sprint_summary",
  "Summarize sprint progress for a project: stories by status, points completed, and overdue items.",
  { projectId: z.string().describe("Numeric project ID") },
  async ({ projectId }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text:
          `Use the list_sprints and list_stories tools for project ${projectId} to produce a concise sprint progress summary. ` +
          "Include: which sprint is active, how many stories are in each column/status, total story points vs completed, " +
          "and flag any sprints whose end date has already passed but are not yet marked completed.",
      },
    }],
  }),
);

server.prompt(
  "blocked_work",
  "Identify blocked, unassigned, or overdue work in a project.",
  { projectId: z.string().describe("Numeric project ID") },
  async ({ projectId }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text:
          `Use the list_stories and list_sprints tools for project ${projectId} to identify: ` +
          "(1) stories with type 'Blocker' or 'Bug', " +
          "(2) stories that have no assignee, " +
          "(3) any sprint whose end date has already passed but is not yet completed. " +
          "Present the findings clearly so the team can act on them immediately.",
      },
    }],
  }),
);

// ── Transport ─────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
