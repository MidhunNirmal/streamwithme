// Socket.IO client singleton — shared across the whole app

import { io, Socket } from 'socket.io-client';

// Connect to VITE_BACKEND_URL environment variable if set, otherwise fallback to the current page origin
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || window.location.origin;

export const socket: Socket = io(BACKEND_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  extraHeaders: {
    'ngrok-skip-browser-warning': 'true',
  },
});

/**
 * Ensures socket is connected BEFORE emitting.
 * Fixes the race condition where socket.emit() was called immediately
 * after socket.connect() before the handshake completed.
 */
export function connectAndEmit(
  event: string,
  payload: object,
  callback: (res: any) => void,
  timeoutMs = 8000
): void {
  let settled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const cleanup = () => {
    if (timer) clearTimeout(timer);
    socket.off('connect', onConnect);
    socket.off('connect_error', onConnectError);
  };

  const finish = (res: any) => {
    if (settled) return;
    settled = true;
    cleanup();
    callback(res);
  };

  const emit = () => {
    timer = setTimeout(() => {
      finish({
        success: false,
        error: 'No response from server. Make sure the backend is running on port 3001.',
      });
    }, timeoutMs);

    socket.emit(event, payload, (res: any) => {
      finish(res);
    });
  };

  const onConnect = () => emit();
  const onConnectError = (err: Error) => {
    finish({
      success: false,
      error: `Cannot reach backend: ${err.message}. Is the backend running? Run: cd backend && npm run dev`,
    });
  };

  if (socket.connected) {
    emit();
  } else {
    socket.once('connect', onConnect);
    socket.once('connect_error', onConnectError);
    if (!socket.active) socket.connect();
  }
}

export default socket;
