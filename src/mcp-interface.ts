import { getAccessToken } from './auth';
import { getConfig, isToolEnabled } from './config';
import { error, log } from './utils';
import { Client } from '@microsoft/microsoft-graph-client';

// Define MCP message interfaces
interface McpRequest {
  type: 'request';
  id: string;
  tool: string;
  input: any;
}

interface McpResponse {
  type: 'response';
  id: string;
  status: 'success' | 'error';
  output?: any;
  error?: { code: string; message: string };
}

// Placeholder for registered tools
import { tools as registeredTools } from './tools';


async function processMcpRequest(request: McpRequest): Promise<McpResponse> {
  const config = getConfig();

  if (!isToolEnabled(request.tool)) {
    return {
      type: 'response',
      id: request.id,
      status: 'error',
      error: { code: 'TOOL_DISABLED', message: `Tool '${request.tool}' is disabled.` },
    };
  }

  const toolHandler = registeredTools[request.tool];
  if (!toolHandler) {
    return {
      type: 'response',
      id: request.id,
      status: 'error',
      error: { code: 'TOOL_NOT_FOUND', message: `Tool '${request.tool}' not found.` },
    };
  }

  try {
    const accessToken = await getAccessToken();
    const graphClient = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });

    const output = await toolHandler(graphClient, request.input);
    return {
      type: 'response',
      id: request.id,
      status: 'success',
      output,
    };
  } catch (err: any) {
    error(`Error executing tool '${request.tool}':`, err);
    return {
      type: 'response',
      id: request.id,
      status: 'error',
      error: { code: err.code || 'TOOL_EXECUTION_ERROR', message: err.message || 'An unknown error occurred.' },
    };
  }
}

export function startMcpServer() {
  log('MCP server started. Listening for commands on stdin...');

  process.stdin.setEncoding('utf8');

  let buffer = '';
  process.stdin.on('data', async (chunk) => {
    buffer += chunk;
    let newlineIndex;
    while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
      const line = buffer.substring(0, newlineIndex).trim();
      buffer = buffer.substring(newlineIndex + 1);

      if (line) {
        try {
          const request: McpRequest = JSON.parse(line);
          if (request.type === 'request' && request.id && request.tool) {
            const response = await processMcpRequest(request);
            process.stdout.write(JSON.stringify(response) + '\n');
          } else {
            error('Invalid MCP request format:', new Error(line));
            process.stdout.write(JSON.stringify({
              type: 'response',
              id: request.id || 'unknown',
              status: 'error',
              error: { code: 'INVALID_REQUEST', message: 'Invalid MCP request format.' },
            }) + '\n');
          }
        } catch (parseError: any) {
          error('Failed to parse stdin input as JSON:', parseError);
          process.stdout.write(JSON.stringify({
            type: 'response',
            id: 'unknown',
            status: 'error',
            error: { code: 'JSON_PARSE_ERROR', message: 'Invalid JSON input.' },
          }) + '\n');
        }
      }
    }
  });

  process.stdin.on('end', () => {
    log('Stdin closed. MCP server shutting down.');
  });

  process.stdin.on('error', (err) => {
    error('Stdin error:', err);
  });
}
