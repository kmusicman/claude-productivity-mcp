import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import fs from "fs";
import path from "path";
import http from "http";
import { URL } from "url";

// รวม scopes ของทุก Google service ไว้ที่เดียว
const SCOPES = [
  // Gmail
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
  // Calendar
  "https://www.googleapis.com/auth/calendar",
  // Drive
  "https://www.googleapis.com/auth/drive.readonly",
  // Sheets
  "https://www.googleapis.com/auth/spreadsheets",
];

const PROJECT_ROOT = path.resolve(new URL("../../", import.meta.url).pathname);
const OAUTH_KEYS_PATH = path.join(PROJECT_ROOT, "credentials/oauth2.keys.json");
const TOKEN_PATH = path.join(PROJECT_ROOT, "credentials/google-token.json");

function loadOAuthKeys() {
  if (!fs.existsSync(OAUTH_KEYS_PATH)) {
    throw new Error(`ไม่พบไฟล์ credentials\nวางไฟล์ oauth2.keys.json ไว้ที่: ${OAUTH_KEYS_PATH}`);
  }
  const raw = fs.readFileSync(OAUTH_KEYS_PATH, "utf-8");
  const keys = JSON.parse(raw);
  const config = keys.installed || keys.web;
  return config as { client_id: string; client_secret: string; redirect_uris: string[] };
}

function createOAuthClient(): OAuth2Client {
  const keys = loadOAuthKeys();
  return new google.auth.OAuth2(keys.client_id, keys.client_secret, "http://localhost:5555/oauth/callback");
}

function loadSavedToken(client: OAuth2Client): boolean {
  if (!fs.existsSync(TOKEN_PATH)) return false;
  client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH, "utf-8")));
  return true;
}

function saveToken(client: OAuth2Client) {
  fs.mkdirSync(path.dirname(TOKEN_PATH), { recursive: true });
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(client.credentials, null, 2));
}

async function runOAuthFlow(client: OAuth2Client): Promise<void> {
  const authUrl = client.generateAuthUrl({ access_type: "offline", scope: SCOPES, prompt: "consent" });
  console.error("\n=== Google Authorization Required ===");
  console.error("เปิด URL นี้ใน browser:\n");
  console.error(authUrl);
  console.error("\nรอรับ callback...");
  const code = await waitForAuthCode();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);
  saveToken(client);
  console.error("\nAuthorization สำเร็จ! Token บันทึกแล้ว");
}

function waitForAuthCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url!, "http://localhost:5555");
      const code = url.searchParams.get("code");
      if (code) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end("<h2>Authorization สำเร็จ!</h2><p>ปิด tab นี้ได้เลยครับ</p>");
        server.close();
        resolve(code);
      } else {
        res.writeHead(400);
        res.end("ไม่พบ authorization code");
        server.close();
        reject(new Error("ไม่พบ authorization code จาก Google"));
      }
    });
    server.listen(5555, () => {});
    server.on("error", reject);
    setTimeout(() => { server.close(); reject(new Error("Authorization timeout (5 นาที)")); }, 5 * 60 * 1000);
  });
}

let cachedClient: OAuth2Client | null = null;

export async function getAuthenticatedClient(): Promise<OAuth2Client> {
  if (cachedClient) return cachedClient;

  const client = createOAuthClient();
  if (loadSavedToken(client)) {
    client.on("tokens", (tokens) => {
      if (tokens.refresh_token) { client.setCredentials(tokens); saveToken(client); }
    });
    cachedClient = client;
    return client;
  }

  await runOAuthFlow(client);
  cachedClient = client;
  return client;
}
