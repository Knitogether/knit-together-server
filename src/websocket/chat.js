function handleChat(ws, wss, data) {
    const { roomId, message, userId } = data;
  
    // 방에 있는 모든 사용자에게 채팅 메시지 브로드캐스트
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            type: 'chat',
            roomId,
            userId,
            message,
          })
        );
      }
    });
  }
  
  module.exports = handleChat;  