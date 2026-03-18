import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

const CONFIG_DIR = path.join(os.homedir(), '.ms-graph-mcp');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

interface AppConfig {
  clientId: string;
  tenantId: string;
  enabledTools: string[]; // List of tool names that are enabled
}

let appConfig: AppConfig = {
  clientId: process.env.MS_GRAPH_CLIENT_ID || 'YOUR_CENTRALIZED_CLIENT_ID_HERE', // Default centralized client ID
  tenantId: 'common',
  enabledTools: [],
};

export async function loadConfig(): Promise<AppConfig> {
  try {
    const configContent = await fs.readFile(CONFIG_FILE, 'utf-8');
    appConfig = { ...appConfig, ...JSON.parse(configContent) };
  } catch (error) {
    // If file doesn't exist or is invalid, use default config
    console.warn('No existing config found or config file is invalid. Using default configuration.');
  }
  return appConfig;
}

export async function saveConfig(newConfig: Partial<AppConfig>): Promise<void> {
  appConfig = { ...appConfig, ...newConfig };
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(CONFIG_FILE, JSON.stringify(appConfig, null, 2));
}

export function getConfig(): AppConfig {
  return appConfig;
}

export function isToolEnabled(toolName: string): boolean {
  return appConfig.enabledTools.includes(toolName);
}

// Initialize config on module load
loadConfig();
