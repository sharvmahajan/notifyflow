import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from './jwt';

let io: Server;

export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error'));
    
    try {
      const decoded = verifyAccessToken(token) as any;
      socket.data.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    socket.join(userId);

    socket.on('disconnect', () => {
      // cleanup
    });
  });
};

export const emitToUser = (userId: string, event: string, payload: any) => {
  if (io) {
    io.to(userId).emit(event, payload);
  }
};
