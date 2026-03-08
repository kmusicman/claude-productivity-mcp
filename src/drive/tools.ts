import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listFiles, searchFiles } from "./client.js";

const MIME_LABELS: Record<string, string> = {
  "application/vnd.google-apps.folder": "📁 Folder",
  "application/vnd.google-apps.spreadsheet": "📊 Sheets",
  "application/vnd.google-apps.document": "📄 Docs",
  "application/vnd.google-apps.presentation": "📑 Slides",
  "application/vnd.google-apps.form": "📋 Forms",
  "application/pdf": "📕 PDF",
  "image/jpeg": "🖼 Image",
  "image/png": "🖼 Image",
};

function formatFile(f: ReturnType<typeof Object.assign>, i: number) {
  const type = MIME_LABELS[f.mimeType] ?? f.mimeType;
  const size = f.size ? ` (${(parseInt(f.size) / 1024).toFixed(1)} KB)` : "";
  const modified = f.modifiedTime ? `\n    แก้ไขล่าสุด: ${new Date(f.modifiedTime).toLocaleString("th-TH")}` : "";
  const link = f.webViewLink ? `\n    ลิงก์: ${f.webViewLink}` : "";
  return `[${i + 1}] ${f.name}${size}\n    ID: ${f.id}\n    ประเภท: ${type}${modified}${link}`;
}

export function registerDriveTools(server: McpServer) {
  // Tool 1: list files
  server.registerTool(
    "drive_list_files",
    {
      description: "ดูรายการไฟล์ใน Google Drive (ล่าสุดก่อน)",
      inputSchema: {
        folderId: z.string().optional().describe("Folder ID (ถ้าไม่ระบุ = ดูทุกไฟล์)"),
        maxResults: z.number().min(1).max(100).default(20).describe("จำนวนไฟล์สูงสุด"),
        mimeType: z.string().optional().describe("กรองตาม MIME type เช่น 'application/vnd.google-apps.spreadsheet'"),
      },
    },
    async ({ folderId, maxResults, mimeType }) => {
      const files = await listFiles({ folderId, maxResults, mimeType });
      if (files.length === 0) return { content: [{ type: "text", text: "ไม่พบไฟล์" }] };
      const text = files.map((f, i) => formatFile(f, i)).join("\n\n");
      return { content: [{ type: "text", text }] };
    }
  );

  // Tool 2: search files
  server.registerTool(
    "drive_search",
    {
      description: "ค้นหาไฟล์ใน Google Drive ด้วยชื่อ",
      inputSchema: {
        query: z.string().describe("คำค้นหาชื่อไฟล์"),
        maxResults: z.number().min(1).max(100).default(20).describe("จำนวนผลลัพธ์สูงสุด"),
        mimeType: z.string().optional().describe("กรองตาม MIME type (optional)"),
      },
    },
    async ({ query, maxResults, mimeType }) => {
      const files = await searchFiles({ query, maxResults, mimeType });
      if (files.length === 0) return { content: [{ type: "text", text: `ไม่พบไฟล์ที่ชื่อมี "${query}"` }] };
      const text = files.map((f, i) => formatFile(f, i)).join("\n\n");
      return { content: [{ type: "text", text }] };
    }
  );
}
