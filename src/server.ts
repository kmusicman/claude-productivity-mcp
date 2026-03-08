import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";

import { registerGmailTools } from "./gmail/tools.js";
import { registerNotionTools } from "./notion/tools.js";
import { registerOutlookTools } from "./outlook/tools.js";
import { registerCalendarTools } from "./calendar/tools.js";
import { registerDriveTools } from "./drive/tools.js";
import { registerSheetsTools } from "./sheets/tools.js";

// โหลด .env แบบ manual (ไม่ต้องติดตั้ง dotenv)
function loadEnv() {
  const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
  const envPath = resolve(root, ".env");
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (key && !(key in process.env)) {
      const value = rest.join("=").split("#")[0].trim(); // strip inline comment
      process.env[key.trim()] = value;
    }
  }
}

function isEnabled(key: string): boolean {
  return process.env[key]?.toLowerCase() === "true";
}

export function createServer() {
  loadEnv();

  const server = new McpServer({
    name: "productivity-mcp",
    version: "1.0.0",
  });

  // Google services (ใช้ toggle เดียว ENABLE_GOOGLE ควบคุมทั้งหมด)
  if (isEnabled("ENABLE_GOOGLE")) {
    registerGmailTools(server);    console.error("[MCP] Gmail enabled");
    registerCalendarTools(server); console.error("[MCP] Calendar enabled");
    registerDriveTools(server);    console.error("[MCP] Drive enabled");
    registerSheetsTools(server);   console.error("[MCP] Sheets enabled");
  }

  if (isEnabled("ENABLE_NOTION"))  { registerNotionTools(server);  console.error("[MCP] Notion enabled"); }
  if (isEnabled("ENABLE_OUTLOOK")) { registerOutlookTools(server); console.error("[MCP] Outlook enabled"); }

  return {
    run: async () => {
      const transport = new StdioServerTransport();
      await server.connect(transport);
      console.error("productivity-mcp running on stdio");
    },
  };
}
