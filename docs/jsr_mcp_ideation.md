# Ideation: JSR-Based TypeScript MCP Package for Personal Microsoft Graph Access

This document outlines a revised conceptual design for providing AI agents with access to personal Microsoft Graph APIs. The previous ideation focused on a hosted HTTP/SSE server. This revision pivots to a **non-HTTP, JSR-based TypeScript package** designed for local execution via `bunx` and `stdio`, addressing concerns about platform independence, cost, and potential competition from Microsoft.

## 1. Core Concept: Local, Portable, and User-Controlled

The core idea is to empower users with a self-hosted, easily runnable MCP solution for their personal Microsoft accounts. Instead of a centralized hosted service, this approach leverages modern JavaScript ecosystem tools to create a portable package that users can run on their local machines or in their preferred execution environments. This provides maximum control over data and permissions, mitigating concerns about vendor lock-in or service deprecation.

## 2. Architectural Framework: JSR, Bunx, and Stdio

The revised architecture centers around a TypeScript package distributed via JSR, executed by `bunx`, and communicating via standard input/output (stdio).

### 2.1 JSR (JavaScript Registry) for Distribution

JSR is a modern package registry optimized for TypeScript and compatible with various JavaScript runtimes, including Node.js, Deno, and Bun [1].

- **Benefits:**
    - **Native TypeScript Support:** JSR natively understands TypeScript, eliminating the need for complex build configurations for package authors [1].
    - **Universal Compatibility:** Packages published to JSR can be consumed by `npm`, `yarn`, `pnpm`, `bun`, and `deno` [1]. This ensures broad accessibility for users regardless of their preferred package manager or runtime.
    - **ESM-first:** JSR promotes web-standard ECMAScript modules, aligning with modern JavaScript development practices [1].

### 2.2 Bunx for Execution

`bunx` is a lightweight CLI tool that comes with the Bun runtime. It allows users to execute npm packages and their binaries on demand without requiring global installation [2].

- **Benefits:**
    - **Zero-Install Execution:** Users can run the MCP package directly using `bunx <package-name>`, simplifying the setup process significantly [2].
    - **Performance:** Bun is known for its high performance, which can lead to faster startup times and execution of the MCP server logic [3].
    - **TypeScript Support:** Bun has native TypeScript support, allowing direct execution of TypeScript files without a separate compilation step [4].

### 2.3 Stdio for Communication

Instead of HTTP/SSE, the MCP server will communicate with AI agents via standard input/output (stdio). This means the agent would spawn the MCP package as a child process and exchange messages over `stdin` and `stdout`.

- **Benefits:**
    - **Local-First:** Ideal for local AI agents or development environments where direct process communication is simpler and more efficient than network calls.
    - **Reduced Overhead:** Eliminates the need for network stacks, HTTP servers, and associated complexities, potentially reducing resource consumption.
    - **Security:** Communication is confined to the local machine, reducing the attack surface compared to an exposed HTTP endpoint.

### Data Flow (Revised)

1.  **User Setup:** User installs Bun and runs `bunx @your-org/ms-graph-mcp-package init` to configure their Microsoft application registration (Client ID, Tenant ID) and initiate the OAuth 2.0 Authorization Code Flow with PKCE. This step stores the refresh token securely on the local machine.
2.  **Agent Integration:** The AI agent is configured to spawn the MCP package (e.g., `bunx @your-org/ms-graph-mcp-package run`) and communicate with it via `stdin`/`stdout`.
3.  **Tool Execution:**
    - The AI agent sends an MCP request (JSON) to the package's `stdin`.
    - The package reads the request, retrieves the user's access token (refreshing if necessary), calls the Microsoft Graph API, and formats the response.
    - The result (JSON) is written to the package's `stdout`, which the AI agent then reads.

## 3. Authentication Flow (Local Context)

The authentication flow remains OAuth 2.0 Authorization Code Flow with PKCE, but adapted for a local CLI context.

1.  **Initial Authorization:** When the user runs `bunx @your-org/ms-graph-mcp-package init`:
    - The package opens a browser window to the Microsoft identity platform authorization endpoint.
    - The user logs in and grants consent for the requested scopes.
    - The redirect URI will be a custom URI scheme (e.g., `ms-graph-mcp://auth-callback`) or a local web server that the package temporarily spins up to capture the authorization code.
    - The package exchanges the authorization code for an access token and a refresh token.
2.  **Token Storage:** The refresh token is stored securely on the local machine, potentially using OS-specific credential managers or encrypted files, to minimize exposure.
3.  **Token Refresh:** When an access token expires, the package uses the stored refresh token to obtain a new access token silently.

## 4. Permission Transparency and User Control (Local Context)

While a web-based dashboard is no longer central, the principles of transparency and control can be maintained through CLI commands and local configuration.

- **CLI Commands:**
    - `bunx @your-org/ms-graph-mcp-package permissions`: Displays currently granted scopes and their status.
    - `bunx @your-org/ms-graph-mcp-package revoke`: Revokes the refresh token, disconnecting the package from the Microsoft account.
    - `bunx @your-org/ms-graph-mcp-package audit`: Shows a local log of API calls made by the package (if logging is enabled).
- **Configuration File:** A local configuration file (e.g., `~/.config/ms-graph-mcp.json`) can allow users to disable specific tools or scope categories.

## 5. Technical Challenges and Considerations

- **Cross-Platform Credential Storage:** Securely storing refresh tokens across different operating systems (Windows, macOS, Linux) requires careful implementation using platform-specific APIs or well-vetted libraries.
- **User Experience for Auth:** The initial OAuth flow needs to be as smooth as possible, handling browser redirects and code exchange gracefully within a CLI context.
- **Error Handling:** Robust error handling for API calls, token refreshes, and stdio communication is crucial for a reliable user experience.
- **Tool Mapping:** The mapping of Microsoft Graph APIs to MCP tools will need to be well-defined and potentially configurable.

## References

[1] JSR. *JSR: the JavaScript Registry*. Available at: https://jsr.io/
[2] Bun. *bunx*. Available at: https://bun.com/docs/pm/bunx
[3] Bun. *Bun*. Available at: https://bun.com/
[4] Bun. *Install TypeScript declarations for Bun*. Available at: https://bun.com/docs/guides/runtime/typescript
