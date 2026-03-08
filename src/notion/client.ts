import pkg from "@notionhq/client";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { TimesheetEntry } from "./types.js";

const { Client } = pkg;

const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../"
);

function loadConfig() {
  const raw = readFileSync(
    path.join(PROJECT_ROOT, "credentials/notion.json"),
    "utf-8"
  );
  return JSON.parse(raw) as {
    apiKey: string;
    databaseId: string;
    timesheetDataSourceId: string;
  };
}

function getClient() {
  const { apiKey } = loadConfig();
  return new Client({ auth: apiKey });
}

function getDatabaseId() {
  return loadConfig().databaseId;
}

function getDataSourceId() {
  return loadConfig().timesheetDataSourceId;
}

// ---- helpers ----

function toText(prop: any): string {
  return prop?.rich_text?.[0]?.plain_text ?? "";
}

function toTitle(prop: any): string {
  return prop?.title?.[0]?.plain_text ?? "";
}

function toSelect(prop: any): string | null {
  return prop?.select?.name ?? null;
}

function toDate(prop: any): string {
  return prop?.date?.start ?? "";
}

function toNumber(prop: any): number | null {
  return prop?.number ?? null;
}

function pageToEntry(page: any): TimesheetEntry {
  const p = page.properties;
  return {
    id: page.id,
    task: toTitle(p["Task"]),
    date: toDate(p["Date"]),
    startTime: toText(p["Start Time"]),
    endTime: toText(p["End Time"]),
    durationHour: toNumber(p["Duration (Hour)"]),
    type: toSelect(p["Type"]),
    note: toText(p["Note"]),
  };
}

// ---- public API ----

export async function listTimesheet(opts: {
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
}): Promise<TimesheetEntry[]> {
  const client = getClient();
  const filter: any[] = [];

  if (opts.dateFrom) {
    filter.push({ property: "Date", date: { on_or_after: opts.dateFrom } });
  }
  if (opts.dateTo) {
    filter.push({ property: "Date", date: { on_or_before: opts.dateTo } });
  }

  const res = await (client as any).dataSources.query({
    data_source_id: getDataSourceId(),
    page_size: opts.limit ?? 20,
    sorts: [{ property: "Date", direction: "descending" }],
    ...(filter.length > 0
      ? { filter: filter.length === 1 ? filter[0] : { and: filter } }
      : {}),
  });

  return (res as any).results.map(pageToEntry);
}

export async function addTimesheetEntry(entry: {
  task: string;
  date: string;
  startTime: string;
  endTime: string;
  durationHour?: number;
  type: string;
  note?: string;
}): Promise<TimesheetEntry> {
  const client = getClient();
  const properties: any = {
    Task: { title: [{ text: { content: entry.task } }] },
    Date: { date: { start: entry.date } },
    "Start Time": { rich_text: [{ text: { content: entry.startTime } }] },
    "End Time": { rich_text: [{ text: { content: entry.endTime } }] },
    Type: { select: { name: entry.type } },
  };

  if (entry.durationHour !== undefined) {
    properties["Duration (Hour)"] = { number: entry.durationHour };
  }
  if (entry.note) {
    properties["Note"] = { rich_text: [{ text: { content: entry.note } }] };
  }

  const page = await client.pages.create({
    parent: { database_id: getDatabaseId() },
    properties,
  } as any);

  // Notion create response may not populate all fields — build from inputs
  return {
    id: (page as any).id,
    task: entry.task,
    date: entry.date,
    startTime: entry.startTime,
    endTime: entry.endTime,
    durationHour: entry.durationHour ?? null,
    type: entry.type,
    note: entry.note ?? "",
  };
}

export async function updateTimesheetEntry(
  pageId: string,
  updates: Partial<{
    task: string;
    date: string;
    startTime: string;
    endTime: string;
    durationHour: number;
    type: string;
    note: string;
  }>
): Promise<TimesheetEntry> {
  const client = getClient();
  const properties: any = {};

  if (updates.task)
    properties["Task"] = { title: [{ text: { content: updates.task } }] };
  if (updates.date) properties["Date"] = { date: { start: updates.date } };
  if (updates.startTime)
    properties["Start Time"] = {
      rich_text: [{ text: { content: updates.startTime } }],
    };
  if (updates.endTime)
    properties["End Time"] = {
      rich_text: [{ text: { content: updates.endTime } }],
    };
  if (updates.durationHour !== undefined)
    properties["Duration (Hour)"] = { number: updates.durationHour };
  if (updates.type) properties["Type"] = { select: { name: updates.type } };
  if (updates.note !== undefined)
    properties["Note"] = {
      rich_text: [{ text: { content: updates.note } }],
    };

  const page = await (client as any).pages.update({
    page_id: pageId,
    properties,
  });

  return pageToEntry(page);
}
