const socketIO = require('socket.io');
const Room = require('../../models/Room');
const User = require('../../models/User');
const jwtService = require('../services/jwtService');
const { v4: uuidv4 } = require('uuid');
const CustomError = require('./customError');
require('dotenv').config();

const roomSockets = {};

function initWebSocket(httpServer) {
  const wsServer = socketIO(httpServer, {
    cors: {
      origin: ["http://localhost:3000"],
      methods: ["GET", "POST"],
      transports: ['websocket', 'polling'],
      credentials: true
    }
  });

  wsServer.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        throw new Error("Authentication token is missing");
      }
      const decoded = jwtService.verifyToken(token, process.env.JWT_SECRET);
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

    socket.on('join', async (data) => {
      const roomId = data.roomId;
      const password = data.password;

      try {
        const room = await Room.findById(roomId);

        if (!room)
          throw new CustomError("ROOM_001", "방이 존재하지 않습니다.");

        isBlockedUser(room, socket.userId);

        const isAlreadyParticipant = room.participants.find(
          (participant) => participant.userId === socket.userId
        );

        if (!isAlreadyParticipant) {
          if (room.isPrivate) {
            if (password === undefined)
              throw new CustomError("JOIN_001", "비밀번호를 입력하세요.");

            const isPasswordValid = bcrypt.compare(password, room.password);
            if (!isPasswordValid)
              throw new CustomError("JOIN_002", "비번 틀렸대요~");
          }
        }

        const numSockets = await wsServer.in(roomId).allSockets().size;
        if (numSockets >= 4)
          throw new CustomError("JOIN_004", "정원 초과입니다.");
        
        room.participants.push({ userId:socket.userId, role: "Member" });
        await room.save();

        socket.join(roomId);
        const curRoom = roomSockets[roomId] || [];
        const participant = room.participants.find((p) => p.userId === socket.userId);
        curRoom.push({
          userId: socket.userId,
          socketId: socket.id,
          joinedAt: new Date(),
          isHost: participant.role === 'Host'
        });
        roomSockets[roomId] = curRoom;
        socket.currentRoom = roomId;

        makeChatUser(socket, roomSockets[roomId]).then((data) => {
          wsServer.to(roomId).emit('welcome', {
            id: uuidv4(),
            sender: data,
          });
        }).catch((error) => {
          throw error;
        });

        const members = await Promise.all(
          curRoom.map(async (participant) => {
            const user = await User.findById(participant.userId).lean();
            if (!user || user._id === socket.userId) return null;
            return {
              id: user._id.toString(),
              username: user.name,
              profileImage: user.profileImage,
              isHost: participant.isHost,
            };
          })
        );
        socket.emit('connect-members', members);
        socket.to(roomId).emit('new-user', socket.userId);
        
      } catch (error) {
        console.error("socket join error: ", error.message);
        socket.emit('error', { code: error.code, message: error.message });
        socket.disconnect();
      }

      await sendRoomInfo(wsServer, roomId);
      await sendParticipantsInfo(wsServer, roomId);
    });

    socket.on('send-broadcast', async (data) => {
      try {
        const message = await makeChatMessage(socket, socket.currentRoom, data.content);
        wsServer.to(socket.currentRoom).emit('new-message', message);

      } catch (error) {
        console.error("send-broadcast error", error.message);
        socket.emit('error', { code: error.code, message: error.message });
      }
    });

    socket.on('send-dm', async (data) => {
      try {
        const recipientId = data.recipientId;
        const content = data.content;
        const message = await makeChatMessage(socket, socket.currentRoom, content);
        const recipient = roomSockets[socket.currentRoom].find((p) => p.userId === recipientId);
        socket.to(recipient.socketId).emit('new-message', message);

      } catch (error) {
        console.error("send-broadcast error", error.message);
        socket.emit('error', { code: error.code, message: error.message });
      }
    });

    socket.on('kick', async (targetUserId) => {
      try {
        const me = roomSockets[socket.currentRoom].find((p) => p.userId === socket.userId);
        if (!me.isHost)
          throw new CustomError("USER_002", "You are not a host.");
        
        const target = roomSockets[socket.currentRoom].find((p) => p.userId === targetUserId);

        const result = await Room.updateOne(
          { _id: socket.currentRoom },
          {
            $push: { blocked: { userId: targetUserId } }, // 차단 리스트 추가
            $pull: { participants: { userId: targetUserId } } // 참가자 목록에서 제거
          }
        );
        if (result.matchedCount === 0)
          throw new CustomError("ROOM_001", "해당 방을 찾을 수 없습니다.");
        if (result.modifiedCount === 0)
          throw new CustomError("USER_003", "해당 유저를가 이미 차단되었거나 참가자 목록에 없습니다."); 
        
        socket.to(target.socketId).emit('kicked');

      } catch (error) {
        console.error("kick error", error.message);
        socket.emit('error', { code: error.code, message: error.message });
      }
    });

    socket.on('offer', (offer) => {
      try {
        const room = roomSockets[socket.currentRoom];
        if (!room) throw new CustomError("ROOM_001", "웁스! 방이 없네요.");
    
        for (const user of room) {
          if (user.userId === socket.userId) continue;    
          socket.to(user.socketId).emit('offer', {
            offer: offer,
            senderId: socket.userId,
          });
        }

      } catch (error) {
        console.error("offer error", error.message);
        socket.emit('error', { code: error.code, message: error.message });
      }
    });

    socket.on('answer', (data) => {
      try {
        const target = roomSockets[socket.currentRoom].find((p) => p.userId === data.targetId);
        socket.to(target.socketId).emit('answer', {
          answer: data.answer,
          senderId: socket.userId,
        });

      } catch (error) {
        console.error("answer error", error.message);
        socket.emit('error', { code: error.code, message: error.message });
      }
    });

    socket.on('ICE', (data) => {
      try {
        const target = roomSockets[socket.currentRoom].find((p) => p.userId === data.targetId);
        socket.to(target.socketId).emit('ICE', {
          ice: data.ice,
          senderId: socket.userId,
        });

      } catch (error) {
        console.error("ICE error", error.message);
        socket.emit('error', { code: error.code, message: error.message });
      }
    });

    socket.on('disconnecting', async () => {
      try {
        const room = roomSockets[socket.currentRoom];
        if (!room) throw new CustomError("ROOM_001", "방이 없습니다.");
        
        const user = room.find((p) => p.userId === socket.userId);
        const userIndex = room.findIndex((p) => p.userId === socket.userId);
        if (!user || userIndex === -1) throw new CustomError("USER_003", "참여자 목록에 없습니다.");
        
        const userModel = await User.findById(socket.userId);
        if (!userModel) throw new CustomError("USER_001", "없는 유저입니다. 누구세요...?");
        
        const inTime = (new Date() - user.joinedAt)/1000;
        const earnExp = Number((inTime / Math.pow(3*3600, userModel.level+1) * 100).toFixed(2));
        console.log("earnExp: ", earnExp);

        userModel.exp += earnExp;
        if (userModel.exp >= 100) {
          userModel.level += 1;
          userModel.exp = user.exp + Number(earnExp) - 100;
        }
        await userModel.save();
        
        
        makeChatUser(socket, room).then((data) => {
          wsServer.to(socket.currentRoom).emit('bye', { 
            id: uuidv4(),
            sender: data,
          });
        }).then(() => {
          socket.to(socket.currentRoom).emit('disconnect-member', socket.userId);
          room.splice(userIndex, 1);
        }).catch((error) => {
          throw error;
        });
        
      } catch (error) {
        console.error("disconnecting error", error.message);
        socket.emit('error', { code: error.code, message: error.message });
      }
    });

    socket.on('disconnect', async () => {
      await sendParticipantsInfo(wsServer, socket.currentRoom);
      console.log('WebSocket connection closed.');
    });
  });

  return wsServer;
}

async function sendRoomInfo(wsServer, roomId) {
  try {
    const room = roomSockets[roomId];
    if (!room) throw new CustomError("ROOM_001", "웁스! 방이 없네요.");
    const roomModel = await Room.findById(roomId).lean();

    const roomInfo = {
      roomId: roomModel._id.toString(),
      title: roomModel.title,
      description: roomModel.description,
    }
    wsServer.to(roomId).emit('room-info', roomInfo);

  } catch (error) {
    console.error(`Failed to send room info for room ${roomId}:`, error.message);
    wsServer.to(roomId).emit('error', { code: error.code, message: error.message });
    // if (error.code === "ROOM_001") socket.disconnect();
  }
};

async function sendParticipantsInfo(wsServer, roomId) {
  try {
    const room = roomSockets[roomId];
    console.log("room: ", room);

    const members = await Promise.all(
      room.map(async (participant) => {
        const user = await User.findById(participant.userId);
        console.log("user: ", user);
        if (!user) return null;
        return {
          id: user._id.toString(),
          username: user.name,
          profileImage: user.profileImage,
          isHost: participant.isHost,
        };
      })
    );
    console.log("members: ", members);

    for (const user of room) {
      const me = members.find((member) => member.id === user.userId);
      const others = members.filter((member) => member.id !== user.userId);
      console.log("me: ", me);
      console.log("others: ", others);
      wsServer.to(user.socketId).emit('participants-info', {
        user: me,
        members: others,
      });
    }

  } catch(error) {
    console.error(`Failed to send participants info for room ${roomId}:`, error.message);
    wsServer.to(roomId).emit('error', { code: error.code, message: error.message });
  }
};

async function makeChatUser(socket, room) {
  const user = await User.findById(socket.userId);
  if (!user) throw new CustomError("USER_001", "없는 유저입니다. 누구세요...?");

  const me = room.find((p) => p.userId === socket.userId);

  const chatUser = {
    id: user._id,
    username: user.name,
    isHost: me.isHost,
  }
  return chatUser;
}

async function makeChatMessage(socket, roomId, content) {
  const user = await User.findById(socket.userId);
  if (!user) throw new CustomError("USER_001", "없는 유저입니다. 누구세요...?");

  const room = await Room.findById(roomId);
  if (!room) throw new CustomError("ROOM_001", "웁스! 방이 없네요.");
  
  const me = roomSockets[roomId].find((p) => p.userId === socket.userId);

  const chatUser = {
    id: user._id,
    username: user.name,
    isHost: me.isHost,
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

async function isBlockedUser(room, userId) {
  const isBlocked = room.blocked.find((p) => p.userId === userId);
  if (isBlocked)
    throw new CustomError("JOIN_003", "감히 쫓겨난 녀석이 대문을 두드리느냐");
}

module.exports = initWebSocket;