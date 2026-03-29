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

export function describeGraphError(err: unknown): string {
  if (err instanceof Error) {
    const parts: string[] = [err.message];
    const graphErr = err as Error & {
      code?: string;
      statusCode?: number;
      body?: { error?: { code?: string; message?: string } };
      response?: { status?: number; body?: { error?: { code?: string; message?: string } } };
    };

    const status = graphErr.statusCode ?? graphErr.response?.status;
    const code = graphErr.code ?? graphErr.body?.error?.code ?? graphErr.response?.body?.error?.code;
    const message = graphErr.body?.error?.message ?? graphErr.response?.body?.error?.message;

    if (status) {
      parts.unshift(`HTTP ${status}`);
    }
    if (code) {
      parts.push(`code=${code}`);
    }
    if (message && message !== err.message) {
      parts.push(message);
    }

    return parts.join(' | ');
  }

  return String(err);
}
