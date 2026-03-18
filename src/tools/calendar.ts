import { Client } from '@microsoft/microsoft-graph-client';
import { log, error } from '../utils.ts';

export async function createEvent(graphClient: Client, input: {
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  content?: string;
  attendees?: Array<{ emailAddress: string; type: 'required' | 'optional' }>;
  location?: string;
}): Promise<any> {
  try {
    const event = {
      subject: input.subject,
      start: input.start,
      end: input.end,
      body: input.content ? { contentType: 'HTML', content: input.content } : undefined,
      attendees: input.attendees?.map(att => ({
        emailAddress: { address: att.emailAddress },
        type: att.type,
      })),
      location: input.location ? { displayName: input.location } : undefined,
    };

    const response = await graphClient.api('/me/events').post(event);
    log(`Created calendar event: ${response.subject} (ID: ${response.id})`);
    return {
      id: response.id,
      webLink: response.webLink,
      status: 'created',
    };
  } catch (err: any) {
    error('Error creating calendar event:', err);
    return {
      id: null,
      webLink: null,
      status: 'failed',
      errorMessage: err.message,
    };
  }
}
