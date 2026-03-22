import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const BACKEND_URL = 'http://localhost:3005';
const USER_ID_KEY = 'poker_room_userId';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  useEffect(() => {
    const socket = io(BACKEND_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setReconnecting(false);
      setReconnectAttempt(0);

      // Try to reconnect with saved userId
      const savedUserId = localStorage.getItem(USER_ID_KEY);
      if (savedUserId) {
        socket.emit('player:reconnect', { userId: savedUserId });
      }
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.io.on('reconnect_attempt', (attempt) => {
      setReconnecting(true);
      setReconnectAttempt(attempt);
    });

    socket.io.on('reconnect_failed', () => {
      setReconnecting(false);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const saveUserId = useCallback((userId: string) => {
    localStorage.setItem(USER_ID_KEY, userId);
  }, []);

  const clearUserId = useCallback(() => {
    localStorage.removeItem(USER_ID_KEY);
  }, []);

  return {
    socket: socketRef.current,
    connected,
    reconnecting,
    reconnectAttempt,
    saveUserId,
    clearUserId,
  };
}
