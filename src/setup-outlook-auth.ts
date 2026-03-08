/**
 * รันสคริปต์นี้ครั้งเดียวเพื่อทำ Microsoft 365 OAuth
 * คำสั่ง: npx tsx src/setup-outlook-auth.ts
 */
import { getAccessToken } from "./outlook/auth.js";

console.log("เริ่ม Microsoft 365 OAuth setup...\n");

try {
  await getAccessToken();
  console.log("\nSetup สำเร็จ! ms365.token.json ถูกบันทึกแล้ว");
  console.log("ตอนนี้ใช้ Outlook MCP ใน Claude Code ได้เลยครับ");
} catch (err) {
  console.error("เกิดข้อผิดพลาด:", err);
}

process.exit(0);
