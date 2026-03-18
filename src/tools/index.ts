import * as mail from './mail.ts';
import * as calendar from './calendar.ts';
// import * as onedrive from './onedrive'; // Placeholder for future tools

export const tools = {
  'mail.list_messages': mail.listMessages,
  'calendar.create_event': calendar.createEvent,
  // 'onedrive.list_files': onedrive.listFiles,
};
