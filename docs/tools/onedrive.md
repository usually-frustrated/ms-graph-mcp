# OneDrive Tools

This document details the sub-tools available under the `onedrive` top-level tool.

## `onedrive_list_items`

Lists files and folders from OneDrive root or a specific folder.

### Parameters

* `folderPath` (string, optional): A folder path relative to OneDrive root, such as `/Projects`.
* `itemId` (string, optional): A drive item ID whose children should be listed.
* `top` (number, optional): Maximum number of items to return.
* `select` (string, optional): Optional OData `$select` clause.

## `onedrive_get_item`

Gets metadata for a OneDrive file or folder.

### Parameters

* `path` (string, optional): Item path relative to OneDrive root, such as `/Projects/report.docx`.
* `itemId` (string, optional): Drive item ID.
* `select` (string, optional): Optional OData `$select` clause.

## `onedrive_search_items`

Searches OneDrive for files and folders.

### Parameters

* `query` (string, required): Search query.
* `top` (number, optional): Maximum number of items to return.
* `select` (string, optional): Optional OData `$select` clause.

## `onedrive_create_folder`

Creates a folder in OneDrive root or under a specific parent folder.

### Parameters

* `name` (string, required): Folder name.
* `parentPath` (string, optional): Parent folder path relative to OneDrive root.
* `parentItemId` (string, optional): Parent drive item ID.
