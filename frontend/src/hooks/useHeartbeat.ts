import { useEffect, useState, useRef } from 'react';
import { Socket } from 'socket.io-client';

const HEARTBEAT_INTERVAL = 5_000; // 5 seconds

export type ConnectionQuality = 'stable' | 'unstable' | 'disconnected';

export function useHeartbeat(socket: Socket | null, connected: boolean) {
  const [quality, setQuality] = useState<ConnectionQuality>('disconnected');
  const [latency, setLatency] = useState(0);
  const pingTimeRef = useRef(0);

  useEffect(() => {
    if (!socket || !connected) {
      setQuality('disconnected');
      return;
    }

    const sendHeartbeat = () => {
      pingTimeRef.current = Date.now();
      socket.emit('heartbeat');
    };

    const handleAck = (data: { quality: ConnectionQuality; serverTime: number }) => {
      const rtt = Date.now() - pingTimeRef.current;
      setLatency(rtt);
      setQuality(data.quality);
    };

    socket.on('heartbeat:ack', handleAck);

    // Send first heartbeat immediately
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    return () => {
      clearInterval(interval);
      socket.off('heartbeat:ack', handleAck);
    };
  }, [socket, connected]);

  return { quality, latency };
}
