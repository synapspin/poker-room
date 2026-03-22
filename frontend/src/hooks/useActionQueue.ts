import { useRef, useCallback, useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';

interface QueuedAction {
  action: string;
  amount?: number;
  seq: number;
  timestamp: number;
}

export function useActionQueue(
  socket: Socket | null,
  connected: boolean,
  currentTableId: string | null,
) {
  const queueRef = useRef<QueuedAction[]>([]);
  const seqRef = useRef(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastAck, setLastAck] = useState<{ seq: number; success: boolean } | null>(null);

  // Listen for acks
  useEffect(() => {
    if (!socket) return;

    const handleAck = (data: { seq: number | null; serverSeq: number; success: boolean }) => {
      if (data.seq !== null) {
        // Remove acked action from queue
        queueRef.current = queueRef.current.filter(a => a.seq !== data.seq);
        setPendingCount(queueRef.current.length);
        setLastAck({ seq: data.seq, success: data.success });
      }
    };

    const handleReplayResult = (data: { results: { seq: number; success: boolean; reason?: string }[] }) => {
      // Clear all replayed actions from queue
      const replayedSeqs = new Set(data.results.map(r => r.seq));
      queueRef.current = queueRef.current.filter(a => !replayedSeqs.has(a.seq));
      setPendingCount(queueRef.current.length);
    };

    socket.on('game:action:ack', handleAck);
    socket.on('game:action:replay:result', handleReplayResult);

    return () => {
      socket.off('game:action:ack', handleAck);
      socket.off('game:action:replay:result', handleReplayResult);
    };
  }, [socket]);

  // Replay queue on reconnect
  useEffect(() => {
    if (!socket || !connected || !currentTableId) return;

    if (queueRef.current.length > 0) {
      console.log(`Replaying ${queueRef.current.length} queued actions`);
      socket.emit('game:action:replay', {
        tableId: currentTableId,
        actions: queueRef.current,
      });
    }
  }, [socket, connected, currentTableId]);

  const enqueueAction = useCallback((action: string, amount?: number) => {
    if (!currentTableId) return;

    const seq = ++seqRef.current;
    const entry: QueuedAction = {
      action,
      amount,
      seq,
      timestamp: Date.now(),
    };

    if (socket?.connected) {
      // Send immediately and track
      socket.emit('game:action', { tableId: currentTableId, action, amount, seq });
      queueRef.current.push(entry);
      setPendingCount(queueRef.current.length);
    } else {
      // Buffer for replay
      queueRef.current.push(entry);
      setPendingCount(queueRef.current.length);
    }
  }, [socket, currentTableId]);

  const clearQueue = useCallback(() => {
    queueRef.current = [];
    setPendingCount(0);
    seqRef.current = 0;
  }, []);

  return {
    enqueueAction,
    clearQueue,
    pendingCount,
    lastAck,
    hasPending: pendingCount > 0,
  };
}
