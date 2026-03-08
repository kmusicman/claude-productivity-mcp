export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: string;   // ISO 8601
  end: string;     // ISO 8601
  status: string;  // confirmed | tentative | cancelled
  htmlLink?: string;
}

export interface CreateEventInput {
  summary: string;
  description?: string;
  location?: string;
  start: string;   // ISO 8601 เช่น "2025-03-10T09:00:00+07:00"
  end: string;     // ISO 8601
  calendarId?: string;
}

export interface UpdateEventInput {
  eventId: string;
  calendarId?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: string;
  end?: string;
}
