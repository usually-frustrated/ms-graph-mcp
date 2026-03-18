# Calendar Tools

This document details the sub-tools available under the `calendar` top-level tool. These tools allow interaction with the user's Microsoft 365 calendar.

## `calendar.create_event`

Creates a new event in the user's calendar.

### Parameters

*   `subject` (string, required): The subject of the event.
*   `start` (object, required): The start date and time of the event.
    *   `dateTime` (string, required): The date and time in ISO 8601 format (e.g., `2026-03-20T09:00:00`).
    *   `timeZone` (string, required): The time zone of the start time (e.g., `America/Los_Angeles`).
*   `end` (object, required): The end date and time of the event.
    *   `dateTime` (string, required): The date and time in ISO 8601 format (e.g., `2026-03-20T10:00:00`).
    *   `timeZone` (string, required): The time zone of the end time (e.g., `America/Los_Angeles`).
*   `content` (string, optional): The body content of the event, in HTML format.
*   `attendees` (array of objects, optional): A list of attendees for the event.
    *   Each object contains:
        *   `emailAddress` (string, required): The email address of the attendee.
        *   `type` (string, required): The attendee type, either `required` or `optional`.
*   `location` (string, optional): The display name of the event location.

### Returns

An object containing:
*   `id` (string): The unique identifier of the created event.
*   `webLink` (string): A URL to open the event in Outlook Web App.
*   `status` (string): The status of the event creation, either `created` or `failed`.
*   `errorMessage` (string, optional): An error message if the event creation failed.
