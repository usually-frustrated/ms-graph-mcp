# MCP smoke testing

This guide shows how to test `ms-graph-mcp` as a raw MCP server over `stdio`, without wiring it into another AI app first.

The goal is to verify three things:

1. The process starts cleanly.
2. The MCP handshake succeeds.
3. `tools/list` and at least one `tools/call` work end to end.

## What to expect

When the server runs in MCP mode, `stdout` must remain reserved for protocol messages only. Human-readable logs should go to `stderr`.

If you see plain text on `stdout`, the MCP framing is broken.

## Prerequisites

1. Authenticate once:

```bash
bun run src/index.ts init
```

2. Confirm the server can start:

```bash
bun run src/index.ts run
```

## Manual smoke test with the MCP SDK

The easiest direct test is to use the official MCP SDK from a short Bun script.

Create a temporary file such as `scripts/mcp-smoke-test.ts` with the following contents:

```ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'bun',
  args: ['run', 'src/index.ts', 'run'],
});

const client = new Client(
  {
    name: 'mcp-smoke-test',
    version: '1.0.0',
  },
  {
    capabilities: {},
  },
);

await client.connect(transport);

const tools = await client.listTools();
console.log(JSON.stringify(tools, null, 2));

// Pick one tool that is enabled in your config.
// Example: mail.list_messages
const result = await client.callTool({
  name: 'mail.list_messages',
  arguments: { top: 1 },
});

console.log(JSON.stringify(result, null, 2));
await client.close();
```

Run it with:

```bash
bun run scripts/mcp-smoke-test.ts
```

## What to verify

- `listTools()` returns the registered tools you expect.
- `callTool()` returns a successful result object.
- The server does not print protocol text to `stderr` or `stdout` outside the MCP response stream.
- A bad input should fail with a clear validation or Graph error instead of an opaque transport error.

## Quick debug checks

- If `listTools()` is empty, confirm tool gating in `~/.ms-graph-mcp/config.json`.
- If a tool call returns `401`, re-run `bun run src/index.ts init`.
- If a tool call returns `400`, inspect the request payload for invalid dates, missing required fields, or malformed OneDrive paths.
