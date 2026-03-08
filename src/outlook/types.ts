export interface OutlookEmailHeader {
  id: string;
  subject: string;
  from: string;
  fromName: string;
  date: string;
  snippet: string;
  isRead: boolean;
}

export interface OutlookEmailFull extends OutlookEmailHeader {
  body: string;
  bodyType: "html" | "text";
  categories: string[];
}
