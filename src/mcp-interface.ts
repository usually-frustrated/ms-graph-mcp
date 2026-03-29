import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { getAccessToken } from './auth.ts';
import { isToolEnabled } from './config.ts';
import { log } from './utils.ts';
import { Client } from '@microsoft/microsoft-graph-client';
import * as mail from './tools/mail.ts';
import * as calendar from './tools/calendar.ts';
import * as onedrive from './tools/onedrive.ts';

function buildGraphClient(accessToken: string): Client {
  return Client.init({
    authProvider: (done) => done(null, accessToken),
  });
}

export async function startMcpServer(): Promise<void> {
  const server = new McpServer({
    name: 'ms-graph-mcp',
    version: '0.1.11',
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

  if (isToolEnabled('onedrive.list_items')) {
    server.tool(
      'onedrive.list_items',
      'List files and folders from OneDrive root or a specific folder',
      {
        folderPath: z.string().trim().optional().describe('Folder path relative to OneDrive root, e.g. /Projects'),
        itemId: z.string().trim().optional().describe('Drive item ID to list children from'),
        top: z.number().int().min(1).max(999).optional().describe('Maximum number of items to return'),
        select: z.string().trim().optional().describe('Optional OData $select clause'),
      },
      async (input) => {
        const token = await getAccessToken();
        const result = await onedrive.listItems(buildGraphClient(token), input);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    );
  }

  if (isToolEnabled('onedrive.get_item')) {
    server.tool(
      'onedrive.get_item',
      'Get metadata for a OneDrive file or folder by path or item ID',
      {
        path: z.string().trim().optional().describe('Item path relative to OneDrive root, e.g. /Projects/report.docx'),
        itemId: z.string().trim().optional().describe('Drive item ID'),
        select: z.string().trim().optional().describe('Optional OData $select clause'),
      },
      async (input) => {
        const token = await getAccessToken();
        const result = await onedrive.getItem(buildGraphClient(token), input);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    );
  }

  if (isToolEnabled('onedrive.search_items')) {
    server.tool(
      'onedrive.search_items',
      'Search OneDrive for files and folders',
      {
        query: z.string().trim().min(1).describe('Search query'),
        top: z.number().int().min(1).max(999).optional().describe('Maximum number of items to return'),
        select: z.string().trim().optional().describe('Optional OData $select clause'),
      },
      async (input) => {
        const token = await getAccessToken();
        const result = await onedrive.searchItems(buildGraphClient(token), input);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    );
  }

  if (isToolEnabled('onedrive.create_folder')) {
    server.tool(
      'onedrive.create_folder',
      'Create a folder in OneDrive root or under a specific parent',
      {
        name: z.string().trim().min(1).describe('Folder name'),
        parentPath: z.string().trim().optional().describe('Parent folder path relative to OneDrive root'),
        parentItemId: z.string().trim().optional().describe('Parent drive item ID'),
      },
      async (input) => {
        const token = await getAccessToken();
        const result = await onedrive.createFolder(buildGraphClient(token), input);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  log('MCP server started (JSON-RPC 2.0 over stdio). Listening for commands...');
}
