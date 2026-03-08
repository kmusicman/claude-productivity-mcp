import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listCalendars, listEvents, createEvent, updateEvent, cancelEvent } from "./client.js";

export function registerCalendarTools(server: McpServer) {
  // Tool 1: list calendars
  server.registerTool(
    "calendar_list_calendars",
    {
      description: "ดูรายการ calendars ทั้งหมดในบัญชี Google (Work, Personal, etc.)",
      inputSchema: {},
    },
    async () => {
      const calendars = await listCalendars();
      const text = calendars
        .map(
          (c, i) =>
            `[${i + 1}] ${c.primary ? "★ " : ""}${c.summary}\n    ID: ${c.id}\n    Role: ${c.accessRole}`
        )
        .join("\n\n");
      return { content: [{ type: "text", text }] };
    }
  );

  // Tool 2: list events
  server.registerTool(
    "calendar_list_events",
    {
      description: "ดูรายการ events ใน Google Calendar",
      inputSchema: {
        calendarId: z.string().default("primary").describe("Calendar ID (default: primary)"),
        timeMin: z.string().optional().describe("เริ่มต้น ISO 8601 เช่น '2025-03-01T00:00:00+07:00'"),
        timeMax: z.string().optional().describe("สิ้นสุด ISO 8601 เช่น '2025-03-31T23:59:59+07:00'"),
        maxResults: z.number().min(1).max(100).default(20).describe("จำนวน events สูงสุด"),
        query: z.string().optional().describe("คำค้นหาใน event"),
      },
    },
    async ({ calendarId, timeMin, timeMax, maxResults, query }) => {
      const events = await listEvents({ calendarId, timeMin, timeMax, maxResults, query });

      if (events.length === 0) {
        return { content: [{ type: "text", text: "ไม่พบ events ในช่วงเวลาที่กำหนด" }] };
      }

      const text = events
        .map(
          (e, i) =>
            `[${i + 1}] ID: ${e.id}\nหัวเรื่อง: ${e.summary}\nเริ่ม: ${e.start}\nสิ้นสุด: ${e.end}${e.location ? `\nสถานที่: ${e.location}` : ""}${e.description ? `\nรายละเอียด: ${e.description}` : ""}\nสถานะ: ${e.status}`
        )
        .join("\n\n---\n\n");

      return { content: [{ type: "text", text }] };
    }
  );

  // Tool 2: create event
  server.registerTool(
    "calendar_create_event",
    {
      description: "สร้าง event ใหม่ใน Google Calendar",
      inputSchema: {
        summary: z.string().describe("หัวเรื่อง event"),
        start: z.string().describe("วันเวลาเริ่มต้น ISO 8601 เช่น '2025-03-10T09:00:00+07:00'"),
        end: z.string().describe("วันเวลาสิ้นสุด ISO 8601 เช่น '2025-03-10T10:00:00+07:00'"),
        description: z.string().optional().describe("รายละเอียด event"),
        location: z.string().optional().describe("สถานที่"),
        calendarId: z.string().default("primary").describe("Calendar ID (default: primary)"),
      },
    },
    async ({ summary, start, end, description, location, calendarId }) => {
      const event = await createEvent({ summary, start, end, description, location, calendarId });

      const text = [
        "สร้าง event สำเร็จ!",
        `ID: ${event.id}`,
        `หัวเรื่อง: ${event.summary}`,
        `เริ่ม: ${event.start}`,
        `สิ้นสุด: ${event.end}`,
        event.location ? `สถานที่: ${event.location}` : "",
        event.htmlLink ? `ลิงก์: ${event.htmlLink}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      return { content: [{ type: "text", text }] };
    }
  );

  // Tool 3: update event
  server.registerTool(
    "calendar_update_event",
    {
      description: "แก้ไข event ใน Google Calendar ด้วย Event ID",
      inputSchema: {
        eventId: z.string().describe("Event ID จาก calendar_list_events"),
        calendarId: z.string().default("primary").describe("Calendar ID (default: primary)"),
        summary: z.string().optional().describe("หัวเรื่องใหม่"),
        start: z.string().optional().describe("วันเวลาเริ่มต้นใหม่ ISO 8601"),
        end: z.string().optional().describe("วันเวลาสิ้นสุดใหม่ ISO 8601"),
        description: z.string().optional().describe("รายละเอียดใหม่"),
        location: z.string().optional().describe("สถานที่ใหม่"),
      },
    },
    async ({ eventId, calendarId, summary, start, end, description, location }) => {
      const event = await updateEvent({ eventId, calendarId, summary, start, end, description, location });

      const text = [
        "อัปเดต event สำเร็จ!",
        `ID: ${event.id}`,
        `หัวเรื่อง: ${event.summary}`,
        `เริ่ม: ${event.start}`,
        `สิ้นสุด: ${event.end}`,
        event.location ? `สถานที่: ${event.location}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      return { content: [{ type: "text", text }] };
    }
  );

  // Tool 4: cancel event (safe delete ด้วย patch status=cancelled)
  server.registerTool(
    "calendar_cancel_event",
    {
      description: "ยกเลิก event ใน Google Calendar (ใช้ patch status=cancelled แทนการลบถาวร)",
      inputSchema: {
        eventId: z.string().describe("Event ID จาก calendar_list_events"),
        calendarId: z.string().default("primary").describe("Calendar ID (default: primary)"),
      },
    },
    async ({ eventId, calendarId }) => {
      const event = await cancelEvent(eventId, calendarId);

      const text = [
        "ยกเลิก event สำเร็จ! (status = cancelled)",
        `ID: ${event.id}`,
        `หัวเรื่อง: ${event.summary}`,
        "หมายเหตุ: event ยังอยู่ใน Calendar แต่ถูก mark ว่า cancelled แล้ว",
      ].join("\n");

      return { content: [{ type: "text", text }] };
    }
  );
}
