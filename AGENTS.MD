# Agent Evaluation: `run` Command & MCP Server

## Summary

This document records a code-level evaluation of the `run` command and the MCP server implementation in `src/mcp-interface.ts`.

- **v0.1.8 → v0.1.9:** Three bugs were identified and fixed (all tools blocked, stdout pollution from startup banner and diagnostic logging).
- **v0.1.9 → v0.1.10:** Migrated from a custom line-delimited JSON protocol to the official [`@modelcontextprotocol/sdk`](https://www.npmjs.com/package/@modelcontextprotocol/sdk) with `StdioServerTransport`, making the server compatible with standard MCP clients.

---

## Protocol Design (v0.1.10+)

The server now uses the **official MCP SDK** (`@modelcontextprotocol/sdk` v1.28+) with `StdioServerTransport`. This implements the JSON-RPC 2.0 framing and MCP protocol negotiation that standard clients (Claude Desktop, Cursor, etc.) expect.

Tool inputs are validated with [Zod](https://zod.dev) schemas. The `tools/list` discovery endpoint is provided automatically by the SDK. A proper `initialize` handshake is handled by the transport layer.

> **Note on `mcp-lite`:** `mcp-lite` (Fiberplane) was considered but is HTTP+SSE only and does not support stdio transport. It is not suitable for a CLI-launched server that communicates over `stdin`/`stdout`.

---

## Bugs Found and Fixed (v0.1.8 → v0.1.9)

### Bug 1 — Critical: `isToolEnabled` always returned `false` (all tools blocked)

**File:** `src/config.ts`

**Root cause:** The default `enabledTools` config value is an empty array (`[]`). The original implementation of `isToolEnabled` simply called `Array.includes()` against that empty array, which always returns `false`. Every incoming tool call was rejected with `TOOL_DISABLED`, making the server completely non-functional out of the box.

The `permissions` command even acknowledged the correct intent with the message *"No specific tools are explicitly enabled in config. All available tools will be used."* — but the code did not implement that intent.

**Fix applied:**

```typescript
// src/config.ts
export function isToolEnabled(toolName: string): boolean {
  // Empty enabledTools means all tools are enabled (no explicit restriction)
  if (appConfig.enabledTools.length === 0) {
    return true;
  }
  return appConfig.enabledTools.includes(toolName);
}
```

---

### Bug 2 — High: Startup `console.log` wrote to stdout, corrupting the MCP channel

**File:** `src/index.ts` (the `run` command action)

**Root cause:** The `run` command action contained:
```typescript
console.log("MCP server started. Listening for commands on stdin...");
```
`console.log` writes to `stdout`, the same channel the protocol uses. Any JSON parser on the client side would fail to parse this plain-text line as a JSON response. This banner was also redundant — `startMcpServer()` already emitted its own log on startup.

**Fix applied:** The `console.log` line was removed from the `run` action.

---

### Bug 3 — High: All diagnostic logging went to stdout, corrupting the MCP channel

**File:** `src/utils.ts`

**Root cause:** The `log()` utility used `console.log()`, which writes to `stdout`. Every diagnostic message emitted by tool handlers, auth code, or the server itself during a session would appear on the same channel as protocol JSON, causing clients to receive unparseable interleaved text.

**Fix applied:**

```typescript
// src/utils.ts
export function log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
  const timestamp = new Date().toISOString();
  // Use stderr so diagnostic output never corrupts the MCP stdio channel
  process.stderr.write(`[${timestamp}] [${level.toUpperCase()}] ${message}\n`);
}

export function error(message: string, err?: Error) {
  log(message, 'error');
  if (err) {
    process.stderr.write(String(err) + '\n');
  }
}
```

---

## Migration to Official SDK (v0.1.9 → v0.1.10)

**File:** `src/mcp-interface.ts`

**Motivation:** The original custom protocol was incompatible with standard MCP clients. Replacing it with `@modelcontextprotocol/sdk` + `StdioServerTransport` gains:

- **Standard JSON-RPC 2.0 framing** — clients like Claude Desktop work out of the box.
- **Automatic `tools/list` discovery** — clients can enumerate available tools without out-of-band documentation.
- **`initialize` handshake** — capability negotiation handled by the SDK.
- **Zod-validated inputs** — tool inputs are validated before handlers run.

**New dependencies:**

| Package | Version | Purpose |
|---|---|---|
| `@modelcontextprotocol/sdk` | `^1.28.0` | Official MCP server + StdioServerTransport |
| `zod` | `^3.24.2` | Input schema validation and type inference |

**After migration, `src/mcp-interface.ts` uses:**

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new McpServer({ name: 'ms-graph-mcp', version: '0.1.10' });

server.tool('mail_list_messages', '...', { /* zod schema */ }, async (input) => {
  // ... call Graph API, return { content: [{ type: 'text', text: '...' }] }
});

await server.connect(new StdioServerTransport());
```

---

## What Works Correctly

- **Auth integration:** `getAccessToken()` and Graph client initialization are correctly wired.
- **Tool handlers:** `mail_list_messages` and `calendar_create_event` implement the actual Graph API calls and are reused unchanged.
- **`init` / `revoke` / `permissions` commands:** These all operate independently of the stdio channel and work correctly.
- **`enabledTools` config:** When `enabledTools` is empty (default), all tools are registered. When it lists specific tool names, only those are registered.
- **Diagnostic logging:** All server-side logs go to `stderr`, keeping `stdout` clean for the protocol.

---

## Remaining Limitations

| Limitation | Detail |
|---|---|
| Auth required before `run` | If `~/.config/ms-graph-mcp/msal_cache.json` is absent, the server starts but every tool call fails at auth time. |
| Limited tool set | Only `mail_list_messages` and `calendar_create_event` are implemented. |
