/**
 * รันสคริปนี้ครั้งเดียวเพื่อทำ Google OAuth (ครอบคลุมทุก service)
 * คำสั่ง: npx tsx src/setup-google-auth.ts
 */
import { getAuthenticatedClient } from "./google/auth.js";

console.log("เริ่ม Google OAuth setup (Gmail + Calendar + Drive + Sheets)...\n");

try {
  await getAuthenticatedClient();
  console.log("\nSetup สำเร็จ! google-token.json ถูกบันทึกแล้ว");
  console.log("ตอนนี้ใช้ Google services ทั้งหมดใน Claude ได้เลยครับ");
} catch (err) {
  console.error("เกิดข้อผิดพลาด:", err);
}

process.exit(0);
