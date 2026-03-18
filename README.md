<p align="center">
  <img src="./icon-512.png" alt="Microsoft Graph MCP Icon" width="150"/>
</p>

<h1 align="center">Microsoft Graph MCP Package</h1>

<p align="center">
  <b>Seamless Microsoft Graph Integration for AI Agents.</b>
</p>

A JSR-based TypeScript MCP (Model Context Protocol) package for personal Microsoft Graph access via CLI. This package enables AI agents to interact with personal Microsoft Graph APIs (Outlook, OneDrive, Calendar, etc.) through a local CLI interface.

## Overview

## Features

- **Local-First:** Prioritizes local execution and user data control.
- **Multi-Tenant Support:** Works with both personal Microsoft accounts and enterprise tenants.
- **Secure Authentication:** Implements OAuth 2.0 Authorization Code Flow with PKCE.
- **Secure Token Storage:** Uses OS-specific credential managers for token protection.
- **User Control:** Provides CLI commands for permission management and revocation.
- **MCP Standard:** Adheres to the Model Context Protocol for broad agent compatibility.

## Usage with Manus Agents

This package is designed to be integrated as a connection within the Manus UI, allowing AI agents to directly invoke its functionalities. It communicates via `stdio`, sending and receiving JSON payloads.

### Installation and Initialization

Before using the MCP CLI, you need to initialize it once to authenticate with your Microsoft account. This process will guide you through granting necessary permissions.

#### Using Bun (`bunx`)

```bash
bunx jsr @frustrated/ms-graph-mcp init
```

#### Using Deno (`deno run`)

```bash
deno run -A jsr:@frustrated/ms-graph-mcp init
```

#### Using Node.js (`npx`)

```bash
npx jsr @frustrated/ms-graph-mcp init
```

These commands will:
1.  Prompt you to authenticate with your Microsoft account (personal or organizational).
2.  Open your browser to the Microsoft identity platform.
3.  Grant consent for the requested scopes.
4.  Securely store your refresh token locally using `keytar`.

### Running the MCP Server

Once initialized, Manus agents will typically run the MCP server to interact with Microsoft Graph. The server listens for JSON requests on `stdin` and outputs JSON responses to `stdout`.

#### Using Bun (`bunx`)

```bash
bunx jsr @frustrated/ms-graph-mcp run
```

#### Using Deno (`deno run`)

```bash
deno run -A jsr:@frustrated/ms-graph-mcp run
```

#### Using Node.js (`npx`)

```bash
npx jsr @frustrated/ms-graph-mcp run
```

### Top-Level Tools

The Microsoft Graph MCP CLI exposes various top-level tools, each corresponding to a major Microsoft Graph service. AI agents can discover sub-tools within these categories as needed.

*   **`mail`**: Manage email communications (e.g., list messages, send messages).
*   **`calendar`**: Organize calendar events (e.g., create events, list events).
*   **`onedrive`**: Interact with OneDrive files and folders (e.g., list files, upload files).

For detailed information on specific tools and their functionalities, refer to the [Tools Documentation](./docs/tools/README.md).

### Managing Permissions

To view the currently configured Client ID, Tenant ID, and enabled/disabled tools:

#### Using Bun (`bunx`)

```bash
bunx jsr @frustrated/ms-graph-mcp permissions
```

#### Using Deno (`deno run`)

```bash
deno run -A jsr:@frustrated/ms-graph-mcp permissions
```

#### Using Node.js (`npx`)

```bash
npx jsr @frustrated/ms-graph-mcp permissions
```

### Revoking Access

To revoke the refresh token and disconnect the package from your Microsoft account:

#### Using Bun (`bunx`)

```bash
bunx jsr @frustrated/ms-graph-mcp revoke
```

#### Using Deno (`deno run`)

```bash
deno run -A jsr:@frustrated/ms-graph-mcp revoke
```

#### Using Node.js (`npx`)

```bash
npx jsr @frustrated/ms-graph-mcp revoke
```

## Documentation

- [Ideation Document](./docs/ms_graph_mcp_ideation.md) - Conceptual design and motivation.
- [Technical Specification](./docs/ms_graph_mcp_spec.md) - Detailed implementation guide.
- [Tools Documentation](./docs/tools/README.md) - Comprehensive guide to all available MCP tools.

## Security Considerations

- Refresh tokens are stored using OS-specific credential managers (Keychain on macOS, Credential Manager on Windows, Secret Service on Linux).
- All communication with Microsoft Graph is over HTTPS.
- Input validation is performed on all incoming MCP requests.
- Output from Microsoft Graph is sanitized before being passed to AI agents.

## License

MIT

## Contributing

Refer to the [CONTRIBUTING.md](./CONTRIBUTING.md) guide for details on how to contribute to this project.
