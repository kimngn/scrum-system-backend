# Scrum System — Backend

![Coverage](./badges/coverage.svg)

A Node.js / Express REST API for a scrum project-management application with a Vue 3 frontend and an AI-powered chatbot backed by an MCP (Model Context Protocol) server.

---

## Project Setup

### Prerequisites

- Node.js ≥ 18
- MySQL (or MariaDB)

### 1 — Install dependencies

```bash
npm install
```

### 2 — Create a `.env` file

Copy the example and fill in your values:

```bash
cp .env.example .env
```

Required variables:

| Variable | Description |
|---|---|
| `DB_HOST` | Database host (usually `localhost`) |
| `DB_USER` | Database username |
| `DB_PW` | Database password |
| `DB_NAME` | Database name (e.g. `scrum_db`) |
| `SECRET_KEY` | Base-64 JWT signing secret |
| `COHERE_API_KEY` | Cohere API key — get one free at [dashboard.cohere.com](https://dashboard.cohere.com/api-keys) |

> **Never commit `.env`** — it is listed in `.gitignore`.

### 3 — Initialize the database

Creates tables and optionally seeds sample data:

```bash
npm run init-db          # create tables + seed data
npm run init-db:keep     # keep existing tables, only seed missing data
npm run init-db:wipe     # drop all tables then recreate
```

### 4 — Start the backend

```bash
npm run start
```

The API is available at `http://localhost:3200/scrumapi`.

---

## MCP Integration

### What is MCP?

The **Model Context Protocol** is a standard that lets an AI assistant call tools in an application. Instead of the AI inventing answers, it calls a named tool, gets real data back, and reasons over it.

### How it works in this project

```
User → ChatWidget → POST /scrumapi/chat
     → chat.controller.js (Cohere AI)
     → MCP client (@modelcontextprotocol/sdk)
     → app/mcp/server.mjs (stdio, Node.js)
     → Sequelize models → MySQL database
     → structured result → Cohere → chatbot reply
```

The MCP server (`app/mcp/server.mjs`) is spawned once as a child process by the chat controller. It talks directly to the database via Sequelize — no HTTP hop. Authentication is enforced at the `/chat` HTTP route (Bearer token required); the MCP server itself is only accessible through that trusted controller.

### Available MCP tools

| Tool | Description |
|---|---|
| `list_projects` | All projects |
| `get_project` | Single project details |
| `list_stories` | All stories for a project (column, sprint, assignees) |
| `list_sprints` | All sprints for a project ordered by start date |
| `list_columns` | Storyboard columns in display order |
| `get_story_details` | Full details for one story |
| `get_story_pull_request` | GitHub branch linked to a story |
| `create_user_story` | Create a new user story *(confirms first)* |
| `move_user_story` | Move a story to a different column *(confirms first)* |
| `assign_user_story` | Assign a user to a story *(confirms first)* |

> **Note:** `add_acceptance_criteria` is not implemented because there is no dedicated `acceptanceCriteria` table in the current schema. Acceptance criteria can be added to the story `description` field manually.

### MCP resources

| Resource URI | Description |
|---|---|
| `project://{projectId}/backlog` | Stories in the first (Backlog) column |
| `project://{projectId}/active-sprint` | Active sprint and its stories |

### MCP prompts

| Prompt | Description |
|---|---|
| `acceptance_criteria` | Generate Given/When/Then criteria for a feature |
| `sprint_summary` | Summarize sprint progress for a project |
| `blocked_work` | Identify blockers, unassigned stories, overdue sprints |

---

## Running the chatbot

1. Ensure the backend is running (`npm run start`).
2. Start the Vue frontend (see the frontend repository).
3. Open any project workspace — the chat button appears in the bottom-right corner.

The MCP server is started automatically by the backend when the first chat message arrives; no manual step is needed.

### Example chatbot requests

- "List my projects."
- "Show the sprints for project 3."
- "Summarize the active sprint."
- "Which stories are unassigned?"
- "How many story points are in each column?"
- "Create a user story for the login-page error."
- "Move story 12 to In Progress."

---

## Testing with MCP Inspector

The Inspector lets you call MCP tools directly in a browser, without going through the chatbot:

```bash
npx --yes @modelcontextprotocol/inspector node app/mcp/server.mjs
```

Open the printed URL, click **Connect**, then try the **Tools** tab.

> Requires the database to be running so Sequelize can connect.

---

## Running tests

```bash
npm test            # run all tests once
npm run coverage    # run tests with coverage report
```

MCP tool tests live in `app/mcp/tools.test.mjs`. They mock all Sequelize calls so no database connection is needed.

---

## Project structure (MCP-related files)

```
app/
  controllers/
    chat.controller.js   # Cohere AI + MCP client, handles POST /scrumapi/chat
  mcp/
    server.mjs           # MCP server — registers tools, resources, prompts
    tools.mjs            # Tool handler functions (testable independently)
    tools.test.mjs       # Vitest tests for every tool
.env.example             # Template for required environment variables
```
