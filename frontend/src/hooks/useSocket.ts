// useSocket — manages Socket.IO connection lifecycle

import { useEffect, useRef, useState } from 'react';
import socket from '../services/socket';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export function useSocket() {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const connectedRef = useRef(false);

  useEffect(() => {
    if (connectedRef.current) return;
    connectedRef.current = true;

    setStatus('connecting');
    socket.connect();

    const handleConnect = () => setStatus('connected');
    const handleDisconnect = () => setStatus('disconnected');
    const handleConnectError = () => setStatus('error');

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
    };
  }, []);

  return { socket, status };
}
