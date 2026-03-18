import { PublicClientApplication, Configuration, LogLevel } from '@azure/msal-node';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as keytar from 'keytar';
import open from 'open';
import { createServer } from 'http';

const MSAL_CONFIG: Configuration = {
  auth: {
    clientId: process.env.MS_GRAPH_CLIENT_ID || 'YOUR_CENTRALIZED_CLIENT_ID_HERE', // Replace with actual Client ID
    authority: 'https://login.microsoftonline.com/common',
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

const REDIRECT_URI_PATH = '/auth-callback';
const TOKEN_CACHE_FILE = path.join(os.homedir(), '.ms-graph-mcp', 'token_cache.json');
const SERVICE_NAME = 'ms-graph-mcp';
const ACCOUNT_NAME = 'default_user';

const pca = new PublicClientApplication(MSAL_CONFIG);

interface TokenCache {
  refreshToken: string;
  accessToken: string;
  expiresOn: number;
}

async function saveTokenCache(cache: TokenCache) {
  await fs.mkdir(path.dirname(TOKEN_CACHE_FILE), { recursive: true });
  await fs.writeFile(TOKEN_CACHE_FILE, JSON.stringify(cache, null, 2));
  // Optionally, use keytar for refresh token for better security
  await keytar.setPassword(SERVICE_NAME, ACCOUNT_NAME, cache.refreshToken);
}

async function loadTokenCache(): Promise<TokenCache | null> {
  try {
    const refreshToken = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);
    if (refreshToken) {
      // For simplicity, we're not storing accessToken and expiresOn in keytar directly
      // They will be refreshed using the refreshToken
      return { refreshToken, accessToken: '', expiresOn: 0 };
    }
    // Fallback to file if keytar fails or is not used
    const cacheContent = await fs.readFile(TOKEN_CACHE_FILE, 'utf-8');
    return JSON.parse(cacheContent);
  } catch (error) {
    return null;
  }
}

export async function initAuth(): Promise<void> {
  console.log('Initiating Microsoft Graph authentication...');
  console.log('Please ensure you have registered a multi-tenant application in Azure AD with the following redirect URI: http://localhost:PORT/auth-callback');

  const crypto = await import('crypto');
  const pkceCodes = pca.generatePkceCodes();

  const authCodeUrlParameters = {
    scopes: ['User.Read', 'Mail.ReadWrite', 'Calendars.ReadWrite', 'Files.ReadWrite.All', 'offline_access'],
    redirectUri: `http://localhost:0${REDIRECT_URI_PATH}`, // Use port 0 to get a random available port
    codeChallenge: pkceCodes.challenge,
    codeChallengeMethod: 'S256',
  };

  const authCodeUrl = await pca.getAuthCodeUrl(authCodeUrlParameters);

  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      if (req.url?.startsWith(REDIRECT_URI_PATH)) {
        const url = new URL(`http://localhost${req.url}`);
        const code = url.searchParams.get('code');

        if (code) {
          try {
            const tokenResult = await pca.acquireTokenByCode({
              code,
              scopes: authCodeUrlParameters.scopes,
              redirectUri: `http://localhost:${server.address().port}${REDIRECT_URI_PATH}`,
              codeVerifier: pkceCodes.verifier,
            });

            if (tokenResult && tokenResult.refreshToken) {
              await saveTokenCache({
                refreshToken: tokenResult.refreshToken,
                accessToken: tokenResult.accessToken,
                expiresOn: tokenResult.expiresOn ? tokenResult.expiresOn.getTime() : 0,
              });
              res.writeHead(200, { 'Content-Type': 'text/plain' });
              res.end('Authentication successful! You can close this window.');
              console.log('Authentication successful. Tokens saved securely.');
              server.close(() => resolve());
            } else {
              throw new Error('No refresh token received.');
            }
          } catch (error) {
            console.error('Error acquiring token:', error);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Authentication failed. Check console for details.');
            server.close(() => reject(error));
          }
        } else {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Authorization code not found in redirect.');
          server.close(() => reject(new Error('Authorization code not found.')));
        }
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });

    server.listen(0, () => {
      const port = server.address().port;
      const finalRedirectUri = `http://localhost:${port}${REDIRECT_URI_PATH}`;
      console.log(`Please open the following URL in your browser to authenticate:\n${authCodeUrl.replace(`http://localhost:0${REDIRECT_URI_PATH}`, finalRedirectUri)}`);
      open(authCodeUrl.replace(`http://localhost:0${REDIRECT_URI_PATH}`, finalRedirectUri));
    });

    server.on('error', (err) => {
      console.error('Server error:', err);
      reject(err);
    });
  });
}

export async function getAccessToken(): Promise<string> {
  let tokenCache = await loadTokenCache();

  if (!tokenCache || !tokenCache.refreshToken) {
    throw new Error('No refresh token found. Please run `bunx @manus/ms-graph-mcp init` first.');
  }

  // Check if current access token is still valid
  if (tokenCache.accessToken && tokenCache.expiresOn > Date.now() + 60 * 1000) { // Refresh if less than 1 minute left
    return tokenCache.accessToken;
  }

  try {
    const tokenResult = await pca.acquireTokenByRefreshToken({
      refreshToken: tokenCache.refreshToken,
      scopes: ['User.Read', 'Mail.ReadWrite', 'Calendars.ReadWrite', 'Files.ReadWrite.All', 'offline_access'],
    });

    if (tokenResult && tokenResult.accessToken && tokenResult.refreshToken) {
      tokenCache = {
        refreshToken: tokenResult.refreshToken,
        accessToken: tokenResult.accessToken,
        expiresOn: tokenResult.expiresOn ? tokenResult.expiresOn.getTime() : 0,
      };
      await saveTokenCache(tokenCache);
      return tokenCache.accessToken;
    } else {
      throw new Error('Failed to acquire access token by refresh token.');
    }
  } catch (error) {
    console.error('Error refreshing token:', error);
    // Clear invalid token cache
    await fs.unlink(TOKEN_CACHE_FILE).catch(() => {});
    await keytar.deletePassword(SERVICE_NAME, ACCOUNT_NAME).catch(() => {});
    throw new Error('Failed to refresh access token. Please re-authenticate using `bunx @manus/ms-graph-mcp init`.');
  }
}

export async function revokeAuth(): Promise<void> {
  try {
    await fs.unlink(TOKEN_CACHE_FILE).catch(() => {});
    await keytar.deletePassword(SERVICE_NAME, ACCOUNT_NAME).catch(() => {});
    console.log('Authentication revoked. All tokens cleared.');
  } catch (error) {
    console.error('Error revoking authentication:', error);
    throw error;
  }
}

export async function getAuthStatus(): Promise<{ clientId: string; tenantId: string; isAuthenticated: boolean }> {
  const tokenCache = await loadTokenCache();
  const isAuthenticated = !!tokenCache?.refreshToken;
  return {
    clientId: MSAL_CONFIG.auth.clientId,
    tenantId: MSAL_CONFIG.auth.authority.split('/').pop() || 'common',
    isAuthenticated,
  };
}
