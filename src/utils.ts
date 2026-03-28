import { promises as fs } from 'node:fs';
import * as path from 'node:path';

export function log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
  const timestamp = new Date().toISOString();
  // Use stderr so diagnostic output never corrupts the MCP stdio channel
  process.stderr.write(`[${timestamp}] [${level.toUpperCase()}] ${message}\n`);
}

export function error(message: string, err?: Error) {
  log(message, 'error');
  if (err) {
    process.stderr.write(String(err) + '\n');
  }
}

export function warn(message: string) {
  log(message, 'warn');
}

// Placeholder for future file-based logging or other utilities
