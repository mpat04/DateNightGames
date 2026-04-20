import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const rooms = new Map();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('create-room', (gameType, callback) => {
    const roomId = uuidv4().substring(0, 6).toUpperCase();
    rooms.set(roomId, {
      id: roomId,
      gameType,
      players: [socket.id],
      gameState: null
    });
    socket.join(roomId);
    console.log(`Room ${roomId} created for ${gameType}`);
    callback({ roomId });
  });

  socket.on('join-room', (roomId, callback) => {
    const room = rooms.get(roomId.toUpperCase());
    if (!room) {
      callback({ error: 'Room not found' });
      return;
    }
    if (room.players.length >= 2) {
      callback({ error: 'Room is full' });
      return;
    }
    room.players.push(socket.id);
    socket.join(roomId);
    io.to(roomId).emit('room-ready', { gameType: room.gameType });
    callback({ success: true, gameType: room.gameType });
  });

  socket.on('game-move', (data) => {
    socket.to(data.roomId).emit('opponent-move', data.move);
  });

  socket.on('game-action', (data) => {
    socket.to(data.roomId).emit('game-action', data.action);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    for (const [roomId, room] of rooms.entries()) {
      if (room.players.includes(socket.id)) {
        io.to(roomId).emit('player-left');
        rooms.delete(roomId);
        break;
      }
    }
  });
});

server.listen(3001, () => {
  console.log('Server running on http://localhost:3001');
});
