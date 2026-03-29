import { Client } from '@microsoft/microsoft-graph-client';
import { log, error, describeGraphError } from '../utils.ts';

function assertValidEventTimeRange(start: { dateTime: string; timeZone: string }, end: { dateTime: string; timeZone: string }): void {
  const startDate = new Date(start.dateTime);
  const endDate = new Date(end.dateTime);

  if (Number.isNaN(startDate.getTime())) {
    throw new Error(`Invalid start.dateTime value: ${start.dateTime}`);
  }
  if (Number.isNaN(endDate.getTime())) {
    throw new Error(`Invalid end.dateTime value: ${end.dateTime}`);
  }
  if (endDate.getTime() <= startDate.getTime()) {
    throw new Error('Event end time must be after the start time.');
  }
  if (!start.timeZone.trim() || !end.timeZone.trim()) {
    throw new Error('Both start.timeZone and end.timeZone are required.');
  }
}

export async function createEvent(graphClient: Client, input: {
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  content?: string;
  attendees?: Array<{ emailAddress: string; type: 'required' | 'optional' }>;
  location?: string;
}): Promise<any> {
  try {
    assertValidEventTimeRange(input.start, input.end);

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
    throw new Error(`Failed to create calendar event: ${describeGraphError(err)}`);
  }
}
