import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import z from "zod";
import fs from "node:fs/promises";
import path from "node:path";

const DATA_FILE = path.join(process.cwd(), "src", "data", "users.json");

const server = new McpServer({
  name: "test",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
    prompt: {},
  },
});

// server.tool(...):
server.tool(
  "create-user",
  "create a new user in data base",
  // <-- raw shape (ZodRawShape)
  {
    name: z.string(),
    email: z.string(),
    address: z.string(),
    phone: z.string(),
  },
  {
    title: "create user",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHind: true,
  },
  async (params) => {
    try {
      // validate & coerce properly using z.object
      const parsed = z
        .object({
          name: z.string(),
          email: z.string(),
          address: z.string(),
          phone: z.string(),
        })
        .parse(params);

      const id = await createUser(parsed);
      return {
        content: [{ type: "text", text: `User ${id} created successfully` }],
      };
    } catch (err) {
      console.error("create-user failed:", err);
      const msg = err instanceof Error ? err.message : String(err);
      return { content: [{ type: "text", text: `Failed to save user: ${msg}` }] };
    }
  }
);


const createUser = async (user: {
  name: string;
  email: string;
  address: string;
  phone: string;
}) => {
  let users: Array<Record<string, any>> = [];
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    users = JSON.parse(raw);
    if (!Array.isArray(users)) users = [];
  } catch (err: any) {
    // If file doesn't exist, start with empty array. Any other error -> rethrow.
    if (err.code === "ENOENT") {
      users = [];
    } else {
      throw err;
    }
  }

  const id = users.length + 1;
  users.push({ id, ...user });

  // Ensure directory exists before writing
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });

  await fs.writeFile(DATA_FILE, JSON.stringify(users, null, 2), "utf8");

  return id;
};

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("MCP server connected (stdio transport).");
}

main().catch((e) => {
  console.error("Fatal error running server:", e);
  process.exit(1);
});
