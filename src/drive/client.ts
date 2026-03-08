import { google, drive_v3 } from "googleapis";
import { getAuthenticatedClient } from "./auth.js";

let driveClient: drive_v3.Drive | null = null;

async function getDrive(): Promise<drive_v3.Drive> {
  if (driveClient) return driveClient;
  const auth = await getAuthenticatedClient();
  driveClient = google.drive({ version: "v3", auth });
  return driveClient;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
}

function mapFile(f: drive_v3.Schema$File): DriveFile {
  return {
    id: f.id!,
    name: f.name ?? "(ไม่มีชื่อ)",
    mimeType: f.mimeType ?? "",
    size: f.size ?? undefined,
    modifiedTime: f.modifiedTime ?? undefined,
    webViewLink: f.webViewLink ?? undefined,
  };
}

const FIELDS = "files(id,name,mimeType,size,modifiedTime,webViewLink)";

// ดูรายการไฟล์ใน folder
export async function listFiles(options: {
  folderId?: string;
  maxResults?: number;
  mimeType?: string;
}): Promise<DriveFile[]> {
  const drive = await getDrive();
  const { folderId, maxResults = 20, mimeType } = options;

  const conditions: string[] = ["trashed = false"];
  if (folderId) conditions.push(`'${folderId}' in parents`);
  if (mimeType) conditions.push(`mimeType = '${mimeType}'`);

  const res = await drive.files.list({
    q: conditions.join(" and "),
    pageSize: maxResults,
    fields: FIELDS,
    orderBy: "modifiedTime desc",
  });

  return (res.data.files ?? []).map(mapFile);
}

// ค้นหาไฟล์
export async function searchFiles(options: {
  query: string;
  maxResults?: number;
  mimeType?: string;
}): Promise<DriveFile[]> {
  const drive = await getDrive();
  const { query, maxResults = 20, mimeType } = options;

  const conditions: string[] = [
    `name contains '${query.replace(/'/g, "\\'")}'`,
    "trashed = false",
  ];
  if (mimeType) conditions.push(`mimeType = '${mimeType}'`);

  const res = await drive.files.list({
    q: conditions.join(" and "),
    pageSize: maxResults,
    fields: FIELDS,
    orderBy: "modifiedTime desc",
  });

  return (res.data.files ?? []).map(mapFile);
}
