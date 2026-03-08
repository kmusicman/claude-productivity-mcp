import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listEmails, getEmail, markAsRead, sendEmail } from "./client.js";

export function registerOutlookTools(server: McpServer) {
  // Tool 1: list emails
  server.registerTool(
    "outlook_list_emails",
    {
      description: "ดึงรายการ emails จาก Microsoft 365 Outlook",
      inputSchema: {
        maxResults: z
          .number()
          .min(1)
          .max(100)
          .default(20)
          .describe("จำนวน email สูงสุด"),
        folder: z
          .string()
          .default("inbox")
          .describe("โฟลเดอร์: inbox, sentItems, drafts, archive"),
        filter: z
          .string()
          .default("isRead eq false")
          .describe(
            "OData filter เช่น 'isRead eq false' หรือ 'receivedDateTime ge 2024-01-01T00:00:00Z'"
          ),
      },
    },
    async ({ maxResults, folder, filter }) => {
      const emails = await listEmails({ maxResults, folder, filter });

      if (emails.length === 0) {
        return {
          content: [{ type: "text", text: "ไม่พบ email ที่ตรงกับเงื่อนไข" }],
        };
      }

      const text = emails
        .map(
          (e, i) =>
            `[${i + 1}] ID: ${e.id}\nจาก: ${e.fromName} <${e.from}>\nหัวเรื่อง: ${e.subject}\nวันที่: ${e.date}\nสถานะ: ${e.isRead ? "อ่านแล้ว" : "ยังไม่อ่าน"}\nสรุป: ${e.snippet}\n`
        )
        .join("\n---\n");

      return { content: [{ type: "text", text }] };
    }
  );

  // Tool 2: get full email
  server.registerTool(
    "outlook_get_email",
    {
      description: "อ่าน email เต็มรวม body จาก Outlook",
      inputSchema: {
        emailId: z.string().describe("Email ID จาก outlook_list_emails"),
      },
    },
    async ({ emailId }) => {
      const email = await getEmail(emailId);

      const text = [
        `ID: ${email.id}`,
        `จาก: ${email.fromName} <${email.from}>`,
        `หัวเรื่อง: ${email.subject}`,
        `วันที่: ${email.date}`,
        `สถานะ: ${email.isRead ? "อ่านแล้ว" : "ยังไม่อ่าน"}`,
        `หมวดหมู่: ${email.categories.join(", ") || "-"}`,
        `\n--- เนื้อหา (${email.bodyType}) ---\n`,
        email.body || "(ไม่มีเนื้อหา)",
      ].join("\n");

      return { content: [{ type: "text", text }] };
    }
  );

  // Tool 3: mark as read
  server.registerTool(
    "outlook_mark_as_read",
    {
      description: "Mark email ว่าอ่านแล้วใน Outlook",
      inputSchema: {
        emailId: z.string().describe("Email ID ที่ต้องการ mark as read"),
      },
    },
    async ({ emailId }) => {
      await markAsRead(emailId);
      return {
        content: [{ type: "text", text: `Mark as read สำเร็จ: ${emailId}` }],
      };
    }
  );

  // Tool 4: send email
  server.registerTool(
    "outlook_send_email",
    {
      description: "ส่ง email ผ่าน Microsoft 365 Outlook",
      inputSchema: {
        to: z
          .array(z.string())
          .describe("รายการ email ผู้รับ เช่น ['a@company.com', 'b@company.com']"),
        subject: z.string().describe("หัวเรื่อง email"),
        body: z.string().describe("เนื้อหา email"),
        bodyType: z
          .enum(["Text", "HTML"])
          .default("Text")
          .describe("รูปแบบ body: Text หรือ HTML"),
        cc: z
          .array(z.string())
          .default([])
          .describe("รายการ email CC (ถ้ามี)"),
      },
    },
    async ({ to, subject, body, bodyType, cc }) => {
      await sendEmail({ to, subject, body, bodyType, cc });
      const toList = to.join(", ");
      return {
        content: [{ type: "text", text: `ส่ง email สำเร็จ\nถึง: ${toList}\nหัวเรื่อง: ${subject}` }],
      };
    }
  );
}
