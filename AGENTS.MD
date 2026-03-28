# Agent Evaluation: `run` Command & MCP Server

## Summary

This document records a code-level evaluation of the `run` command and the MCP server implementation in `src/mcp-interface.ts`, performed against version `0.1.8`. Three bugs were identified and fixed in `0.1.9`.

---

## Protocol Design

The server uses a **custom line-delimited JSON protocol** over `stdio` — not the industry-standard [JSON-RPC 2.0](https://www.jsonrpc.org/specification) that the Model Context Protocol (MCP) specification requires. Each request is a single UTF-8 line:

```json
{ "type": "request", "id": "1", "tool": "mail.list_messages", "input": { "top": 10 } }
```

Each response is a single UTF-8 line:

```json
{ "type": "response", "id": "1", "status": "success", "output": { ... } }
```

**Implication:** Standard MCP clients (Claude Desktop, Cursor, etc.) that speak JSON-RPC 2.0 cannot connect to this server. The server is compatible only with clients that speak this custom protocol (e.g., Manus). The README documents this protocol correctly.

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

## What Works Correctly

- **Stdin framing:** Newline-delimited buffering handles partial chunks correctly.
- **Error handling:** Parse errors, unknown tools, and tool execution failures all produce well-formed error responses.
- **Auth integration:** `getAccessToken()` and Graph client initialization are correctly wired.
- **Tool registry:** `tools/index.ts` exports `mail.list_messages` and `calendar.create_event` with correct signatures.
- **`init` / `revoke` / `permissions` commands:** These all operate independently of the stdio channel and work correctly.

---

## Remaining Limitations (out of scope for this patch)

| Limitation | Detail |
|---|---|
| Custom protocol | Not JSON-RPC 2.0; incompatible with standard MCP clients. A future major version could add an `--mcp-standard` mode. |
| No `tools/list` introspection | Clients must know tool names out of band; there is no discovery mechanism. |
| No `initialize` handshake | Standard MCP requires a capability-negotiation round-trip before tool calls. |
| Auth required before `run` | If `~/.config/ms-graph-mcp/msal_cache.json` is absent, the server starts but every tool call fails. |
