import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { getAccessToken } from './auth.ts';
import { isToolEnabled } from './config.ts';
import { log } from './utils.ts';
import { Client } from '@microsoft/microsoft-graph-client';
import * as mail from './tools/mail.ts';
import * as calendar from './tools/calendar.ts';

function buildGraphClient(accessToken: string): Client {
  return Client.init({
    authProvider: (done) => done(null, accessToken),
  });
}

export async function startMcpServer(): Promise<void> {
  const server = new McpServer({
    name: 'ms-graph-mcp',
    version: '0.1.10',
  });

  if (isToolEnabled('mail.list_messages')) {
    server.tool(
      'mail.list_messages',
      'List email messages from the signed-in user\'s mailbox',
      {
        folderId: z.string().optional().describe('Mail folder ID (defaults to Inbox)'),
        top: z.number().int().min(1).optional().describe('Maximum number of messages to return'),
        filter: z.string().optional().describe('OData $filter expression'),
      },
      async ({ folderId, top, filter }) => {
        const token = await getAccessToken();
        const result = await mail.listMessages(buildGraphClient(token), { folderId, top, filter });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    );
  }

  if (isToolEnabled('calendar.create_event')) {
    server.tool(
      'calendar.create_event',
      'Create a new event in the signed-in user\'s calendar',
      {
        subject: z.string().describe('Event title'),
        start: z.object({
          dateTime: z.string().describe('ISO 8601 date-time string'),
          timeZone: z.string().describe('IANA timezone name, e.g. "America/New_York"'),
        }),
        end: z.object({
          dateTime: z.string().describe('ISO 8601 date-time string'),
          timeZone: z.string().describe('IANA timezone name'),
        }),
        content: z.string().optional().describe('HTML body of the event'),
        attendees: z.array(z.object({
          emailAddress: z.string().email(),
          type: z.enum(['required', 'optional']),
        })).optional().describe('List of attendees'),
        location: z.string().optional().describe('Event location display name'),
      },
      async (input) => {
        const token = await getAccessToken();
        const result = await calendar.createEvent(buildGraphClient(token), input);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  log('MCP server started (JSON-RPC 2.0 over stdio). Listening for commands...');
}
