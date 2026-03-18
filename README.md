# Microsoft Graph MCP Package

A JSR-based TypeScript MCP (Model Context Protocol) package for personal Microsoft Graph access via CLI. This package enables AI agents to interact with personal Microsoft Graph APIs (Outlook, OneDrive, Calendar, etc.) through a local CLI interface.

## Features

- **Local-First:** Prioritizes local execution and user data control.
- **Multi-Tenant Support:** Works with both personal Microsoft accounts and enterprise tenants.
- **Secure Authentication:** Implements OAuth 2.0 Authorization Code Flow with PKCE.
- **Secure Token Storage:** Uses OS-specific credential managers for token protection.
- **User Control:** Provides CLI commands for permission management and revocation.
- **MCP Standard:** Adheres to the Model Context Protocol for broad agent compatibility.

## Installation

Install Bun first (if not already installed):

```bash
curl -fsSL https://bun.sh/install | bash
```

Then, clone the repository and install dependencies:

```bash
git clone <repository-url>
cd ms-graph-mcp
bun install
```

## Quick Start

### Initialize Authentication

```bash
bunx @manus/ms-graph-mcp init
```

This command will:
1. Prompt you to authenticate with your Microsoft account (personal or organizational).
2. Open your browser to the Microsoft identity platform.
3. Grant consent for the requested scopes.
4. Securely store your refresh token locally.

### Run the MCP Server

```bash
bunx @manus/ms-graph-mcp run
```

The MCP server will start and listen for requests on `stdin`, communicating with AI agents via `stdout`.

### Manage Permissions

```bash
bunx @manus/ms-graph-mcp permissions
```

Displays the currently configured Client ID, Tenant ID, and enabled/disabled tools.

### Revoke Access

```bash
bunx @manus/ms-graph-mcp revoke
```

Revokes the refresh token and disconnects the package from your Microsoft account.

## Development

### Project Structure

```
/ms-graph-mcp
├── src/
│   ├── index.ts             # Main entry point for CLI commands
│   ├── auth.ts              # OAuth 2.0 flow and token management
│   ├── config.ts            # Local configuration management
│   ├── tools/               # MCP tool implementations
│   │   ├── mail.ts          # Outlook Mail API tools
│   │   ├── calendar.ts      # Outlook Calendar API tools
│   │   ├── onedrive.ts      # OneDrive API tools
│   │   └── index.ts         # Tool registry
│   ├── mcp-interface.ts     # MCP message formats and stdio communication
│   └── utils.ts             # Utility functions
├── docs/                    # Documentation and specifications
├── package.json
├── jsr.json
├── tsconfig.json
└── README.md
```

### Running in Development

```bash
bun run dev
```

### Type Checking

```bash
bun run typecheck
```

### Building for Distribution

```bash
bun run build
```

## Documentation

- [Ideation Document](./docs/ms_graph_mcp_ideation.md) - Conceptual design and motivation.
- [Technical Specification](./docs/ms_graph_mcp_spec.md) - Detailed implementation guide.

## Security Considerations

- Refresh tokens are stored using OS-specific credential managers (Keychain on macOS, Credential Manager on Windows, Secret Service on Linux).
- All communication with Microsoft Graph is over HTTPS.
- Input validation is performed on all incoming MCP requests.
- Output from Microsoft Graph is sanitized before being passed to AI agents.

## License

MIT

## Contributing

Contributions are welcome. Please open an issue or submit a pull request.
