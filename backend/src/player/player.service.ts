import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

export interface Player {
  userId: string;          // persistent UUID
  socketId: string;        // current socket (changes on reconnect)
  name: string;
  chips: number;
  disconnected: boolean;
  disconnectedAt: number | null;
}

@Injectable()
export class PlayerService {
  private bySocket = new Map<string, Player>();   // socketId → Player
  private byUserId = new Map<string, Player>();    // userId → Player

  register(socketId: string, name: string): Player {
    const player: Player = {
      userId: randomUUID(),
      socketId,
      name,
      chips: 1000,
      disconnected: false,
      disconnectedAt: null,
    };
    this.bySocket.set(socketId, player);
    this.byUserId.set(player.userId, player);
    return player;
  }

  get(socketId: string): Player | undefined {
    return this.bySocket.get(socketId);
  }

  getByUserId(userId: string): Player | undefined {
    return this.byUserId.get(userId);
  }

  markDisconnected(socketId: string): Player | undefined {
    const player = this.bySocket.get(socketId);
    if (player) {
      player.disconnected = true;
      player.disconnectedAt = Date.now();
      this.bySocket.delete(socketId);
    }
    return player;
  }

  reconnect(userId: string, newSocketId: string): Player | undefined {
    const player = this.byUserId.get(userId);
    if (!player) return undefined;

    // Remove old socket mapping if exists
    this.bySocket.delete(player.socketId);

    // Bind to new socket
    player.socketId = newSocketId;
    player.disconnected = false;
    player.disconnectedAt = null;
    this.bySocket.set(newSocketId, player);

    return player;
  }

  remove(userId: string): void {
    const player = this.byUserId.get(userId);
    if (player) {
      this.bySocket.delete(player.socketId);
      this.byUserId.delete(userId);
    }
  }

  removeBySocket(socketId: string): void {
    const player = this.bySocket.get(socketId);
    if (player) {
      this.bySocket.delete(socketId);
      this.byUserId.delete(player.userId);
    }
  }

  updateChips(userId: string, chips: number): void {
    const player = this.byUserId.get(userId);
    if (player) {
      player.chips = chips;
    }
  }

  // Cleanup stale disconnected players (> 10 min)
  purgeStale(): string[] {
    const cutoff = Date.now() - 10 * 60 * 1000;
    const purged: string[] = [];
    for (const [userId, player] of this.byUserId) {
      if (player.disconnected && player.disconnectedAt && player.disconnectedAt < cutoff) {
        this.byUserId.delete(userId);
        this.bySocket.delete(player.socketId);
        purged.push(userId);
      }
    }
    return purged;
  }
}
