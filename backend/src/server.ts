// Main server entry point — Express + Socket.IO

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import apiRouter from './routes/api';
import { registerSocketHandlers } from './socket/handlers';

const PORT = parseInt(process.env.PORT || '3001', 10);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Allow localhost, local network IPs, and ngrok tunnels
const isAllowedOrigin = (origin: string | undefined): boolean => {
  if (!origin) return true; // allow tool/non-browser requests
  if (origin === FRONTEND_URL) return true;
  if (origin.startsWith('http://localhost:')) return true;
  if (origin.startsWith('http://127.0.0.1:')) return true;
  if (origin.endsWith('.ngrok-free.app')) return true;
  if (origin.endsWith('.ngrok.io')) return true;
  return false;
};

const app = express();

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(null, false); // Reject silently instead of throwing uncaught error
    }
  },
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
  credentials: true
}));
app.use(express.json());

// ─── REST Routes ──────────────────────────────────────────────────────────────
app.use('/api', apiRouter);

// ─── HTTP Server ──────────────────────────────────────────────────────────────
const httpServer = createServer(app);

// ─── Socket.IO ────────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['ngrok-skip-browser-warning'],
    credentials: true,
  },
  // Enable larger payloads for WebRTC signaling
  maxHttpBufferSize: 1e7, // 10 MB
  pingTimeout: 60000,
  pingInterval: 25000,
});

io.on('connection', (socket) => {
  console.log(`[Server] Client connected: ${socket.id} (total: ${io.engine.clientsCount})`);
  registerSocketHandlers(io, socket);
});

// ─── Start ────────────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`\n🎬 StreamWithMe backend running on http://localhost:${PORT}`);
  console.log(`   CORS allowed from: ${FRONTEND_URL}`);
  console.log(`   API: http://localhost:${PORT}/api/health\n`);
});

export { io };
