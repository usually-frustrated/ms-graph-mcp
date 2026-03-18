import {
  PublicClientApplication,
  Configuration,
  LogLevel,
  CryptoProvider,
} from "@azure/msal-node";
import { AddressInfo } from "node:net";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { createServer } from "node:http";

const MSAL_CONFIG: Configuration = {
  auth: {
    clientId: "0a74e52a-4d5b-4005-8dad-6b7cf45ec5fe", // Replace with actual Client ID
    authority: "https://login.microsoftonline.com/common",
  },
  system: {
    loggerOptions: {
      loggerCallback(loglevel, message, containsPii) {
        console.log(message);
      },
      piiLoggingEnabled: false,
      logLevel: LogLevel.Verbose,
    },
  },
};

const REDIRECT_URI_PATH = "/auth-callback";
const TOKEN_CACHE_FILE = path.join(
  os.homedir(),
  ".config",
  "ms-graph-mcp",
  "msal_cache.json",
);
const SCOPES = [
  "User.Read",
  "Mail.ReadWrite",
  "Calendars.ReadWrite",
  "Files.ReadWrite.All",
  "offline_access",
];

const pca = new PublicClientApplication(MSAL_CONFIG);

async function saveTokenCache() {
  const serialized = pca.getTokenCache().serialize();
  await fs.mkdir(path.dirname(TOKEN_CACHE_FILE), { recursive: true });
  await fs.writeFile(TOKEN_CACHE_FILE, serialized, { mode: 0o600 });
}

async function loadTokenCache(): Promise<boolean> {
  try {
    const data = await fs.readFile(TOKEN_CACHE_FILE, "utf-8");
    pca.getTokenCache().deserialize(data);
    return true;
  } catch {
    return false;
  }
}

export async function initAuth(): Promise<void> {
  console.log("Initiating Microsoft Graph authentication...");
  console.log(
    "Please ensure you have registered a multi-tenant application in Azure AD with the following redirect URI: http://localhost:PORT/auth-callback",
  );

  const cryptoProvider = new CryptoProvider();
  const pkceCodes = await cryptoProvider.generatePkceCodes();

  const authCodeUrlParameters = {
    scopes: SCOPES,
    redirectUri: `http://localhost:0${REDIRECT_URI_PATH}`,
    codeChallenge: pkceCodes.challenge,
    codeChallengeMethod: "S256" as const,
  };

  const authCodeUrl = await pca.getAuthCodeUrl(authCodeUrlParameters);

  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      if (req.url?.startsWith(REDIRECT_URI_PATH)) {
        const url = new URL(`http://localhost${req.url}`);
        const code = url.searchParams.get("code");

        if (code) {
          try {
            const addr = server.address() as AddressInfo;
            const tokenResult = await pca.acquireTokenByCode({
              code,
              scopes: SCOPES,
              redirectUri: `http://localhost:${addr.port}${REDIRECT_URI_PATH}`,
              codeVerifier: pkceCodes.verifier,
            });

            if (tokenResult) {
              await saveTokenCache();
              res.writeHead(200, { "Content-Type": "text/plain" });
              res.end("Authentication successful! You can close this window.");
              console.log("Authentication successful. Tokens saved securely.");
              server.close(() => resolve());
            } else {
              throw new Error(
                "Authentication failed: no token result received.",
              );
            }
          } catch (error) {
            console.error("Error acquiring token:", error);
            res.writeHead(500, { "Content-Type": "text/plain" });
            res.end("Authentication failed. Check console for details.");
            server.close(() => reject(error));
          }
        } else {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("Authorization code not found in redirect.");
          server.close(() =>
            reject(new Error("Authorization code not found.")),
          );
        }
      } else {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not Found");
      }
    });

    server.listen(0, () => {
      const addr = server.address() as AddressInfo;
      const finalRedirectUri = `http://localhost:${addr.port}${REDIRECT_URI_PATH}`;
      const finalAuthUrl = authCodeUrl.replace(
        `http://localhost:0${REDIRECT_URI_PATH}`,
        finalRedirectUri,
      );
      console.log(
        `\nOpen this URL in your browser to authenticate:\n\n  ${finalAuthUrl}\n`,
      );
    });

    server.on("error", (err) => {
      console.error("Server error:", err);
      reject(err);
    });
  });
}

export async function getAccessToken(): Promise<string> {
  await loadTokenCache();

  const accounts = await pca.getAllAccounts();
  if (accounts.length === 0) {
    throw new Error("No account found. Please run `ms-graph-mcp init` first.");
  }

  try {
    const tokenResult = await pca.acquireTokenSilent({
      account: accounts[0],
      scopes: SCOPES,
    });

    if (!tokenResult) {
      throw new Error("Failed to acquire access token silently.");
    }

    await saveTokenCache();
    return tokenResult.accessToken;
  } catch (error) {
    console.error("Error refreshing token:", error);
    await fs.unlink(TOKEN_CACHE_FILE).catch(() => {});
    throw new Error(
      "Failed to refresh access token. Please re-authenticate using `ms-graph-mcp init`.",
    );
  }
}

export async function revokeAuth(): Promise<void> {
  try {
    await fs.unlink(TOKEN_CACHE_FILE).catch(() => {});
    console.log("Authentication revoked. All tokens cleared.");
  } catch (error) {
    console.error("Error revoking authentication:", error);
    throw error;
  }
}

export async function getAuthStatus(): Promise<{
  clientId: string;
  tenantId: string;
  isAuthenticated: boolean;
}> {
  await loadTokenCache();
  const accounts = await pca.getAllAccounts();
  const isAuthenticated = accounts.length > 0;
  const authority =
    MSAL_CONFIG.auth.authority ?? "https://login.microsoftonline.com/common";
  return {
    clientId: MSAL_CONFIG.auth.clientId,
    tenantId: authority.split("/").pop() || "common",
    isAuthenticated,
  };
}
