const WebSocket = require('ws');
const handleChat = require('./chat');
const handleSignaling = require('./signaling');

function initWebSocket(server) {
  const wss = new WebSocket.Server({ server });

  wss.on('connection', (ws, req) => {
    console.log('WebSocket connection established.');

    ws.on('message', (message) => {
      const data = JSON.parse(message);

      // 메시지 타입에 따라 로직 분리
      switch (data.type) {
        case 'chat':
          handleChat(ws, wss, data);
          break;
        case 'signaling':
          handleSignaling(ws, wss, data);
          break;
        default:
          console.error('Unknown WebSocket message type:', data.type);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed.');
    });
  });

  return wss;
}

module.exports = initWebSocket;
