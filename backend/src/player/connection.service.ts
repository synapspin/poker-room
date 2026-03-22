import { Injectable } from '@nestjs/common';

export const GRACE_PERIOD_MS = 60_000;       // 60 seconds to reconnect
export const SIT_OUT_TIMEOUT_MS = 180_000;   // 3 minutes sitting out before removal
export const TURN_TIMER_MS = 30_000;         // 30 seconds per turn
export const TURN_TIMER_DISCONNECTED_MS = 15_000; // 15 seconds if disconnected

// Heartbeat
export const HEARTBEAT_INTERVAL_MS = 5_000;  // Client pings every 5s
export const HEARTBEAT_TIMEOUT_MS = 15_000;  // 3 missed = soft disconnect
export const HEARTBEAT_HARD_TIMEOUT_MS = 90_000; // 90s silence = hard disconnect

export type ConnectionQuality = 'stable' | 'unstable' | 'disconnected';

interface HeartbeatState {
  lastPing: number;
  quality: ConnectionQuality;
  softDisconnectTimer?: NodeJS.Timeout;
}

@Injectable()
export class ConnectionService {
  private graceTimers = new Map<string, NodeJS.Timeout>();   // userId → timer
  private sitOutTimers = new Map<string, NodeJS.Timeout>();  // userId → timer
  private actionTimers = new Map<string, NodeJS.Timeout>();  // tableId → timer
  private heartbeats = new Map<string, HeartbeatState>();    // socketId → state

  // --- Heartbeat ---

  recordHeartbeat(socketId: string): ConnectionQuality {
    const now = Date.now();
    let state = this.heartbeats.get(socketId);

    if (!state) {
      state = { lastPing: now, quality: 'stable' };
      this.heartbeats.set(socketId, state);
    } else {
      const gap = now - state.lastPing;
      state.lastPing = now;

      // Determine quality based on gap
      if (gap < HEARTBEAT_INTERVAL_MS * 2.5) {
        state.quality = 'stable';
      } else if (gap < HEARTBEAT_TIMEOUT_MS) {
        state.quality = 'unstable';
      } else {
        state.quality = 'stable'; // recovered from disconnected
      }
    }

    // Cancel soft disconnect timer if one was running
    if (state.softDisconnectTimer) {
      clearTimeout(state.softDisconnectTimer);
      state.softDisconnectTimer = undefined;
    }

    return state.quality;
  }

  startSoftDisconnectTimer(socketId: string, callback: () => void): void {
    const state = this.heartbeats.get(socketId);
    if (state?.softDisconnectTimer) {
      clearTimeout(state.softDisconnectTimer);
    }

    const timer = setTimeout(callback, HEARTBEAT_TIMEOUT_MS);
    if (state) {
      state.softDisconnectTimer = timer;
    } else {
      this.heartbeats.set(socketId, {
        lastPing: Date.now(),
        quality: 'stable',
        softDisconnectTimer: timer,
      });
    }
  }

  getConnectionQuality(socketId: string): ConnectionQuality {
    const state = this.heartbeats.get(socketId);
    if (!state) return 'disconnected';

    const elapsed = Date.now() - state.lastPing;
    if (elapsed > HEARTBEAT_HARD_TIMEOUT_MS) return 'disconnected';
    if (elapsed > HEARTBEAT_TIMEOUT_MS) return 'unstable';
    return state.quality;
  }

  removeHeartbeat(socketId: string): void {
    const state = this.heartbeats.get(socketId);
    if (state?.softDisconnectTimer) {
      clearTimeout(state.softDisconnectTimer);
    }
    this.heartbeats.delete(socketId);
  }

  // --- Grace period ---

  startGraceTimer(userId: string, callback: () => void): void {
    this.cancelGraceTimer(userId);
    const timer = setTimeout(callback, GRACE_PERIOD_MS);
    this.graceTimers.set(userId, timer);
  }

  cancelGraceTimer(userId: string): void {
    const timer = this.graceTimers.get(userId);
    if (timer) {
      clearTimeout(timer);
      this.graceTimers.delete(userId);
    }
  }

  hasGraceTimer(userId: string): boolean {
    return this.graceTimers.has(userId);
  }

  // --- Sit-out ---

  startSitOutTimer(userId: string, callback: () => void): void {
    this.cancelSitOutTimer(userId);
    const timer = setTimeout(callback, SIT_OUT_TIMEOUT_MS);
    this.sitOutTimers.set(userId, timer);
  }

  cancelSitOutTimer(userId: string): void {
    const timer = this.sitOutTimers.get(userId);
    if (timer) {
      clearTimeout(timer);
      this.sitOutTimers.delete(userId);
    }
  }

  // --- Turn action timer ---

  startActionTimer(tableId: string, duration: number, callback: () => void): { startedAt: number; duration: number } {
    this.cancelActionTimer(tableId);
    const startedAt = Date.now();
    const timer = setTimeout(callback, duration);
    this.actionTimers.set(tableId, timer);
    return { startedAt, duration };
  }

  cancelActionTimer(tableId: string): void {
    const timer = this.actionTimers.get(tableId);
    if (timer) {
      clearTimeout(timer);
      this.actionTimers.delete(tableId);
    }
  }

  // --- Cleanup ---

  cleanupUser(userId: string): void {
    this.cancelGraceTimer(userId);
    this.cancelSitOutTimer(userId);
  }
}
