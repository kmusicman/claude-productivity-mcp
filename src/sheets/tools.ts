import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readSheet, writeSheet, appendSheet, listSheets } from "./client.js";

export function registerSheetsTools(server: McpServer) {
  // Tool 1: list sheets
  server.registerTool(
    "sheets_list_sheets",
    {
      description: "ดูรายชื่อ sheets ทั้งหมดใน Google Spreadsheet",
      inputSchema: {
        spreadsheetId: z.string().describe("Spreadsheet ID (จาก URL: /spreadsheets/d/<ID>/edit)"),
      },
    },
    async ({ spreadsheetId }) => {
      const sheets = await listSheets(spreadsheetId);
      const text = sheets.map((s, i) => `[${i + 1}] ${s.title} (id: ${s.id})`).join("\n");
      return { content: [{ type: "text", text }] };
    }
  );

  // Tool 2: read sheet
  server.registerTool(
    "sheets_read",
    {
      description: "อ่านข้อมูลจาก Google Sheets",
      inputSchema: {
        spreadsheetId: z.string().describe("Spreadsheet ID"),
        range: z.string().describe("Range เช่น 'Sheet1!A1:D10' หรือ 'Sheet1'"),
      },
    },
    async ({ spreadsheetId, range }) => {
      const rows = await readSheet(spreadsheetId, range);
      if (rows.length === 0) return { content: [{ type: "text", text: "ไม่พบข้อมูลใน range ที่ระบุ" }] };

      const text = rows.map((row, i) => `[${i + 1}] ${row.join(" | ")}`).join("\n");
      return { content: [{ type: "text", text: `${range} (${rows.length} แถว)\n\n${text}` }] };
    }
  );

  // Tool 3: write sheet
  server.registerTool(
    "sheets_write",
    {
      description: "เขียน/อัปเดตข้อมูลใน Google Sheets (เขียนทับ range ที่ระบุ)",
      inputSchema: {
        spreadsheetId: z.string().describe("Spreadsheet ID"),
        range: z.string().describe("Range เช่น 'Sheet1!A1'"),
        values: z.array(z.array(z.string())).describe("ข้อมูล 2D array เช่น [['A','B'],['C','D']]"),
      },
    },
    async ({ spreadsheetId, range, values }) => {
      const updated = await writeSheet(spreadsheetId, range, values);
      return { content: [{ type: "text", text: `อัปเดตสำเร็จ! ${updated} cells ถูกเขียน` }] };
    }
  );

  // Tool 4: append sheet
  server.registerTool(
    "sheets_append",
    {
      description: "เพิ่มแถวใหม่ต่อท้ายข้อมูลใน Google Sheets",
      inputSchema: {
        spreadsheetId: z.string().describe("Spreadsheet ID"),
        range: z.string().describe("Sheet name เช่น 'Sheet1'"),
        values: z.array(z.array(z.string())).describe("แถวที่ต้องการเพิ่ม เช่น [['วันที่','ค่าใช้จ่าย','หมายเหตุ']]"),
      },
    },
    async ({ spreadsheetId, range, values }) => {
      const updated = await appendSheet(spreadsheetId, range, values);
      return { content: [{ type: "text", text: `เพิ่มข้อมูลสำเร็จ! ${updated} cells ถูกเพิ่ม` }] };
    }
  );
}
