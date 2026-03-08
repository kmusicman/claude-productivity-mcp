import {
  ConfidentialClientApplication,
  Configuration,
  AuthorizationCodeRequest,
  SilentFlowRequest,
} from "@azure/msal-node";
import fs from "fs";
import path from "path";
import http from "http";
import { URL } from "url";

const SCOPES = ["Mail.Read", "Mail.ReadWrite", "Mail.Send", "offline_access"];
const REDIRECT_URI = "http://localhost:5556/oauth/callback";

const PROJECT_ROOT = path.resolve(new URL("../../", import.meta.url).pathname);
const MS_KEYS_PATH = path.join(PROJECT_ROOT, "credentials/ms365.keys.json");
const MS_TOKEN_PATH = path.join(PROJECT_ROOT, "credentials/ms365.token.json");

interface MS365Keys {
  client_id: string;
  tenant_id: string;
  client_secret: string;
}

function loadKeys(): MS365Keys {
  if (!fs.existsSync(MS_KEYS_PATH)) {
    throw new Error(
      `ไม่พบไฟล์ ms365.keys.json\nวางไว้ที่: ${MS_KEYS_PATH}`
    );
  }
  return JSON.parse(fs.readFileSync(MS_KEYS_PATH, "utf-8"));
}

function createApp(): ConfidentialClientApplication {
  const keys = loadKeys();

  const config: Configuration = {
    auth: {
      clientId: keys.client_id,
      clientSecret: keys.client_secret,
      authority: `https://login.microsoftonline.com/${keys.tenant_id}`,
    },
    cache: {
      cachePlugin: {
        beforeCacheAccess: async (cacheContext) => {
          if (fs.existsSync(MS_TOKEN_PATH)) {
            cacheContext.tokenCache.deserialize(
              fs.readFileSync(MS_TOKEN_PATH, "utf-8")
            );
          }
        },
        afterCacheAccess: async (cacheContext) => {
          if (cacheContext.cacheHasChanged) {
            fs.mkdirSync(path.dirname(MS_TOKEN_PATH), { recursive: true });
            fs.writeFileSync(
              MS_TOKEN_PATH,
              cacheContext.tokenCache.serialize()
            );
          }
        },
      },
    },
  };

  return new ConfidentialClientApplication(config);
}

async function getAccessTokenSilent(
  app: ConfidentialClientApplication
): Promise<string | null> {
  const accounts = await app.getTokenCache().getAllAccounts();
  if (accounts.length === 0) return null;

  try {
    const request: SilentFlowRequest = {
      scopes: SCOPES,
      account: accounts[0],
    };
    const result = await app.acquireTokenSilent(request);
    return result?.accessToken ?? null;
  } catch {
    return null;
  }
}

async function runOAuthFlow(
  app: ConfidentialClientApplication
): Promise<string> {
  const authUrl = await app.getAuthCodeUrl({
    scopes: SCOPES,
    redirectUri: REDIRECT_URI,
  });

  console.error("\n=== Microsoft 365 Authorization Required ===");
  console.error("เปิด URL นี้ใน browser:\n");
  console.error(authUrl);
  console.error("\nรอรับ callback...");

  const code = await waitForAuthCode();

  const tokenRequest: AuthorizationCodeRequest = {
    scopes: SCOPES,
    redirectUri: REDIRECT_URI,
    code,
  };

  const result = await app.acquireTokenByCode(tokenRequest);
  return result.accessToken;
}

function waitForAuthCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url!, "http://localhost:5556");
      const code = url.searchParams.get("code");

      if (code) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`
          <h2>Authorization สำเร็จ!</h2>
          <p>ปิด tab นี้และกลับไปที่ terminal ได้เลยครับ</p>
        `);
        server.close();
        resolve(code);
      } else {
        res.writeHead(400);
        res.end("ไม่พบ authorization code");
        server.close();
        reject(new Error("ไม่พบ authorization code จาก Microsoft"));
      }
    });

    server.listen(5556, () => {});
    server.on("error", reject);

    setTimeout(() => {
      server.close();
      reject(new Error("Authorization timeout (5 นาที)"));
    }, 5 * 60 * 1000);
  });
}

let _app: ConfidentialClientApplication | null = null;

export async function getAccessToken(): Promise<string> {
  if (!_app) {
    _app = createApp();
  }

  const silent = await getAccessTokenSilent(_app);
  if (silent) return silent;

  return runOAuthFlow(_app);
}
