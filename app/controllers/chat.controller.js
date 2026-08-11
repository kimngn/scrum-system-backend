const path = require("path");
const { storePending, peekPending, consumePending, clearPending } = require("../mcp/pendingActions.js");

const MODEL = "command-a-03-2025";

// Write tools that require an explicit two-step confirmation from the user.
const WRITE_TOOLS = new Set(["create_user_story", "move_user_story", "assign_user_story"]);

// Matches short, unambiguous affirmative messages.  Long or complex messages
// are never treated as confirmations to avoid false positives.
const AFFIRMATIVE_RE = /^\s*(yes|y|yep|yeah|yup|confirm(?:ed)?|ok(?:ay)?|sure|proceed|do\s*it|go\s*ahead|approved?)\s*[.!]?\s*$/i;
const CANCEL_RE      = /^\s*(no|n|nope|cancel(?:led)?|abort|stop|never\s*mind)\s*[.!]?\s*$/i;

function isAffirmative(message) { return AFFIRMATIVE_RE.test(message); }
function isCancellation(message) { return CANCEL_RE.test(message); }

// Human-readable summary of a proposed write operation (never exposes tokens).
function describeProposal(toolName, args) {
  switch (toolName) {
    case "create_user_story":
      return `Create user story "${args.title}" in column ${args.columnId} of project ${args.projectId}`;
    case "move_user_story":
      return `Move story ${args.storyId} to column ${args.columnId}`;
    case "assign_user_story":
      return `Assign user ${args.userId} to story ${args.storyId}`;
    default:
      return toolName;
  }
}

// ── MCP client singleton ──────────────────────────────────────────────────────
// A single long-lived child process is reused across all chat requests.
// A connection promise prevents the TOCTOU race where two concurrent requests
// both see mcpClient === null and each spawn a separate server process.

let mcpClient = null;
let mcpClientPromise = null;

async function getMcpClient() {
  if (mcpClient) return mcpClient;
  if (mcpClientPromise) return mcpClientPromise;

  mcpClientPromise = (async () => {
    const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
    const { StdioClientTransport } = await import("@modelcontextprotocol/sdk/client/stdio.js");

    const transport = new StdioClientTransport({
      command: "node",
      args: [path.join(__dirname, "../mcp/server.mjs")],
    });

    const client = new Client({ name: "scrum-system-chat", version: "1.0.0" });
    await client.connect(transport);

    mcpClient = client;
    mcpClientPromise = null;
    return client;
  })();

  return mcpClientPromise;
}

// Closes the existing client and clears the singleton so the next request
// spawns a fresh one.  Called on unexpected errors or detected crashes.
function resetMcpClient() {
  if (mcpClient) {
    try { mcpClient.close(); } catch { /* ignore */ }
  }
  mcpClient = null;
  mcpClientPromise = null;
}

// Shut down the MCP child process cleanly when the backend exits.
let _exitHandlerRegistered = false;
function ensureExitHandler() {
  if (_exitHandlerRegistered) return;
  _exitHandlerRegistered = true;
  const shutdown = () => {
    if (mcpClient) {
      try { mcpClient.close(); } catch { /* ignore */ }
    }
  };
  process.on("exit", shutdown);
  process.on("SIGINT", () => { shutdown(); process.exit(0); });
  process.on("SIGTERM", () => { shutdown(); process.exit(0); });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Turns the MCP tool list into the format Cohere's chat API expects.
function buildCohereTools(mcpTools) {
  return mcpTools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    },
  }));
}

// ── Request handler ───────────────────────────────────────────────────────────

exports.sendMessage = async (req, res) => {
  const message = req.body.message;
  const projectId = req.body.projectId;
  // Earlier turns in this conversation, sent by the frontend so the bot has memory.
  const history = req.body.history || [];

  if (!message) {
    return res.status(400).send({ message: "Message cannot be empty." });
  }

  // req.userId is set by authenticateRoute after cryptographic verification of
  // the session token.  No second DB lookup is needed here.
  const authenticatedUserId = req.userId;
  if (!authenticatedUserId) {
    return res.status(401).send({ message: "Authentication required." });
  }

  // ── Confirmation gate (must run before Cohere) ─────────────────────────────
  // Check whether the user is responding to a pending write-action proposal.
  // This check happens in a SEPARATE HTTP request from the proposal: the prior
  // request stored the action and ended; the AI cannot trigger this path.
  const pendingAction = peekPending(authenticatedUserId);
  if (pendingAction) {
    if (isAffirmative(message)) {
      // consumePending validates expiry and deletes the entry atomically.
      const confirmed = consumePending(authenticatedUserId);
      if (!confirmed) {
        return res.send({ reply: "The pending action has expired. Please request it again." });
      }
      let reply;
      try {
        const client = await getMcpClient();
        ensureExitHandler();
        // Execute the stored snapshot — never the AI's current arguments.
        const toolResult = await client.callTool({
          name: confirmed.toolName,
          arguments: { ...confirmed.args, _userId: authenticatedUserId },
        });
        const data = JSON.parse(toolResult?.content?.[0]?.text ?? "{}");
        reply = data.success
          ? (data.message || "Done! The action completed successfully.")
          : `The action could not be completed: ${data.error}`;
      } catch {
        resetMcpClient();
        reply = "The action could not be completed. Please try again.";
      }
      return res.send({ reply });
    }

    if (isCancellation(message)) {
      clearPending(authenticatedUserId);
      return res.send({ reply: "Action cancelled." });
    }
    // Ambiguous message: fall through to normal Cohere flow.
    // The pending action remains and will expire after 5 minutes.
  }

  try {
    const { CohereClientV2 } = await import("cohere-ai");
    const cohere = new CohereClientV2({ token: process.env.COHERE_API_KEY });

    // Reuse the cached MCP client; reset and retry once if it has died.
    let client;
    try {
      client = await getMcpClient();
      ensureExitHandler();
    } catch {
      resetMcpClient();
      client = await getMcpClient();
    }

    const toolList = await client.listTools();
    const cohereTools = buildCohereTools(toolList.tools);

    // Include pending action context so the AI can remind the user if needed.
    const pendingNote = pendingAction
      ? `\nNOTE: There is a pending write action waiting for user confirmation: ` +
        `"${describeProposal(pendingAction.toolName, pendingAction.args)}". ` +
        `If the user is confirming this, their reply will be detected automatically before reaching you. ` +
        `Do not attempt to execute this action again.`
      : "";

    const messages = [
      {
        role: "system",
        content:
          "You are a helpful assistant for a scrum project management tool called Velo. " +
          "The user is currently looking at the project with id " + projectId + ". " +
          "Use the available tools to look up that project's details, stories, sprints, and columns — " +
          "never guess or make up data like dates, counts, or names. " +
          "Once you have the data you need from tools, do your own reasoning and analysis: " +
          "count stories, compute velocity, rank priorities, summarize, spot patterns. " +
          "For write tools (create_user_story, move_user_story, assign_user_story): " +
          "IMPORTANT — you must NEVER guess numeric IDs. " +
          "If you need a column ID, call list_columns first; if you need a story ID, call list_stories first. " +
          "Use the actual id fields from those responses. " +
          "Once you have the correct IDs, call the write tool ONCE to propose the action. " +
          "The result will include requiresConfirmation: true. " +
          "Tell the user exactly what you are about to do (include column name and story title) " +
          "and ask them to reply 'yes' to confirm or 'no' to cancel. " +
          "Do NOT call the write tool again in the same turn — confirmation is handled server-side." + pendingNote,
      },
    ];

    for (let i = 0; i < history.length; i++) {
      messages.push(history[i]);
    }

    messages.push({ role: "user", content: message });

    // ── Cohere tool-calling loop ──────────────────────────────────────────────
    // Run up to MAX_LOOPS Cohere calls so the AI can chain read tools before
    // proposing a write.  For example: list_columns → create_user_story.
    // The loop breaks as soon as the AI produces a text reply OR a write tool
    // is intercepted (pending action stored; AI asked to confirm).
    const MAX_LOOPS = 5;
    let loopCount = 0;

    while (loopCount < MAX_LOOPS) {
      loopCount++;
      const response = await cohere.chat({
        model: MODEL,
        messages: messages,
        tools: cohereTools,
      });

      const toolCalls = response.message.toolCalls;

      // No tool call — the AI produced a final text reply.
      if (!toolCalls || toolCalls.length === 0) {
        const text = response.message?.content?.[0]?.text ?? "I was unable to generate a response.";
        return res.send({ reply: text });
      }

      messages.push(response.message);

      // Execute each tool call the AI requested this iteration.
      let wroteProposal = false;
      for (const toolCall of toolCalls) {
        let toolArguments;
        try {
          toolArguments = JSON.parse(toolCall.function.arguments);
        } catch {
          toolArguments = {};
        }

        // Always override _userId with the server-verified identity.
        toolArguments._userId = authenticatedUserId;

        let resultText = "";

        if (WRITE_TOOLS.has(toolCall.function.name)) {
          // ── Proposal path ────────────────────────────────────────────────
          // Store a snapshot; execution only happens in the next HTTP request
          // after the user sends an affirmative message.
          const argsToStore = { ...toolArguments };
          delete argsToStore._userId;

          storePending(authenticatedUserId, toolCall.function.name, argsToStore);
          wroteProposal = true;
          resultText = JSON.stringify({
            requiresConfirmation: true,
            proposal: describeProposal(toolCall.function.name, argsToStore),
            instructions:
              "Tell the user exactly what action you are about to perform (include the column name, " +
              "project name, and story title) and ask them to reply 'yes' to confirm or 'no' to cancel. " +
              "Do NOT call this tool again in the current turn.",
          });
        } else {
          // ── Read tool path ──────────────────────────────────────────────
          try {
            const toolResult = await client.callTool({
              name: toolCall.function.name,
              arguments: toolArguments,
            });
            resultText = toolResult?.content?.[0]?.text ?? JSON.stringify({ error: "Tool returned no content." });
          } catch {
            resetMcpClient();
            resultText = JSON.stringify({ error: "Tool call failed. Please try again." });
          }
        }

        messages.push({
          role: "tool",
          toolCallId: toolCall.id,
          content: [{ type: "document", document: { data: { result: resultText } } }],
        });
      }

      // If a write tool was intercepted this iteration, run one more Cohere
      // call so the AI can compose its confirmation-request reply, then stop.
      if (wroteProposal) {
        const confirmResponse = await cohere.chat({
          model: MODEL,
          messages: messages,
          tools: cohereTools,
        });
        const text = confirmResponse.message?.content?.[0]?.text ?? "I was unable to generate a response.";
        return res.send({ reply: text });
      }
    }

    res.send({ reply: "I was unable to generate a response." });
  } catch (err) {
    console.error("[chat] error:", err?.message ?? err);
    resetMcpClient();
    res.status(500).send({ message: "Error getting a response from the chatbot." });
  }
};
