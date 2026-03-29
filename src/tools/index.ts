import * as mail from './mail.ts';
import * as calendar from './calendar.ts';
import * as onedrive from './onedrive.ts';

export const tools = {
  mail_list_messages: mail.listMessages,
  calendar_create_event: calendar.createEvent,
  onedrive_list_items: onedrive.listItems,
  onedrive_get_item: onedrive.getItem,
  onedrive_search_items: onedrive.searchItems,
  onedrive_create_folder: onedrive.createFolder,
};
