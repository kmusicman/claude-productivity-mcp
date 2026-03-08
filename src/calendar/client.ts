import { google, calendar_v3 } from "googleapis";
import { getAuthenticatedClient } from "./auth.js";
import type { CalendarEvent, CreateEventInput, UpdateEventInput } from "./types.js";

let calendarClient: calendar_v3.Calendar | null = null;

async function getCalendar(): Promise<calendar_v3.Calendar> {
  if (calendarClient) return calendarClient;
  const auth = await getAuthenticatedClient();
  calendarClient = google.calendar({ version: "v3", auth });
  return calendarClient;
}

function mapEvent(event: calendar_v3.Schema$Event): CalendarEvent {
  return {
    id: event.id!,
    summary: event.summary ?? "(ไม่มีหัวเรื่อง)",
    description: event.description ?? undefined,
    location: event.location ?? undefined,
    start: event.start?.dateTime ?? event.start?.date ?? "",
    end: event.end?.dateTime ?? event.end?.date ?? "",
    status: event.status ?? "confirmed",
    htmlLink: event.htmlLink ?? undefined,
  };
}

// ดึงรายการ events
export async function listEvents(options: {
  calendarId?: string;
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
  query?: string;
}): Promise<CalendarEvent[]> {
  const calendar = await getCalendar();
  const { calendarId = "primary", timeMin, timeMax, maxResults = 20, query } = options;

  const res = await calendar.events.list({
    calendarId,
    timeMin,
    timeMax,
    maxResults,
    q: query,
    singleEvents: true,
    orderBy: "startTime",
  });

  return (res.data.items ?? []).map(mapEvent);
}

// สร้าง event ใหม่
export async function createEvent(input: CreateEventInput): Promise<CalendarEvent> {
  const calendar = await getCalendar();
  const { calendarId = "primary", summary, description, location, start, end } = input;

  const res = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary,
      description,
      location,
      start: { dateTime: start },
      end: { dateTime: end },
    },
  });

  return mapEvent(res.data);
}

// อัปเดต event
export async function updateEvent(input: UpdateEventInput): Promise<CalendarEvent> {
  const calendar = await getCalendar();
  const { eventId, calendarId = "primary", summary, description, location, start, end } = input;

  const requestBody: calendar_v3.Schema$Event = {};
  if (summary !== undefined) requestBody.summary = summary;
  if (description !== undefined) requestBody.description = description;
  if (location !== undefined) requestBody.location = location;
  if (start !== undefined) requestBody.start = { dateTime: start };
  if (end !== undefined) requestBody.end = { dateTime: end };

  const res = await calendar.events.patch({
    calendarId,
    eventId,
    requestBody,
  });

  return mapEvent(res.data);
}

// ดึงรายการ calendars ทั้งหมด
export async function listCalendars(): Promise<{ id: string; summary: string; primary: boolean; accessRole: string }[]> {
  const calendar = await getCalendar();
  const res = await calendar.calendarList.list();
  return (res.data.items ?? []).map((c) => ({
    id: c.id!,
    summary: c.summary ?? "(ไม่มีชื่อ)",
    primary: c.primary ?? false,
    accessRole: c.accessRole ?? "",
  }));
}

// "ลบ" event โดย set status เป็น cancelled (safe delete)
export async function cancelEvent(eventId: string, calendarId = "primary"): Promise<CalendarEvent> {
  const calendar = await getCalendar();

  const res = await calendar.events.patch({
    calendarId,
    eventId,
    requestBody: { status: "cancelled" },
  });

  return mapEvent(res.data);
}
