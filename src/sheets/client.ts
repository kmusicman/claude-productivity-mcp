import { google, sheets_v4 } from "googleapis";
import { getAuthenticatedClient } from "./auth.js";

let sheetsClient: sheets_v4.Sheets | null = null;

async function getSheets(): Promise<sheets_v4.Sheets> {
  if (sheetsClient) return sheetsClient;
  const auth = await getAuthenticatedClient();
  sheetsClient = google.sheets({ version: "v4", auth });
  return sheetsClient;
}

// อ่านข้อมูลจาก range
export async function readSheet(spreadsheetId: string, range: string): Promise<string[][]> {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  return (res.data.values ?? []) as string[][];
}

// เขียนทับข้อมูลใน range
export async function writeSheet(spreadsheetId: string, range: string, values: string[][]): Promise<number> {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });
  return res.data.updatedCells ?? 0;
}

// เพิ่มแถวต่อท้าย
export async function appendSheet(spreadsheetId: string, range: string, values: string[][]): Promise<number> {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values },
  });
  return res.data.updates?.updatedCells ?? 0;
}

// ดูรายชื่อ sheets ใน spreadsheet
export async function listSheets(spreadsheetId: string): Promise<{ id: number; title: string }[]> {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.get({ spreadsheetId, fields: "sheets.properties" });
  return (res.data.sheets ?? []).map((s) => ({
    id: s.properties?.sheetId ?? 0,
    title: s.properties?.title ?? "",
  }));
}
