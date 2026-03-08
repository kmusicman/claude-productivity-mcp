import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listEmails, getEmail, markAsRead, sendEmail, replyEmail } from "./client.js";

export function registerGmailTools(server: McpServer) {
  // Tool 1: list emails
  server.registerTool(
    "gmail_list_emails",
    {
      description: "ดึงรายการ emails จาก Gmail",
      inputSchema: {
        maxResults: z.number().min(1).max(100).default(20).describe("จำนวน email สูงสุด"),
        query: z.string().default("is:unread").describe("Gmail search query เช่น 'is:unread' หรือ 'after:2024/01/01'"),
      },
    },
    async ({ maxResults, query }) => {
      const emails = await listEmails({ maxResults, query });

      if (emails.length === 0) {
        return { content: [{ type: "text", text: "ไม่พบ email ที่ตรงกับ query" }] };
      }

      const text = emails
        .map(
          (e, i) =>
            `[${i + 1}] ID: ${e.id}\nจาก: ${e.from}\nหัวเรื่อง: ${e.subject}\nวันที่: ${e.date}\nสรุป: ${e.snippet}\n`
        )
        .join("\n---\n");

      return { content: [{ type: "text", text }] };
    }
  );

  // Tool 2: get full email
  server.registerTool(
    "gmail_get_email",
    {
      description: "อ่าน email เต็มรวม body",
      inputSchema: {
        emailId: z.string().describe("Email ID จาก gmail_list_emails"),
      },
    },
    async ({ emailId }) => {
      const email = await getEmail(emailId);

      const text = [
        `ID: ${email.id}`,
        `จาก: ${email.from}`,
        `หัวเรื่อง: ${email.subject}`,
        `วันที่: ${email.date}`,
        `Labels: ${email.labels.join(", ")}`,
        `\n--- เนื้อหา ---\n`,
        email.body || "(ไม่มีเนื้อหา plain text)",
      ].join("\n");

      return { content: [{ type: "text", text }] };
    }
  );

  // Tool 3: mark as read
  server.registerTool(
    "gmail_mark_as_read",
    {
      description: "Mark email ว่าอ่านแล้ว",
      inputSchema: {
        emailId: z.string().describe("Email ID ที่ต้องการ mark as read"),
      },
    },
    async ({ emailId }) => {
      await markAsRead(emailId);
      return { content: [{ type: "text", text: `Mark as read สำเร็จ: ${emailId}` }] };
    }
  );

  // Tool 4: send email
  server.registerTool(
    "gmail_send_email",
    {
      description: "ส่ง email ใหม่ผ่าน Gmail",
      inputSchema: {
        to: z.string().describe("อีเมลผู้รับ เช่น 'someone@example.com'"),
        subject: z.string().describe("หัวเรื่อง email"),
        body: z.string().describe("เนื้อหา email"),
        cc: z.string().optional().describe("CC (optional)"),
      },
    },
    async ({ to, subject, body, cc }) => {
      const id = await sendEmail({ to, subject, body, cc });
      return { content: [{ type: "text", text: `ส่ง email สำเร็จ! Message ID: ${id}` }] };
    }
  );

  // Tool 5: reply email
  server.registerTool(
    "gmail_reply_email",
    {
      description: "ตอบ email โดยใช้ Email ID (จะ reply ใน thread เดิม)",
      inputSchema: {
        emailId: z.string().describe("Email ID ที่ต้องการตอบ จาก gmail_list_emails"),
        body: z.string().describe("เนื้อหาที่ต้องการตอบ"),
      },
    },
    async ({ emailId, body }) => {
      const id = await replyEmail({ emailId, body });
      return { content: [{ type: "text", text: `Reply สำเร็จ! Message ID: ${id}` }] };
    }
  );
}
