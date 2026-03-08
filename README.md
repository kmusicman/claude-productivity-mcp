# claude-productivity-mcp

🇹🇭 ภาษาไทย | [🇬🇧 English](README.en.md)

**MCP Server สำหรับ Claude Desktop** ที่รวม productivity tools ยอดนิยมไว้ในที่เดียว — Gmail, Google Calendar, Google Drive, Google Sheets, Notion และ Microsoft Outlook ควบคุมได้ง่ายผ่าน `.env` ไม่ต้องแก้โค้ด

> ใช้กับ [Claude Desktop](https://claude.ai/download) ผ่านโปรโตคอล [Model Context Protocol (MCP)](https://modelcontextprotocol.io)

---

## MCP คืออะไร?

**Model Context Protocol (MCP)** คือโปรโตคอลมาตรฐานที่ช่วยให้ Claude Desktop เชื่อมต่อกับ tools และ services ภายนอกได้โดยตรง แทนที่จะต้อง copy-paste ข้อมูลระหว่างแอป คุณสามารถพูดกับ Claude ว่า:

- _"สรุปอีเมลที่ยังไม่ได้อ่านวันนี้ให้หน่อย"_
- _"เพิ่ม event ประชุมพรุ่งนี้ 10 โมงใน Calendar"_
- _"ค้นหาไฟล์ proposal ใน Drive แล้วบอกว่าอัปเดตล่าสุดเมื่อไหร่"_
- _"เพิ่มแถวค่าใช้จ่ายวันนี้ใน Google Sheets"_

Claude จะดำเนินการให้เองทันที ไม่ต้องเปิดแอปอื่น

---

## Tools ที่รองรับ

### Google (Gmail + Calendar + Drive + Sheets)
| Tool | คำอธิบาย |
|------|----------|
| `gmail_list_emails` | ดูรายการอีเมล (กรองด้วย query ได้) |
| `gmail_get_email` | อ่านอีเมลเต็มรวม body |
| `gmail_mark_as_read` | Mark อีเมลว่าอ่านแล้ว |
| `gmail_send_email` | ส่งอีเมลใหม่ (รองรับ CC) |
| `gmail_reply_email` | ตอบอีเมลใน thread เดิม |
| `calendar_list_calendars` | ดู calendars ทั้งหมดในบัญชี |
| `calendar_list_events` | ดูรายการ events (กรองวันที่/คำค้นได้) |
| `calendar_create_event` | สร้าง event ใหม่ |
| `calendar_update_event` | แก้ไข event |
| `calendar_cancel_event` | ยกเลิก event (safe — ใช้ patch แทน delete) |
| `drive_list_files` | ดูรายการไฟล์ใน Drive |
| `drive_search` | ค้นหาไฟล์ด้วยชื่อ |
| `sheets_list_sheets` | ดูชื่อ sheets ทั้งหมดใน spreadsheet |
| `sheets_read` | อ่านข้อมูลจาก range |
| `sheets_write` | เขียน/อัปเดตข้อมูล |
| `sheets_append` | เพิ่มแถวใหม่ต่อท้าย |

### Notion
| Tool | คำอธิบาย |
|------|----------|
| `notion_list_timesheet` | ดูรายการ timesheet |
| `notion_add_timesheet` | เพิ่ม timesheet |
| `notion_update_timesheet` | อัปเดต timesheet |
| `notion_export_excel` | Export เป็นไฟล์ Excel |

### Microsoft Outlook
| Tool | คำอธิบาย |
|------|----------|
| `outlook_list_emails` | ดูรายการอีเมล |
| `outlook_get_email` | อ่านอีเมลเต็ม |
| `outlook_mark_as_read` | Mark อีเมลว่าอ่านแล้ว |
| `outlook_send_email` | ส่งอีเมล |

---

## Requirements

- [Node.js](https://nodejs.org) v18 ขึ้นไป
- [Claude Desktop](https://claude.ai/download)
- บัญชี Google (สำหรับ Gmail/Calendar/Drive/Sheets)
- บัญชี Microsoft 365 (สำหรับ Outlook — optional)
- บัญชี Notion (สำหรับ Notion — optional)

---

## Installation

```bash
# 1. Clone repo
git clone https://github.com/kmusicman/claude-productivity-mcp.git
cd claude-productivity-mcp

# 2. ติดตั้ง dependencies
npm install

# 3. Copy ไฟล์ config
cp .env.example .env
```

---

## Setup

### 1. Google (Gmail + Calendar + Drive + Sheets)

#### 1.1 เปิดใช้งาน Google APIs

1. ไปที่ [Google Cloud Console](https://console.cloud.google.com)
2. สร้าง Project ใหม่ หรือเลือก Project ที่มีอยู่
3. ไปที่ **APIs & Services → Library** แล้วเปิดใช้งาน API ต่อไปนี้:
   - **Gmail API**
   - **Google Calendar API**
   - **Google Drive API**
   - **Google Sheets API**

<!-- รูป: การเปิด API ใน Google Cloud Console -->

#### 1.2 สร้าง OAuth 2.0 Credentials

1. ไปที่ **APIs & Services → Credentials**
2. คลิก **Create Credentials → OAuth client ID**
3. เลือก Application type: **Desktop app**
4. ตั้งชื่อตามต้องการ แล้วคลิก **Create**
5. คลิก **Download JSON**
6. Rename ไฟล์ที่ดาวน์โหลดมาเป็น `oauth2.keys.json`
7. วางไฟล์ที่ `credentials/oauth2.keys.json`

<!-- รูป: การสร้าง OAuth credentials -->

> หากยังไม่ได้ตั้งค่า OAuth consent screen ให้ไปที่ **APIs & Services → OAuth consent screen** ตั้งค่าเป็น External และเพิ่ม email ตัวเองเป็น Test user

#### 1.3 รัน Setup

```bash
npx tsx src/setup-google-auth.ts
```

Browser จะเปิดขึ้นมาให้ login Google → อนุญาต permissions → token จะถูกบันทึกอัตโนมัติที่ `credentials/google-token.json`

<!-- รูป: หน้า OAuth consent ใน browser -->

---

### 2. Notion

#### 2.1 สร้าง Notion Integration

1. ไปที่ [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
2. คลิก **New integration**
3. ตั้งชื่อ เช่น `Claude MCP`
4. เลือก workspace ที่ต้องการ
5. คลิก **Submit**
6. Copy **Internal Integration Token**

<!-- รูป: การสร้าง Notion Integration -->

#### 2.2 เชื่อมต่อ Database

1. เปิด Notion Database ที่ต้องการใช้งาน
2. คลิก **...** (มุมขวาบน) → **Connections** → เลือก integration ที่สร้างไว้
3. Copy Database ID จาก URL: `https://notion.so/YOUR_DATABASE_ID?v=...`

#### 2.3 บันทึก Credentials

สร้างไฟล์ `credentials/notion.json`:

```json
{
  "apiKey": "ntn_YOUR_NOTION_API_KEY",
  "timesheetDatabaseId": "YOUR_DATABASE_ID"
}
```

---

### 3. Microsoft Outlook

#### 3.1 สร้าง Azure App Registration

1. ไปที่ [Azure Portal](https://portal.azure.com)
2. ค้นหา **App registrations** → **New registration**
3. ตั้งชื่อ เช่น `Claude MCP`
4. Supported account types: **Personal Microsoft accounts only**
5. Redirect URI: `http://localhost:5555/oauth/callback` (Platform: Web)
6. คลิก **Register**

<!-- รูป: การสร้าง Azure App Registration -->

#### 3.2 เพิ่ม API Permissions

1. ไปที่ **API permissions → Add a permission → Microsoft Graph**
2. เลือก **Delegated permissions** และเพิ่ม:
   - `Mail.Read`
   - `Mail.ReadWrite`
   - `Mail.Send`
3. คลิก **Grant admin consent**

#### 3.3 สร้าง Client Secret

1. ไปที่ **Certificates & secrets → New client secret**
2. ตั้งชื่อและเลือกอายุ → คลิก **Add**
3. Copy **Value** ทันที (จะมองเห็นแค่ครั้งเดียว)

#### 3.4 บันทึก Credentials

สร้างไฟล์ `credentials/ms365.keys.json`:

```json
{
  "clientId": "YOUR_AZURE_CLIENT_ID",
  "clientSecret": "YOUR_AZURE_CLIENT_SECRET",
  "tenantId": "consumers"
}
```

#### 3.5 รัน Setup

```bash
npx tsx src/setup-outlook-auth.ts
```

---

### 4. Build

```bash
npm run build
```

---

## เชื่อมต่อกับ Claude Desktop

1. เปิดไฟล์ config ของ Claude Desktop:
   - **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

2. เพิ่ม config ต่อไปนี้:

```json
{
  "mcpServers": {
    "productivity-mcp": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/claude-productivity-mcp/dist/index.js"]
    }
  }
}
```

> แทนที่ `/ABSOLUTE/PATH/TO/` ด้วย path จริงบนเครื่องของคุณ

3. **Restart Claude Desktop**

<!-- รูป: Claude Desktop แสดง tools ที่พร้อมใช้งาน -->

---

## Configuration

เปิด/ปิด service แต่ละตัวได้ที่ไฟล์ `.env`:

```env
ENABLE_GOOGLE=true    # Gmail + Calendar + Drive + Sheets
ENABLE_NOTION=true
ENABLE_OUTLOOK=true
```

ตั้งเป็น `true` เพื่อเปิดใช้งาน, `false` หรือลบออกเพื่อปิด

---

## ตัวอย่างการใช้งาน

```
"สรุปอีเมลที่ยังไม่ได้อ่านใน Gmail 5 ฉบับล่าสุดให้หน่อย"

"เพิ่ม event ประชุมทีม วันพรุ่งนี้ 10:00-11:00 น. ใน Google Calendar"

"ค้นหาไฟล์ที่มีคำว่า proposal ใน Google Drive"

"อ่านข้อมูลจาก Sheet1 แถว A1:D10 ใน spreadsheet นี้: [spreadsheet ID]"

"ส่งอีเมลหา someone@example.com หัวเรื่อง 'สวัสดี' เนื้อหา 'ทดสอบระบบ'"
```

---

## License

MIT
