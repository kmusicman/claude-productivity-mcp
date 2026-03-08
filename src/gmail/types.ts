export interface EmailHeader {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

export interface EmailFull extends EmailHeader {
  body: string;
  labels: string[];
}
