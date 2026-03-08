import fs from "fs";
import path from "path";
import type { TimesheetEntry } from "./types.js";

// xlsx เป็น CommonJS — ใช้ createRequire
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

export interface ExportResult {
  filepath: string;
  filename: string;
  rowCount: number;
  fileSize: string;
}

export function exportTimesheetToExcel(
  entries: TimesheetEntry[],
  outputPath?: string
): ExportResult {
  // เรียงตามวันที่ก่อน
  const sorted = [...entries].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return toMinutes(a.startTime) - toMinutes(b.startTime);
  });

  const rows = sorted.map((e) => ({
    Date: formatDate(e.date),
    "Start Time": e.startTime,
    "End Time": e.endTime,
    "Duration (Hour)": calcDuration(e.startTime, e.endTime),
    Type: e.type ?? "",
    Task: e.task,
    Note: e.note ?? "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  worksheet["!cols"] = [
    { wch: 12 }, // Date
    { wch: 10 }, // Start Time
    { wch: 10 }, // End Time
    { wch: 14 }, // Duration (Hour)
    { wch: 35 }, // Type
    { wch: 50 }, // Task
    { wch: 30 }, // Note
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Timesheet");

  const filepath = resolveOutputPath(outputPath);
  fs.mkdirSync(path.dirname(filepath), { recursive: true });
  XLSX.writeFile(workbook, filepath);

  const fileSize = fs.statSync(filepath).size;

  return {
    filepath,
    filename: path.basename(filepath),
    rowCount: rows.length,
    fileSize: `${(fileSize / 1024).toFixed(2)} KB`,
  };
}

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatDate(isoDate: string): string {
  // YYYY-MM-DD → DD-Mon-YYYY
  const [year, month, day] = isoDate.split("-");
  return `${day}-${MONTH_ABBR[parseInt(month, 10) - 1]}-${year}`;
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function calcDuration(startTime: string, endTime: string): number {
  return Math.round(((toMinutes(endTime) - toMinutes(startTime)) / 60) * 100) / 100;
}

function resolveOutputPath(outputPath?: string): string {
  if (outputPath) {
    // รองรับ ~ expansion
    return outputPath;
  }

  // default: <project_root>/export/notion/YYYY-MM-DD.xlsx
  const PROJECT_ROOT = path.resolve(new URL("../../", import.meta.url).pathname);
  const date = new Date().toISOString().split("T")[0];
  return path.join(PROJECT_ROOT, "export", "notion", `${date}.xlsx`);
}
