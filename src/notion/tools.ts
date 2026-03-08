import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  listTimesheet,
  addTimesheetEntry,
  updateTimesheetEntry,
} from "./client.js";
import { exportTimesheetToExcel } from "./excel.js";

const NOTION_TYPE_OPTIONS = [
  "Meeting",
  "Communication",
  "Support",
  "Prepare Data/Document/Presentation",
  "Research/POC/Training",
  "Evaluation/Feedback/Coaching/Management",
  "Project (Pre-Dev)",
  "Project",
  "RFC/Issue",
  "Leave",
] as const;

export function registerNotionTools(server: McpServer) {
  // ---- notion_list_timesheet ----
  server.registerTool(
    "notion_list_timesheet",
    {
      description:
        "List timesheet entries from Notion My Time Sheet. Can filter by date range.",
      inputSchema: {
        limit: z
          .number()
          .optional()
          .describe("Max entries to return (default 20)"),
        dateFrom: z
          .string()
          .optional()
          .describe("Filter from date YYYY-MM-DD (inclusive)"),
        dateTo: z
          .string()
          .optional()
          .describe("Filter to date YYYY-MM-DD (inclusive)"),
      },
    },
    async ({ limit, dateFrom, dateTo }) => {
      const entries = await listTimesheet({ limit, dateFrom, dateTo });
      const text = entries
        .map(
          (e) =>
            `[${e.id}] ${e.date} ${e.startTime}-${e.endTime}` +
            (e.durationHour != null ? ` (${e.durationHour}h)` : "") +
            ` | ${e.type ?? "-"} | ${e.task}` +
            (e.note ? `\n  Note: ${e.note}` : "")
        )
        .join("\n");
      return {
        content: [
          {
            type: "text",
            text: entries.length
              ? `พบ ${entries.length} รายการ:\n\n${text}`
              : "ไม่พบรายการในช่วงเวลาที่ระบุ",
          },
        ],
      };
    }
  );

  // ---- notion_add_timesheet ----
  server.registerTool(
    "notion_add_timesheet",
    {
      description:
        "Add a new work entry to Notion My Time Sheet. Duration is calculated automatically if not provided.",
      inputSchema: {
        task: z.string().describe("Task name / description"),
        date: z.string().describe("Date in YYYY-MM-DD format"),
        startTime: z.string().describe("Start time HH:MM (e.g. 09:00)"),
        endTime: z.string().describe("End time HH:MM (e.g. 12:00)"),
        type: z
          .enum(NOTION_TYPE_OPTIONS)
          .describe(
            "Work type: Meeting, Communication, Support, Prepare Data/Document/Presentation, Research/POC/Training, Evaluation/Feedback/Coaching/Management, Project (Pre-Dev), Project, RFC/Issue, Leave"
          ),
        durationHour: z
          .number()
          .optional()
          .describe("Duration in hours (auto-calculated from start/end if omitted)"),
        note: z.string().optional().describe("Additional note"),
      },
    },
    async ({ task, date, startTime, endTime, type, durationHour, note }) => {
      let duration = durationHour;
      if (duration === undefined) {
        const [sh, sm] = startTime.split(":").map(Number);
        const [eh, em] = endTime.split(":").map(Number);
        duration =
          Math.round(((eh * 60 + em - (sh * 60 + sm)) / 60) * 100) / 100;
      }

      const entry = await addTimesheetEntry({
        task,
        date,
        startTime,
        endTime,
        durationHour: duration,
        type,
        note,
      });

      return {
        content: [
          {
            type: "text",
            text:
              `✅ เพิ่ม timesheet สำเร็จ\n` +
              `ID: ${entry.id}\n` +
              `Task: ${entry.task}\n` +
              `Date: ${entry.date} ${entry.startTime}-${entry.endTime} (${entry.durationHour}h)\n` +
              `Type: ${entry.type}` +
              (entry.note ? `\nNote: ${entry.note}` : ""),
          },
        ],
      };
    }
  );

  // ---- notion_export_excel ----
  server.registerTool(
    "notion_export_excel",
    {
      description:
        "Export timesheet จาก Notion เป็นไฟล์ Excel (.xlsx) บันทึกลงเครื่อง",
      inputSchema: {
        dateFrom: z
          .string()
          .optional()
          .describe("Export ตั้งแต่วันที่ YYYY-MM-DD"),
        dateTo: z
          .string()
          .optional()
          .describe("Export ถึงวันที่ YYYY-MM-DD"),
        outputPath: z
          .string()
          .optional()
          .describe(
            "Path ของไฟล์ที่ต้องการบันทึก เช่น ~/Desktop/report.xlsx (default: ~/Desktop/timesheet-YYYY-MM-DD.xlsx)"
          ),
      },
    },
    async ({ dateFrom, dateTo, outputPath }) => {
      const entries = await listTimesheet({ limit: 1000, dateFrom, dateTo });

      if (entries.length === 0) {
        return {
          content: [{ type: "text", text: "ไม่พบรายการในช่วงเวลาที่ระบุ" }],
        };
      }

      const result = exportTimesheetToExcel(entries, outputPath);

      const rangeText =
        dateFrom || dateTo
          ? ` (${dateFrom ?? "ต้น"} ถึง ${dateTo ?? "ปัจจุบัน"})`
          : "";

      return {
        content: [
          {
            type: "text",
            text:
              `✅ Export Excel สำเร็จ${rangeText}\n` +
              `ไฟล์: ${result.filepath}\n` +
              `จำนวน: ${result.rowCount} รายการ\n` +
              `ขนาด: ${result.fileSize}`,
          },
        ],
      };
    }
  );

  // ---- notion_update_timesheet ----
  server.registerTool(
    "notion_update_timesheet",
    {
      description: "Update an existing timesheet entry in Notion by page ID.",
      inputSchema: {
        pageId: z.string().describe("Notion page ID of the timesheet entry"),
        task: z.string().optional().describe("New task name"),
        date: z.string().optional().describe("New date YYYY-MM-DD"),
        startTime: z.string().optional().describe("New start time HH:MM"),
        endTime: z.string().optional().describe("New end time HH:MM"),
        type: z.enum(NOTION_TYPE_OPTIONS).optional().describe("New work type"),
        durationHour: z
          .number()
          .optional()
          .describe("New duration in hours"),
        note: z.string().optional().describe("New note"),
      },
    },
    async ({ pageId, ...updates }) => {
      const entry = await updateTimesheetEntry(pageId, updates);
      return {
        content: [
          {
            type: "text",
            text:
              `✅ อัปเดต timesheet สำเร็จ\n` +
              `Task: ${entry.task}\n` +
              `Date: ${entry.date} ${entry.startTime}-${entry.endTime}\n` +
              `Type: ${entry.type}`,
          },
        ],
      };
    }
  );
}
