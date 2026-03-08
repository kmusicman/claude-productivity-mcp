export type NotionTimesheetType =
  | "Meeting"
  | "Communication"
  | "Support"
  | "Prepare Data/Document/Presentation"
  | "Research/POC/Training"
  | "Evaluation/Feedback/Coaching/Management"
  | "Project (Pre-Dev)"
  | "Project"
  | "RFC/Issue"
  | "Leave";

export interface TimesheetEntry {
  id: string;
  task: string;
  date: string;
  startTime: string;
  endTime: string;
  durationHour: number | null;
  type: string | null;
  note: string;
}
