import { Client } from '@microsoft/microsoft-graph-client';
import { log, error } from '../utils.ts';

export async function listMessages(graphClient: Client, input: { folderId?: string; top?: number; filter?: string }): Promise<any> {
  try {
    let request = graphClient.api(input.folderId ? `/me/mailFolders/${input.folderId}/messages` : 
'/me/messages');

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
    throw err;
  }
}
