const socketIO = require('socket.io');
const Room = require('../../models/Room');
const User = require('../../models/User');
const { v4: uuidv4 } = require('uuid');
const CustomError = require('./customError');
require('dotenv').config();

const userSocketMap = {};

function initWebSocket(httpServer) {
  const wsServer = socketIO(httpServer)

  wsServer.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        throw new Error("Authentication token is missing");
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      if (socket.currentRoom)
        throw new Error("Already joined different room");
      next();
    } catch (error) {
      console.error("Middleware error:", error.message);
      next(error);
    }
  });
  
  wsServer.on('connection', (socket) => {
    console.log('WebSocket connection established.');

    socket.on('join', async (roomId, password) => {
      try {
        const room = await Room.findById(roomId);

        if (!room)
          throw new CustomError("ROOM_001", "방이 존재하지 않습니다.");

        const isAlreadyParticipant = room.participants.find(
          (participant) => participant.userId === socket.userId
        );

        if (room.isPrivate) {
          if (!isAlreadyParticipant) {
            if (password === undefined)
              throw new CustomError("JOIN_001", "비밀번호를 입력하세요.");

            const isPasswordValid = bcrypt.compare(password, room.password);
            if (!isPasswordValid)
              throw new CustomError("JOIN_002", "비번 틀렸대요~");
          }
        }
        else {
          if (!isAlreadyParticipant) {
            room.participants.push({ userId:socket.userId, role: "Member" });
            await room.save();
          }
        }

        socket.join(roomId);
        userSocketMap[socket.userId] = socket.id;
        socket.currentRoom = roomId;

        const sender = makeChatUser(socket, roomId);

        wsServer.to(roomId).emit('welcome', {
          id: uuidv4,
          sender,
        });
        
      } catch (error) {
        console.error("socket join error: ", error.message);
        socket.emit('error', { code: error.code, message: error.message });
        socket.disconnect();
      }

      await sendRoomInfo(wsServer, socket, roomId);
    });

    socket.on('send-broadcast', async (content) => {
      try {
        const message = makeChatMessage(socket, socket.currentRoom, content);
        wsServer.to(socket.currentRoom).emit('new-message', message);

      } catch (error) {
        console.error("send-broadcast error", error.message);
        socket.emit('error', { code: error.code, message: error.message });
      }
    });

    socket.on('send-dm', (recipientId, content) => {
      try {
        const message = makeChatMessage(socket, socket.currentRoom, content);
        wsServer.to(userSocketMap[recipientId]).emit('new-message', message);

      } catch (error) {
        console.error("send-broadcast error", error.message);
        socket.emit('error', { code: error.code, message: error.message });
      }
    });

    socket.on('kick', (targetUserId) => {
      try {
        const targetSocket = userSocketMap[targetUserId];
        wsServer.to(targetSocket).emit();
      } catch (error) {
        console.error("kick error", error.message);
        socket.emit('error', { code: error.code, message: error.message });
      }
    });

    socket.on('disconnecting', () => {
      const sender = makeChatUser(socket, roomId);
      wsServer.to(socket.currentRoom).emit('bye', { 
        id: uuidv4,
        sender,
      });
    });

    socket.on('disconnect', () => {
      console.log('WebSocket connection closed.');
    });
  });

  return wsServer;
}

async function sendRoomInfo(wsServer, socket, roomId) {
  try {
    const socketsInRoom = wsServer.sockets.adapter.rooms.get(roomId);
    if (!socketsInRoom) throw new CustomError("ROOM_001", "웁스! 방이 없네요.");

    for (const socketId of socketsInRoom) {
      const socket = wsServer.sockets.sockets.get(socketId);
      if (!socket) continue;

      const roomInfo = await getRoomInfo(roomId, socket.userId);

      socket.emit('room-info', roomInfo);
    }

  } catch (error) {
    console.error(`Failed to send room info for room ${roomId}:`, error.message);
    socket.emit('error', { code: error.code, message: error.message });
    if (error.code === "ROOM_001") socket.disconnect();
  }
};

const getRoomInfo = async (roomId, userId) => {
  const room = await Room.findById(roomId).lean();
  if (!room) throw new CustomError("ROOM_001", "웁스! 방이 없네요.");

  const members = await Promise.all(
    room.participants.map(async (participant) => {
      const user = await User.findById(participant.userId).lean();
      if (!uesr) return null;
      return {
        id: user._id.toString(),
        username: user.name,
        profileImage: user.profileImage,
        isHost: participant.role === "Host",
      };
    })
  );

  return {
    roomId: room._id.toString(),
    title: room.title,
    description: room.description,
    user: members.find((member) => member.id === userId), // 현재 유저 정보
    members: members.filter((member) => member.id !== userId), // 나 제외한 멤버들
  };
};

async function makeChatUser(socket, roomId) {
  const user = await User.findById(socket.userId);
  if (!user) throw new CustomError("USER_001", "없는 유저입니다. 누구세요...?");

  const room = await Room.findById(roomId);
  if (!room) throw new CustomError("ROOM_001", "웁스! 방이 없네요.");
  
  const participant = room.participants.find((p) => p.userId === socket.userId);
  if (!participant) throw new CustomError("PTC_001", "이 방에 등록되지 않은 유저입니다.");

  const chatUser = {
    id: user._id,
    username: user.name,
    isHost: participant.role === 'Host',
  }

  return chatUser;
}

async function makeChatMessage(socket, roomId, content) {
  const user = await User.findById(socket.userId);
  if (!user) throw new CustomError("USER_001", "없는 유저입니다. 누구세요...?");

  const room = await Room.findById(roomId);
  if (!room) throw new CustomError("ROOM_001", "웁스! 방이 없네요.");
  
  const participant = room.participants.find((p) => p.userId === socket.userId);
  if (!participant) throw new CustomError("PTC_001", "이 방에 등록되지 않은 유저입니다.");

  const chatUser = {
    id: user._id,
    username: user.name,
    isHost: participant.role === 'Host',
  }

  const message = {
    id: uuidv4(),
    sender: chatUser,
    content,
    isPrivate: room.isPrivate,
    timestamp: new Date(),
  }
  
  return message;
}

module.exports = initWebSocket;