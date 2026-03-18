# Technical Specification: JSR-Based Microsoft Graph MCP Package

This document provides a detailed technical specification for the implementation of a JSR-based TypeScript package designed to expose personal Microsoft Graph APIs via the Model Context Protocol (MCP). This package will operate as a local CLI tool, executed by `bunx`, and communicate with AI agents through standard input/output (stdio). The primary goal is to enable secure, user-controlled access to Microsoft Graph data for AI agents without relying on a hosted service.

## 1. Project Overview

### 1.1 Goal
To develop a robust, cross-platform, and user-friendly MCP package that allows AI agents to interact with personal Microsoft Graph APIs (Outlook, OneDrive, Calendar, etc.) through a local CLI interface, leveraging JSR for distribution and Bun for execution.

### 1.2 Key Principles
- **Local-First:** Prioritize local execution and data control.
- **Security:** Implement strong authentication and secure token storage.
- **User Control:** Provide clear mechanisms for permission management and revocation.
- **Simplicity:** Minimize setup complexity for end-users.
- **Interoperability:** Adhere to MCP standards for broad agent compatibility.

## 2. Project Structure

The project will follow a standard TypeScript package structure, distributed via JSR.

```
/ms-graph-mcp-package
├── src/
│   ├── index.ts             # Main entry point for CLI commands (init, run, permissions, revoke)
│   ├── auth.ts              # Handles OAuth 2.0 flow and token management
│   ├── config.ts            # Manages local configuration (app registration details, tool permissions)
│   ├── tools/               # Directory for individual MCP tool implementations
│   │   ├── mail.ts          # MCP tools for Outlook Mail API
│   │   ├── calendar.ts      # MCP tools for Outlook Calendar API
│   │   ├── onedrive.ts      # MCP tools for OneDrive API
│   │   └── ...              # Other Microsoft Graph service tools
│   ├── mcp-interface.ts     # Defines MCP message formats and stdio communication logic
│   └── utils.ts             # Utility functions (logging, error handling, platform-specific helpers)
├── package.json
├── tsconfig.json
├── jsr.json                 # JSR specific configuration
├── README.md
└── .env.example             # Example environment variables
```

## 3. Dependencies

Core dependencies will include:

-   `@microsoft/microsoft-graph-client`: Official Microsoft Graph SDK for Node.js (compatible with Bun).
-   `msal-node`: Microsoft Authentication Library for Node.js, for handling OAuth 2.0.
-   `commander`: For building the CLI interface.
-   `keytar` (or similar): For secure, cross-platform credential storage.
-   `zod` (or similar): For schema validation of MCP messages and configuration.
-   `bun` (as dev dependency for types and runtime).

## 4. Authentication Flow

The package will implement the OAuth 2.0 Authorization Code Flow with PKCE, adapted for a CLI environment.

### 4.1 Centralized Application Registration
The package is designed to work with a **single, pre-registered Multi-tenant application** in the Microsoft Entra ID portal. This application is configured to support:
-   **Accounts in any organizational directory (Any Microsoft Entra ID tenant - Multitenant)**
-   **Personal Microsoft accounts (e.g. Skype, Xbox)**

**Pre-configured Application Details:**
-   **Application (Client) ID:** `[PRE_REGISTERED_CLIENT_ID]`
-   **Tenant ID:** `common` (This endpoint allows both organizational and personal accounts to sign in [1]).
-   **Redirect URI:** `http://localhost:PORT/auth-callback` (A dynamic local web server will be started by the CLI to capture the authorization code).

### 4.2 `init` Command (`bunx @org/package init`)
This command initiates the simplified authentication process:
1.  Displays a message explaining the authentication process and the scopes being requested.
2.  Constructs the authorization URL using the centralized Client ID and the `common` tenant endpoint.
3.  Starts a temporary local web server on a random available port to listen for the redirect.
4.  Opens the authorization URL in the user's default web browser.
5.  The user signs in with their personal or organizational account and grants consent.
6.  Upon redirect to `localhost`, the CLI captures the authorization code.
7.  Exchanges the authorization code for an access token and a refresh token using `msal-node` and the PKCE challenge.
8.  Securely stores the refresh token using `keytar` or an encrypted file.
9.  Stores the centralized Client ID and the user's tenant information (if applicable) in a local configuration file.

**Note for Advanced Users:** The CLI should provide an option (e.g., `--custom-app`) to override the centralized Client ID with their own application registration for maximum privacy and control.

### 4.3 Token Refresh
-   The `auth.ts` module will handle automatic token refreshing using the stored refresh token. This should occur transparently before any Microsoft Graph API call if the current access token is expired or near expiration.

## 5. Token Management

### 5.1 Secure Storage
Refresh tokens are highly sensitive and must be stored securely.
-   **Primary Method:** Utilize `keytar` for OS-specific credential storage (macOS Keychain, Windows Credential Manager, Linux Secret Service). This is the most secure option for local applications.
-   **Fallback Method:** If `keytar` is unavailable or fails, fall back to an encrypted file storage. The encryption key could be derived from a user-provided passphrase or an OS-generated key, ensuring the file is not readable without proper authorization.

### 5.2 Scope Management
-   The `init` command will request a base set of common scopes. Users can manually add or remove scopes in their Azure App Registration. The package will respect the scopes granted to the application.

## 6. MCP Tool Definitions

Each Microsoft Graph API will be exposed as one or more MCP tools. Tools will be defined with clear input and output schemas using `zod` for validation.

### 6.1 Example: `mail.list_messages`

-   **Description:** Lists mail messages from the user's inbox or specified folder.
-   **Input Schema:**
    ```typescript
    interface ListMailMessagesInput {
      folderId?: string; // Optional: ID of the mail folder (e.g., 'inbox', 'sentitems')
      top?: number;     // Optional: Number of messages to retrieve (default: 10)
      filter?: string;  // Optional: OData filter string
    }
    ```
-   **Output Schema:**
    ```typescript
    interface ListMailMessagesOutput {
      messages: Array<{ // Array of simplified mail message objects
        id: string;
        subject: string;
        from: { name: string; address: string };
        receivedDateTime: string;
        isRead: boolean;
        bodyPreview: string;
        webLink: string; // Link to the message in Outlook Web App
      }>;
      nextLink?: string; // OData nextLink for pagination
    }
    ```

### 6.2 Example: `calendar.create_event`

-   **Description:** Creates a new calendar event.
-   **Input Schema:**
    ```typescript
    interface CreateCalendarEventInput {
      subject: string;
      start: { dateTime: string; timeZone: string };
      end: { dateTime: string; timeZone: string };
      content?: string; // Optional: Body content of the event
      attendees?: Array<{ emailAddress: string; type: 'required' | 'optional' }>;
      location?: string;
    }
    ```
-   **Output Schema:**
    ```typescript
    interface CreateCalendarEventOutput {
      id: string;
      webLink: string; // Link to the event in Outlook Web App
      status: 'created' | 'failed';
      errorMessage?: string;
    }
    ```

## 7. Communication Protocol (Stdio)

The package will communicate with AI agents by reading JSON messages from `stdin` and writing JSON responses to `stdout`.

### 7.1 Request Format (from Agent to MCP Package)

```json
{
  "type": "request",
  "id": "<unique-request-id>",
  "tool": "<tool-name>",
  "input": { /* tool-specific input parameters */ }
}
```

### 7.2 Response Format (from MCP Package to Agent)

```json
{
  "type": "response",
  "id": "<unique-request-id>",
  "status": "success" | "error",
  "output": { /* tool-specific output data */ },
  "error": { "code": "<code>", "message": "<message>" } // Only if status is "error"
}
```

## 8. Error Handling

-   **Graph API Errors:** Translate Microsoft Graph API errors into a standardized MCP error format, including status codes and messages.
-   **Validation Errors:** Use `zod` to validate incoming MCP requests. Return clear error messages for invalid inputs.
-   **Authentication Errors:** Handle token expiration, invalid refresh tokens, and insufficient permissions gracefully, prompting the user for re-authentication if necessary.

## 9. Configuration and User Control

### 9.1 Configuration File
A local JSON configuration file (e.g., `~/.config/ms-graph-mcp/config.json`) will store:
-   `clientId`: The Microsoft Entra Application (Client) ID.
-   `tenantId`: The Microsoft Entra Tenant ID.
-   `enabledTools`: An array of strings or a map to enable/disable specific MCP tools or categories.

### 9.2 CLI Commands for User Control
-   `bunx @org/package permissions`: Displays the configured Client ID, Tenant ID, and a list of currently enabled/disabled tools.
-   `bunx @org/package revoke`: Revokes the refresh token from local storage and optionally from Microsoft Entra ID (if supported by MSAL), effectively disconnecting the package.
-   `bunx @org/package audit`: (Optional, future enhancement) Displays a local log of tool invocations.

## 10. Security Considerations

-   **Refresh Token Protection:** As detailed in Section 5.1, refresh tokens must be stored using the most secure method available for the operating system.
-   **Least Privilege:** Encourage users to grant only the necessary Microsoft Graph scopes to their registered application.
-   **Input Validation:** Strictly validate all incoming MCP requests to prevent injection attacks or unexpected behavior.
-   **Output Sanitization:** Ensure that any data returned from Microsoft Graph is properly sanitized before being passed back to the AI agent, especially if the agent might display it to the user.

## 11. References

[1] JSR. *JSR: the JavaScript Registry*. Available at: https://jsr.io/
[2] Bun. *bunx*. Available at: https://bun.com/docs/pm/bunx
[3] Bun. *Bun*. Available at: https://bun.com/
[4] Bun. *Install TypeScript declarations for Bun*. Available at: https://bun.com/docs/guides/runtime/typescript
[5] Microsoft. *Microsoft Graph SDK for JavaScript*. Available at: https://learn.microsoft.com/en-us/graph/sdks/sdk-overview#javascript-sdk
[6] Microsoft. *Microsoft Authentication Library for Node.js (MSAL Node)*. Available at: https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-node
[7] Commander. *Commander.js*. Available at: https://github.com/tj/commander.js
[8] Keytar. *keytar*. Available at: https://github.com/atom/node-keytar
[9] Zod. *Zod*. Available at: https://zod.dev/
[10] Microsoft. *Getting Microsoft entra oauth login to work with personal accounts*. Available at: https://learn.microsoft.com/en-us/answers/questions/1525326/getting-microsoft-entra-oauth-login-to-work-with-p
