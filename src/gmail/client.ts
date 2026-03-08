import { google, gmail_v1 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { getAuthenticatedClient } from "./auth.js";
import type { EmailHeader, EmailFull } from "./types.js";

let gmailClient: gmail_v1.Gmail | null = null;

async function getGmail(): Promise<gmail_v1.Gmail> {
  if (gmailClient) return gmailClient;
  const auth = await getAuthenticatedClient();
  gmailClient = google.gmail({ version: "v1", auth });
  return gmailClient;
}

function parseHeaders(
  headers: gmail_v1.Schema$MessagePartHeader[]
): Record<string, string> {
  return headers.reduce(
    (acc, h) => {
      if (h.name && h.value) acc[h.name.toLowerCase()] = h.value;
      return acc;
    },
    {} as Record<string, string>
  );
}

function decodeBody(part: gmail_v1.Schema$MessagePart): string {
  if (part.mimeType === "text/plain" && part.body?.data) {
    return Buffer.from(part.body.data, "base64").toString("utf-8");
  }
  if (part.parts) {
    for (const p of part.parts) {
      const text = decodeBody(p);
      if (text) return text;
    }
  }
  return "";
}

// ดึงรายการ emails (headers only — เร็ว)
export async function listEmails(options: {
  maxResults?: number;
  query?: string; // Gmail search syntax เช่น "is:unread after:2024/01/01"
}): Promise<EmailHeader[]> {
  const gmail = await getGmail();
  const { maxResults = 20, query = "is:unread" } = options;

  const listRes = await gmail.users.messages.list({
    userId: "me",
    maxResults,
    q: query,
  });

  const messages = listRes.data.messages ?? [];
  if (messages.length === 0) return [];

  // ดึง header แต่ละ email แบบ parallel
  const headers = await Promise.all(
    messages.map(async (msg) => {
      const res = await gmail.users.messages.get({
        userId: "me",
        id: msg.id!,
        format: "metadata",
        metadataHeaders: ["Subject", "From", "Date"],
      });

      const h = parseHeaders(res.data.payload?.headers ?? []);
      return {
        id: msg.id!,
        threadId: msg.threadId!,
        subject: h["subject"] ?? "(no subject)",
        from: h["from"] ?? "",
        date: h["date"] ?? "",
        snippet: res.data.snippet ?? "",
      } satisfies EmailHeader;
    })
  );

  return headers;
}

// อ่าน email เต็ม รวม body
export async function getEmail(emailId: string): Promise<EmailFull> {
  const gmail = await getGmail();

  const res = await gmail.users.messages.get({
    userId: "me",
    id: emailId,
    format: "full",
  });

  const msg = res.data;
  const h = parseHeaders(msg.payload?.headers ?? []);
  const body = msg.payload ? decodeBody(msg.payload) : "";

  return {
    id: msg.id!,
    threadId: msg.threadId!,
    subject: h["subject"] ?? "(no subject)",
    from: h["from"] ?? "",
    date: h["date"] ?? "",
    snippet: msg.snippet ?? "",
    body,
    labels: msg.labelIds ?? [],
  };
}

// mark email as read
export async function markAsRead(emailId: string): Promise<void> {
  const gmail = await getGmail();
  await gmail.users.messages.modify({
    userId: "me",
    id: emailId,
    requestBody: { removeLabelIds: ["UNREAD"] },
  });
}

// ส่ง email ใหม่
export async function sendEmail(options: {
  to: string;
  subject: string;
  body: string;
  cc?: string;
}): Promise<string> {
  const gmail = await getGmail();
  const { to, subject, body, cc } = options;

  const lines = [
    `To: ${to}`,
    cc ? `Cc: ${cc}` : null,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset=utf-8`,
    ``,
    body,
  ].filter((l) => l !== null).join("\n");

  const encoded = Buffer.from(lines).toString("base64url");
  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: encoded },
  });

  return res.data.id!;
}

// ตอบ email (reply)
export async function replyEmail(options: {
  emailId: string;
  body: string;
}): Promise<string> {
  const gmail = await getGmail();
  const { emailId, body } = options;

  // ดึงข้อมูล email ต้นฉบับ
  const orig = await gmail.users.messages.get({
    userId: "me",
    id: emailId,
    format: "metadata",
    metadataHeaders: ["Subject", "From", "Message-ID", "References"],
  });

  const h = parseHeaders(orig.data.payload?.headers ?? []);
  const to = h["from"];
  const subject = h["subject"]?.startsWith("Re:") ? h["subject"] : `Re: ${h["subject"]}`;
  const messageId = h["message-id"];
  const references = [h["references"], messageId].filter(Boolean).join(" ");

  const lines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    messageId ? `In-Reply-To: ${messageId}` : null,
    references ? `References: ${references}` : null,
    `Content-Type: text/plain; charset=utf-8`,
    ``,
    body,
  ].filter((l) => l !== null).join("\n");

  const encoded = Buffer.from(lines).toString("base64url");
  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encoded,
      threadId: orig.data.threadId!,
    },
  });

  return res.data.id!;
}
