# Mail Tools

This document details the sub-tools available under the `mail` top-level tool. These tools allow interaction with the user's Microsoft 365 mailbox.

## `mail.list_messages`

Lists messages from the user's mailbox.

### Parameters

*   `folderId` (string, optional): The ID of the mail folder to retrieve messages from. If not provided, defaults to the inbox (`/me/messages`).
*   `top` (number, optional): The maximum number of messages to return in the response.
*   `filter` (string, optional): An OData filter query to apply to the messages (e.g., `isRead eq false`).

### Returns

An object containing:
*   `messages` (array): A list of message objects, each containing:
    *   `id` (string): The unique identifier of the message.
    *   `subject` (string): The subject of the message.
    *   `from` (object): Information about the sender.
    *   `receivedDateTime` (string): The date and time the message was received.
    *   `isRead` (boolean): Indicates whether the message has been read.
    *   `bodyPreview` (string): A short preview of the message body.
    *   `webLink` (string): A URL to open the message in Outlook Web App.
*   `nextLink` (string, optional): A URL to retrieve the next page of messages, if available.
