import './src/lib/env-bootstrap';

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { parse } from 'url';
import { pathToFileURL } from 'url';

import next from 'next';
import { WebSocketServer } from 'ws';

import { handleVoiceLiveSocket } from './src/lib/voice/live-bridge';

const EXPO_LOCAL_ORIGIN_PATTERN = /^http:\/\/(?:localhost|127\.0\.0\.1):(?:808\d|19006)$/;

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT || 3000);

function isAllowedApiOrigin(origin: string) {
  if (EXPO_LOCAL_ORIGIN_PATTERN.test(origin)) {
    return true;
  }

  const codespaceName = process.env.CODESPACE_NAME;
  const forwardingDomain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;

  if (!codespaceName || !forwardingDomain) {
    return false;
  }

  const escapedCodespaceName = codespaceName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedForwardingDomain = forwardingDomain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^https://${escapedCodespaceName}-(808\\d|19006)\.${escapedForwardingDomain}$`);

  return pattern.test(origin);
}

function applyApiCors(req: IncomingMessage, res: ServerResponse<IncomingMessage>): boolean {
  const origin = req.headers.origin;
  const pathname = req.url ? parse(req.url).pathname : null;

  if (!origin || !pathname?.startsWith('/api/') || !isAllowedApiOrigin(origin)) {
    return false;
  }

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return true;
  }

  return false;
}

export async function startServer() {
  const app = next({
    dev,
    hostname,
    port,
    // The custom WebSocket server needs webpack in development. Turbopack's
    // HMR stream can dispatch refresh actions before the App Router mounts.
    webpack: dev,
  });

  await app.prepare();

  const handle = app.getRequestHandler();
  const upgradeHandler = app.getUpgradeHandler();

  const liveBridgeServer = new WebSocketServer({ noServer: true });
  const server = createServer((req, res) => {
    if (applyApiCors(req, res)) {
      return;
    }

    const parsedUrl = parse(req.url || '/', true);
    void handle(req, res, parsedUrl);
  });

  liveBridgeServer.on('connection', (socket, request) => {
    void handleVoiceLiveSocket(socket, request);
  });

  server.on('upgrade', async (request, socket, head) => {
    try {
      const pathname = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`).pathname;

      if (pathname === '/api/voice/live') {
        liveBridgeServer.handleUpgrade(request, socket, head, (client) => {
          liveBridgeServer.emit('connection', client, request);
        });
        return;
      }

      await upgradeHandler(request, socket, head);
    } catch (error) {
      socket.destroy();
      console.error('Upgrade request failed:', error);
    }
  });

  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
}

const isDirectExecution = process.argv[1]
  ? pathToFileURL(process.argv[1]).href === import.meta.url
  : false;

if (process.env.RUN_CUSTOM_SERVER === '1' || isDirectExecution) {
  startServer().catch((error) => {
    console.error('Failed to start custom server:', error);
    process.exit(1);
  });
}
