<p align="center">
  <img src="./icon-512.png" alt="Microsoft Graph MCP Icon" width="150"/>
</p>

<h1 align="center">Microsoft Graph MCP Package</h1>

<p align="center">
  <b>Seamless Microsoft Graph Integration for AI Agents.</b>
</p>

A TypeScript MCP (Model Context Protocol) package for personal Microsoft Graph access via CLI. This package enables AI agents to interact with personal Microsoft Graph APIs (Outlook, Calendar, etc.) through a local CLI interface.

## Overview

## Features

- **Local-First:** Prioritizes local execution and user data control.
- **Multi-Tenant Support:** Works with both personal Microsoft accounts and enterprise tenants.
- **Secure Authentication:** Implements OAuth 2.0 Authorization Code Flow with PKCE.
- **Secure Token Storage:** Stores the MSAL token cache at `~/.config/ms-graph-mcp/msal_cache.json` with restricted file permissions (`0600`).
- **User Control:** Provides CLI commands for permission management and revocation.
- **MCP Standard:** Adheres to the Model Context Protocol for broad agent compatibility.

## Usage with Manus Agents

This package is designed to be integrated as a connection within the Manus UI, allowing AI agents to directly invoke its functionalities. It communicates via `stdio`, sending and receiving JSON payloads.

### Installation and Initialization

Before using the MCP CLI, you need to initialize it once to authenticate with your Microsoft account. This process will guide you through granting necessary permissions.

```bash
bunx --bun @frustrated/ms-graph-mcp init
```

This will:

1. Start a local HTTP server to receive the OAuth callback.
2. Print an authentication URL — open it in your browser to sign in.
3. Grant consent for the requested scopes.
4. Save the MSAL token cache to `~/.config/ms-graph-mcp/msal_cache.json`.

### Running the MCP Server

Once initialized, Manus agents will typically run the MCP server to interact with Microsoft Graph. The server listens for JSON requests on `stdin` and outputs JSON responses to `stdout`.

```bash
bunx --bun @frustrated/ms-graph-mcp run
```

### Top-Level Tools

The Microsoft Graph MCP CLI exposes the following tools:

- **`mail`**: Manage email communications (e.g., list messages).
- **`calendar`**: Organize calendar events (e.g., create events).

For detailed information on specific tools and their functionalities, refer to the [Tools Documentation](./docs/tools/README.md).

### Managing Permissions

To view the currently configured Client ID, Tenant ID, and enabled/disabled tools:

```bash
bunx --bun @frustrated/ms-graph-mcp permissions
```

### Revoking Access

To revoke authentication and clear all stored tokens:

```bash
bunx --bun @frustrated/ms-graph-mcp revoke
```

## Documentation

- [Ideation Document](./docs/ms_graph_mcp_ideation.md) - Conceptual design and motivation.
- [Technical Specification](./docs/ms_graph_mcp_spec.md) - Detailed implementation guide.
- [Tools Documentation](./docs/tools/README.md) - Comprehensive guide to all available MCP tools.

## Security Considerations

- The MSAL token cache is stored at `~/.config/ms-graph-mcp/msal_cache.json` with `0600` permissions (owner read/write only).
- All communication with Microsoft Graph is over HTTPS.
- Input validation is performed on all incoming MCP requests.
- Output from Microsoft Graph is sanitized before being passed to AI agents.

## License

MIT

## Contributing

Refer to the [CONTRIBUTING.md](./CONTRIBUTING.md) guide for details on how to contribute to this project.
