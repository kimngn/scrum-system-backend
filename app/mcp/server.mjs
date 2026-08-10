import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import db from "../models/index.js";

const Project = db.project;
const UserStory = db.userStory;
const Sprint = db.sprint;
const ProjectColumn = db.projectColumn;
const StoryAssignee = db.storyAssignee;
const User = db.user;

const server = new McpServer({ name: "scrum-system", version: "1.0.0" });

// Gets a project's own details, like its name, description, status, and dates.
server.tool(
  "get_project",
  "Gets a project's name, description, status, start date, and end date.",
  { projectId: z.number() },
  async ({ projectId }) => {
    const project = await Project.findByPk(projectId);

    return { content: [{ type: "text", text: JSON.stringify(project) }] };
  },
);

// Lists every user story for a project, with its column, sprint, and assignees.
server.tool(
  "list_stories",
  "Gets every user story for a project, including its column, sprint, priority, story points, and assignees.",
  { projectId: z.number() },
  async ({ projectId }) => {
    const stories = await UserStory.findAll({
      where: { projectId: projectId },
      include: [
        { model: ProjectColumn, as: "column" },
        { model: Sprint, as: "sprint" },
        {
          model: StoryAssignee,
          as: "assignee",
          include: [{ model: User, as: "user", attributes: ["firstName", "lastName"] }],
        },
      ],
    });

    return { content: [{ type: "text", text: JSON.stringify(stories) }] };
  },
);

// Lists every sprint for a project.
server.tool(
  "list_sprints",
  "Gets every sprint for a project, including its name, status, and start/end dates.",
  { projectId: z.number() },
  async ({ projectId }) => {
    const sprints = await Sprint.findAll({
      where: { projectId: projectId },
      order: [["startDate", "ASC"]],
    });

    return { content: [{ type: "text", text: JSON.stringify(sprints) }] };
  },
);

// Lists every storyboard column for a project, in display order.
server.tool(
  "list_columns",
  "Gets every storyboard column for a project, in display order.",
  { projectId: z.number() },
  async ({ projectId }) => {
    const columns = await ProjectColumn.findAll({
      where: { projectId: projectId },
      order: [["displayOrder", "ASC"]],
    });

    return { content: [{ type: "text", text: JSON.stringify(columns) }] };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
