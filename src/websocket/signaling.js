function handleSignaling(ws, wss, data) {
    const { roomId, signalData, userId } = data;
  
    // 특정 방에 연결된 사용자에게 시그널 데이터 전송
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && client !== ws) {
        client.send(
          JSON.stringify({
            type: 'signaling',
            roomId,
            userId,
            signalData,
          })
        );
      }
    });
  }
  
  module.exports = handleSignaling;  