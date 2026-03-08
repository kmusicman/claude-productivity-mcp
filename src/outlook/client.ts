import { getAccessToken } from "./auth.js";
import type { OutlookEmailHeader, OutlookEmailFull } from "./types.js";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

async function graphRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();

  const res = await fetch(`${GRAPH_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Microsoft Graph API error ${res.status}: ${error}`);
  }

  const contentType = res.headers.get("content-type");
  if (!contentType?.includes("application/json")) return undefined as T;
  return res.json() as T;
}

export async function listEmails(options: {
  maxResults?: number;
  folder?: string;
  filter?: string;
}): Promise<OutlookEmailHeader[]> {
  const { maxResults = 20, folder = "inbox", filter = "isRead eq false" } =
    options;

  const params = new URLSearchParams({
    $top: String(maxResults),
    $select: "id,subject,from,receivedDateTime,bodyPreview,isRead",
    $orderby: "receivedDateTime desc",
  });

  if (filter) params.set("$filter", filter);

  const data = await graphRequest<{ value: GraphMessage[] }>(
    `/me/mailFolders/${folder}/messages?${params}`
  );

  return data.value.map((msg) => ({
    id: msg.id,
    subject: msg.subject ?? "(no subject)",
    from: msg.from?.emailAddress?.address ?? "",
    fromName: msg.from?.emailAddress?.name ?? "",
    date: msg.receivedDateTime,
    snippet: msg.bodyPreview ?? "",
    isRead: msg.isRead,
  }));
}

export async function getEmail(emailId: string): Promise<OutlookEmailFull> {
  const data = await graphRequest<GraphMessageFull>(
    `/me/messages/${emailId}?$select=id,subject,from,receivedDateTime,body,bodyPreview,isRead,categories`
  );

  return {
    id: data.id,
    subject: data.subject ?? "(no subject)",
    from: data.from?.emailAddress?.address ?? "",
    fromName: data.from?.emailAddress?.name ?? "",
    date: data.receivedDateTime,
    snippet: data.bodyPreview ?? "",
    body: data.body?.content ?? "",
    bodyType: data.body?.contentType === "html" ? "html" : "text",
    isRead: data.isRead,
    categories: data.categories ?? [],
  };
}

export async function markAsRead(emailId: string): Promise<void> {
  await graphRequest(`/me/messages/${emailId}`, {
    method: "PATCH",
    body: JSON.stringify({ isRead: true }),
  });
}

export async function sendEmail(options: {
  to: string[];
  subject: string;
  body: string;
  bodyType?: "Text" | "HTML";
  cc?: string[];
}): Promise<void> {
  const { to, subject, body, bodyType = "Text", cc = [] } = options;

  const message = {
    subject,
    body: { contentType: bodyType, content: body },
    toRecipients: to.map((address) => ({ emailAddress: { address } })),
    ...(cc.length > 0 && {
      ccRecipients: cc.map((address) => ({ emailAddress: { address } })),
    }),
  };

  await graphRequest("/me/sendMail", {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

// Microsoft Graph response types
interface GraphMessage {
  id: string;
  subject: string | null;
  from: { emailAddress: { name: string; address: string } } | null;
  receivedDateTime: string;
  bodyPreview: string | null;
  isRead: boolean;
}

interface GraphMessageFull extends GraphMessage {
  body: { contentType: string; content: string } | null;
  categories: string[];
}
