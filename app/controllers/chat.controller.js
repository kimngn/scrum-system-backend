const path = require("path");

const MODEL = "command-a-03-2025";

// Keeps a single MCP client connected instead of spawning a new server process per message.
let mcpClient = null;

async function getMcpClient() {
  if (mcpClient) {
    return mcpClient;
  }

  const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
  const { StdioClientTransport } = await import("@modelcontextprotocol/sdk/client/stdio.js");

  const transport = new StdioClientTransport({
    command: "node",
    args: [path.join(__dirname, "../mcp/server.mjs")],
  });

  const client = new Client({ name: "scrum-system-chat", version: "1.0.0" });
  await client.connect(transport);

  mcpClient = client;
  return mcpClient;
}

// Turns the MCP tool list into the format Cohere's chat API expects.
function buildCohereTools(mcpTools) {
  const tools = [];
  for (let i = 0; i < mcpTools.length; i++) {
    const tool = mcpTools[i];
    tools.push({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    });
  }
  return tools;
}

exports.sendMessage = async (req, res) => {
  const message = req.body.message;
  const projectId = req.body.projectId;
  // Earlier turns in this conversation, sent by the frontend so the bot has memory.
  const history = req.body.history || [];

  if (!message) {
    return res.status(400).send({ message: "Message cannot be empty." });
  }

  try {
    const { CohereClientV2 } = await import("cohere-ai");
    const cohere = new CohereClientV2({ token: process.env.COHERE_API_KEY });

    const client = await getMcpClient();
    const toolList = await client.listTools();
    const cohereTools = buildCohereTools(toolList.tools);

    const messages = [
      {
        role: "system",
        content:
          "You are a helpful assistant for a scrum project management tool called Velo. " +
          "The user is currently looking at the project with id " + projectId + ". " +
          "Use the available tools to look up that project's details, stories, sprints, and columns - " +
          "never guess or make up data like dates, counts, or names. " +
          "Once you have the data you need from tools, you are expected to do your own reasoning, " +
          "analysis, and judgment calls on it yourself - for example counting stories, calculating a " +
          "pace needed to hit a date, prioritizing or ranking stories, summarizing them, or spotting " +
          "patterns. You do not have or need separate tools for these tasks - only use tools to fetch " +
          "the underlying data, then reason over it yourself instead of refusing or saying you're unable to.",
      },
    ];

    // Adds the earlier turns so the model remembers the conversation so far.
    for (let i = 0; i < history.length; i++) {
      messages.push(history[i]);
    }

    messages.push({ role: "user", content: message });

    const firstResponse = await cohere.chat({
      model: MODEL,
      messages: messages,
      tools: cohereTools,
    });

    const toolCalls = firstResponse.message.toolCalls;

    // No tool needed, the model already has an answer.
    if (!toolCalls || toolCalls.length === 0) {
      return res.send({ reply: firstResponse.message.content[0].text });
    }

    // Adds the assistant's tool call request to the conversation.
    messages.push(firstResponse.message);

    // Calls every tool the model asked for through MCP, and adds the results.
    for (let i = 0; i < toolCalls.length; i++) {
      const toolCall = toolCalls[i];
      const toolArguments = JSON.parse(toolCall.function.arguments);

      const toolResult = await client.callTool({
        name: toolCall.function.name,
        arguments: toolArguments,
      });

      messages.push({
        role: "tool",
        toolCallId: toolCall.id,
        // Wraps the raw data in a document block instead of a bare string, so
        // Cohere doesn't try to interpret ids inside our own JSON (e.g. a
        // story's numeric id) as its own document id field.
        content: [{ type: "document", document: { data: { result: toolResult.content[0].text } } }],
      });
    }

    const secondResponse = await cohere.chat({
      model: MODEL,
      messages: messages,
      tools: cohereTools,
    });

    res.send({ reply: secondResponse.message.content[0].text });
  } catch (err) {
    res.status(500).send({
      message: err.message || "Error getting a response from the chatbot.",
    });
  }
};
