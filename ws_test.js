const WebSocket = require('ws');
const url = 'wss://musical-palm-tree-69x6xrx4ppp725q7v-3000.app.github.dev/api/voice/live?token=af2aa82bc42f7e0ee05f9715ea5b745d8196211c6e3c98c5a6acf928a7f9bb90';
const ws = new WebSocket(url);

ws.on('open', () => {
  console.log('WS_STATUS: OPEN');
  ws.close();
});

ws.on('close', (code, reason) => {
  console.log('WS_STATUS: CLOSED', { code, reason: reason.toString() });
});

ws.on('error', (err) => {
  console.log('WS_STATUS: ERROR', err.message);
});

setTimeout(() => {
  console.log('WS_STATUS: TIMEOUT');
  process.exit(1);
}, 10000);
