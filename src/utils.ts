import { promises as fs } from 'node:fs';
import * as path from 'node:path';

export function log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
}

export function error(message: string, err?: Error) {
  log(message, 'error');
  if (err) {
    console.error(err);
  }
}

export function warn(message: string) {
  log(message, 'warn');
}

// Placeholder for future file-based logging or other utilities
