import { Client } from '@microsoft/microsoft-graph-client';
import { log, error, describeGraphError } from '../utils.ts';

const WELL_KNOWN_FOLDERS = new Map<string, string>([
  ['inbox', 'inbox'],
  ['sent', 'sentitems'],
  ['sentitems', 'sentitems'],
  ['drafts', 'drafts'],
  ['deleted', 'deleteditems'],
  ['deleteditems', 'deleteditems'],
  ['archive', 'archive'],
  ['junk', 'junkemail'],
  ['junkemail', 'junkemail'],
  ['outbox', 'outbox'],
]);

function normalizeFolderId(folderId?: string): string | undefined {
  if (!folderId) {
    return undefined;
  }

  const trimmed = folderId.trim();
  if (!trimmed) {
    return undefined;
  }

  return WELL_KNOWN_FOLDERS.get(trimmed.toLowerCase()) ?? trimmed;
}

export async function listMessages(graphClient: Client, input: { folderId?: string; top?: number; filter?: string }): Promise<any> {
  try {
    const folderId = normalizeFolderId(input.folderId);
    let request = graphClient.api(folderId ? `/me/mailFolders/${folderId}/messages` : '/me/messages');

    if (input.top) {
      request = request.top(input.top);
    }
    if (input.filter) {
      request = request.filter(input.filter);
    }

    const response = await request.select('id,subject,from,receivedDateTime,isRead,bodyPreview,webLink').get();
    log(`Listed ${response.value.length} messages.`);
    return {
      messages: response.value.map((msg: any) => ({
        id: msg.id,
        subject: msg.subject,
        from: msg.from,
        receivedDateTime: msg.receivedDateTime,
        isRead: msg.isRead,
        bodyPreview: msg.bodyPreview,
        webLink: msg.webLink,
      })),
      nextLink: response['@odata.nextLink'],
    };
  } catch (err: any) {
    error('Error listing messages:', err);
    throw new Error(`Failed to list messages: ${describeGraphError(err)}`);
  }
}
