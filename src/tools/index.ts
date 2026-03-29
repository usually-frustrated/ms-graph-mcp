import * as mail from './mail.ts';
import * as calendar from './calendar.ts';
import * as onedrive from './onedrive.ts';

export const tools = {
  'mail.list_messages': mail.listMessages,
  'calendar.create_event': calendar.createEvent,
  'onedrive.list_items': onedrive.listItems,
  'onedrive.get_item': onedrive.getItem,
  'onedrive.search_items': onedrive.searchItems,
  'onedrive.create_folder': onedrive.createFolder,
};
