import { Client } from '@microsoft/microsoft-graph-client';
import { error, log, describeGraphError } from '../utils.ts';

type DriveItem = {
  id: string;
  name: string;
  webUrl?: string;
  size?: number;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
  folder?: unknown;
  file?: unknown;
};

function trimLeadingSlash(value: string): string {
  return value.replace(/^\/+/, '');
}

function toRootPath(path: string): string {
  const normalized = trimLeadingSlash(path.trim());
  const segments = normalized
    .split('/')
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment));
  return `/${segments.join('/')}`;
}

function buildItemPath(itemId?: string, folderPath?: string): string {
  if (itemId) {
    return `/me/drive/items/${itemId}`;
  }

  if (folderPath) {
    return `/me/drive/root:${toRootPath(folderPath)}:`;
  }

  return '/me/drive/root';
}

function simplifyItem(item: DriveItem): Record<string, unknown> {
  return {
    id: item.id,
    name: item.name,
    webUrl: item.webUrl,
    size: item.size,
    createdDateTime: item.createdDateTime,
    lastModifiedDateTime: item.lastModifiedDateTime,
    isFolder: Boolean(item.folder),
    isFile: Boolean(item.file),
  };
}

export async function listItems(
  graphClient: Client,
  input: { folderPath?: string; itemId?: string; top?: number; select?: string },
): Promise<any> {
  try {
    const path = buildItemPath(input.itemId, input.folderPath);
    let request = graphClient.api(`${path}/children`);

    if (input.top) {
      request = request.top(input.top);
    }

    const select = input.select?.trim();
    const response = select
      ? await request.select(select).get()
      : await request.get();

    log(`Listed ${response.value.length} OneDrive items.`);
    return {
      items: response.value.map((item: DriveItem) => simplifyItem(item)),
      nextLink: response['@odata.nextLink'],
    };
  } catch (err: any) {
    error('Error listing OneDrive items:', err);
    throw new Error(`Failed to list OneDrive items: ${describeGraphError(err)}`);
  }
}

export async function getItem(
  graphClient: Client,
  input: { itemId?: string; path?: string; select?: string },
): Promise<any> {
  try {
    const path = buildItemPath(input.itemId, input.path);
    const select = input.select?.trim();
    const response = select
      ? await graphClient.api(path).select(select).get()
      : await graphClient.api(path).get();

    log(`Fetched OneDrive item: ${response.name ?? response.id}`);
    return simplifyItem(response);
  } catch (err: any) {
    error('Error retrieving OneDrive item:', err);
    throw new Error(`Failed to retrieve OneDrive item: ${describeGraphError(err)}`);
  }
}

export async function searchItems(
  graphClient: Client,
  input: { query: string; top?: number; select?: string },
): Promise<any> {
  try {
    let request = graphClient.api(`/me/drive/root/search(q='${input.query.replace(/'/g, "''")}')`);

    if (input.top) {
      request = request.top(input.top);
    }

    const select = input.select?.trim();
    const response = select
      ? await request.select(select).get()
      : await request.get();

    log(`Search returned ${response.value.length} OneDrive items.`);
    return {
      items: response.value.map((item: DriveItem) => simplifyItem(item)),
      nextLink: response['@odata.nextLink'],
    };
  } catch (err: any) {
    error('Error searching OneDrive items:', err);
    throw new Error(`Failed to search OneDrive items: ${describeGraphError(err)}`);
  }
}

export async function createFolder(
  graphClient: Client,
  input: { name: string; parentPath?: string; parentItemId?: string },
): Promise<any> {
  try {
    const parentPath = buildItemPath(input.parentItemId, input.parentPath);
    const response = await graphClient.api(`${parentPath}/children`).post({
      name: input.name,
      folder: {},
      '@microsoft.graph.conflictBehavior': 'rename',
    });

    log(`Created OneDrive folder: ${response.name} (ID: ${response.id})`);
    return simplifyItem(response);
  } catch (err: any) {
    error('Error creating OneDrive folder:', err);
    throw new Error(`Failed to create OneDrive folder: ${describeGraphError(err)}`);
  }
}
