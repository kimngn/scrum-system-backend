"""
Scrum System Python MCP Server — STANDALONE INSPECTION TOOL ONLY
=================================================================

THIS FILE IS NOT USED BY THE CHATBOT.

The authoritative MCP implementation used by the live chatbot is:
  app/mcp/server.mjs  (Node.js, @modelcontextprotocol/sdk, Sequelize)

This Python server is a separate, standalone tool built with FastMCP.
It authenticates against the REST API via SCRUM_EMAIL / SCRUM_PASSWORD
and is useful for exploring the API through the MCP Inspector or other
MCP clients without needing direct database access.

It must never be used in production as a replacement for app/mcp/server.mjs.
It does not enforce per-user session isolation or the write-confirmation
mechanism implemented in the Node.js server and chat controller.

Required environment variables (copy mcp_server/.env.example to mcp_server/.env):
  SCRUM_API_URL   — base URL of the backend (default: http://localhost:3200/scrumapi)
  SCRUM_EMAIL     — account email for REST API login
  SCRUM_PASSWORD  — account password for REST API login

Run (Inspector):
  npx --yes @modelcontextprotocol/inspector python mcp_server/server.py

Run (direct):
  source mcp_server/.venv/bin/activate && python mcp_server/server.py
"""

import base64
import os
from datetime import datetime
from pathlib import Path
from typing import Optional

import httpx
from fastmcp import FastMCP

try:
    from dotenv import load_dotenv
    _env_file = Path(__file__).parent / ".env"
    if _env_file.exists():
        load_dotenv(_env_file)
except ImportError:
    pass

mcp = FastMCP("Scrum System")

API_BASE: str = os.environ.get("SCRUM_API_URL", "http://localhost:3200/scrumapi")

_token: Optional[str] = None


def _headers() -> dict:
    if not _token:
        raise ValueError(
            "Not authenticated. Call the login tool first, or set "
            "SCRUM_EMAIL and SCRUM_PASSWORD environment variables."
        )
    return {"Authorization": f"Bearer {_token}"}


def _try_auto_login() -> None:
    global _token
    email = os.environ.get("SCRUM_EMAIL", "")
    password = os.environ.get("SCRUM_PASSWORD", "")
    if email and password and not _token:
        credentials = base64.b64encode(f"{email}:{password}".encode()).decode()
        try:
            resp = httpx.post(
                f"{API_BASE}/login",
                headers={"Authorization": f"Basic {credentials}"},
                timeout=10,
            )
            if resp.status_code == 200:
                _token = resp.json()["token"]
                print(f"[MCP] Auto-logged in as {email}", flush=True)
            else:
                print(f"[MCP] Auto-login failed: {resp.text}", flush=True)
        except Exception as e:
            print(f"[MCP] Auto-login error: {e}", flush=True)


# ---------------------------------------------------------------------------
# Tools
# ---------------------------------------------------------------------------

@mcp.tool()
def login(email: str, password: str) -> str:
    """Log in to the Scrum System and cache the session token.
    Call this first if SCRUM_EMAIL / SCRUM_PASSWORD env vars are not set.

    Args:
        email: The user's email address.
        password: The user's password.
    """
    global _token
    credentials = base64.b64encode(f"{email}:{password}".encode()).decode()
    try:
        resp = httpx.post(
            f"{API_BASE}/login",
            headers={"Authorization": f"Basic {credentials}"},
            timeout=10,
        )
    except httpx.ConnectError:
        return f"Error: Cannot connect to the API at {API_BASE}. Is the backend running?"
    if resp.status_code == 200:
        data = resp.json()
        _token = data["token"]
        return (
            f"Logged in as {data.get('firstName', '')} {data.get('lastName', '')} "
            f"(userId={data.get('id')})."
        )
    return f"Login failed ({resp.status_code}): {resp.text}"


@mcp.tool()
def list_projects() -> str:
    """List all projects in the Scrum System with their status and sprint count."""
    try:
        resp = httpx.get(f"{API_BASE}/projects/", headers=_headers(), timeout=10)
    except httpx.ConnectError:
        return f"Error: Cannot connect to the API at {API_BASE}."
    if resp.status_code != 200:
        return f"Error {resp.status_code}: {resp.text}"
    projects = resp.json()
    if not projects:
        return "No projects found."
    lines = [f"Found {len(projects)} project(s):\n"]
    for p in projects:
        sprints = p.get("sprint", [])
        active = [s for s in sprints if s.get("status") == "active"]
        lines.append(
            f"  [{p['id']}] {p['name']}\n"
            f"       Status: {p.get('status', 'N/A')} | "
            f"Sprints: {len(sprints)} | "
            f"Active sprint: {'Yes' if active else 'None'}"
        )
    return "\n".join(lines)


@mcp.tool()
def get_project_sprints(project_id: int) -> str:
    """Get all sprints for a project, including their status and date range.
    Flags sprints that are overdue (end date has passed but not completed).

    Args:
        project_id: The numeric ID of the project.
    """
    try:
        resp = httpx.get(
            f"{API_BASE}/sprints/project/{project_id}",
            headers=_headers(),
            timeout=10,
        )
    except httpx.ConnectError:
        return f"Error: Cannot connect to the API at {API_BASE}."
    if resp.status_code != 200:
        return f"Error {resp.status_code}: {resp.text}"
    sprints = resp.json()
    if not sprints:
        return f"No sprints found for project {project_id}."
    today = datetime.today().date()
    lines = [f"Sprints for project {project_id} ({len(sprints)} total):\n"]
    for s in sprints:
        end = datetime.strptime(s["endDate"][:10], "%Y-%m-%d").date()
        overdue_flag = (
            " [OVERDUE]" if s["status"] != "completed" and end < today else ""
        )
        lines.append(
            f"  [{s['id']}] {s['name']}\n"
            f"       Status: {s['status']} | "
            f"{s['startDate'][:10]} -> {s['endDate'][:10]}{overdue_flag}"
        )
    return "\n".join(lines)


@mcp.tool()
def get_sprint_summary(project_id: int, sprint_id: int) -> str:
    """Summarize a sprint by listing its user stories grouped by status,
    with story point totals and assignee information.

    Args:
        project_id: The numeric ID of the project.
        sprint_id: The numeric ID of the sprint to summarize.
    """
    try:
        resp = httpx.get(
            f"{API_BASE}/projects/{project_id}/stories",
            headers=_headers(),
            timeout=10,
        )
    except httpx.ConnectError:
        return f"Error: Cannot connect to the API at {API_BASE}."
    if resp.status_code != 200:
        return f"Error {resp.status_code}: {resp.text}"

    all_stories = resp.json()
    stories = [s for s in all_stories if s.get("sprintId") == sprint_id]
    if not stories:
        return f"No stories found for sprint {sprint_id} in project {project_id}."

    by_status: dict = {}
    total_points = 0
    for s in stories:
        status = s.get("status", "Unknown")
        points = s.get("storyPoint") or 0
        total_points += points
        by_status.setdefault(status, []).append(s)

    lines = [
        f"Sprint {sprint_id} Summary "
        f"({len(stories)} stories, {total_points} total story points):\n"
    ]
    for status, group in by_status.items():
        group_points = sum(s.get("storyPoint") or 0 for s in group)
        lines.append(f"  {status} — {len(group)} stories, {group_points} pts:")
        for s in group:
            assignees = [
                f"{a['user']['firstName']} {a['user']['lastName']}"
                for a in s.get("assignee", [])
                if a.get("user")
            ]
            assignee_str = ", ".join(assignees) if assignees else "Unassigned"
            lines.append(
                f"    - [{s['id']}] {s['title']} "
                f"({s.get('storyPoint') or 0} pts | {s.get('priority', 'N/A')} priority | {assignee_str})"
            )
    return "\n".join(lines)


@mcp.tool()
def get_project_health(project_id: int) -> str:
    """Generate a health report for a project covering sprint progress,
    story completion rate, story point burndown, overdue sprints, and
    unassigned stories.

    Args:
        project_id: The numeric ID of the project.
    """
    try:
        sprints_resp = httpx.get(
            f"{API_BASE}/sprints/project/{project_id}",
            headers=_headers(),
            timeout=10,
        )
        stories_resp = httpx.get(
            f"{API_BASE}/projects/{project_id}/stories",
            headers=_headers(),
            timeout=10,
        )
    except httpx.ConnectError:
        return f"Error: Cannot connect to the API at {API_BASE}."

    if sprints_resp.status_code != 200:
        return f"Sprint fetch error {sprints_resp.status_code}: {sprints_resp.text}"
    if stories_resp.status_code != 200:
        return f"Stories fetch error {stories_resp.status_code}: {stories_resp.text}"

    sprints = sprints_resp.json()
    stories = stories_resp.json()
    today = datetime.today().date()

    # Sprint metrics
    total_sprints = len(sprints)
    completed_sprints = sum(1 for s in sprints if s["status"] == "completed")
    active_sprints = [s for s in sprints if s["status"] == "active"]
    planned_sprints = sum(1 for s in sprints if s["status"] == "planned")
    overdue_sprints = [
        s for s in sprints
        if s["status"] != "completed"
        and datetime.strptime(s["endDate"][:10], "%Y-%m-%d").date() < today
    ]

    # Story metrics
    total_stories = len(stories)
    done_stories = sum(1 for s in stories if s.get("status") == "Done")
    in_progress = sum(1 for s in stories if s.get("status") == "In Progress")
    backlog_stories = sum(1 for s in stories if s.get("status") == "Backlog")
    unassigned = [s for s in stories if not s.get("assignee")]
    total_pts = sum(s.get("storyPoint") or 0 for s in stories)
    done_pts = sum(s.get("storyPoint") or 0 for s in stories if s.get("status") == "Done")

    completion_pct = round(done_stories / total_stories * 100) if total_stories else 0
    pts_pct = round(done_pts / total_pts * 100) if total_pts else 0

    lines = [
        f"=== Project {project_id} — Health Report ===",
        f"Generated: {today}\n",
        "SPRINTS",
        f"  Total: {total_sprints}  |  Completed: {completed_sprints}  |  "
        f"Active: {len(active_sprints)}  |  Planned: {planned_sprints}",
    ]

    if active_sprints:
        a = active_sprints[0]
        lines.append(
            f"  Active: [{a['id']}] {a['name']} "
            f"(ends {a['endDate'][:10]})"
        )

    if overdue_sprints:
        lines.append(
            f"  WARNING: {len(overdue_sprints)} overdue sprint(s): "
            + ", ".join(f"[{s['id']}] {s['name']}" for s in overdue_sprints)
        )

    lines += [
        "",
        "USER STORIES",
        f"  Total: {total_stories}  |  Done: {done_stories}  |  "
        f"In Progress: {in_progress}  |  Backlog: {backlog_stories}",
        f"  Story Points: {done_pts}/{total_pts} completed ({pts_pct}%)",
        f"  Overall Completion: {completion_pct}% ({done_stories}/{total_stories} stories done)",
    ]

    if unassigned:
        lines.append(f"\n  WARNING: {len(unassigned)} unassigned story/stories:")
        for s in unassigned[:5]:
            lines.append(f"    - [{s['id']}] {s['title']} ({s.get('status')})")
        if len(unassigned) > 5:
            lines.append(f"    ...and {len(unassigned) - 5} more")

    return "\n".join(lines)


if __name__ == "__main__":
    _try_auto_login()
    mcp.run()
