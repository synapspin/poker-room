import { Injectable } from '@nestjs/common';

export interface Player {
  id: string; // socket id
  name: string;
  chips: number;
}

@Injectable()
export class PlayerService {
  private players = new Map<string, Player>();

  register(socketId: string, name: string): Player {
    const player: Player = {
      id: socketId,
      name,
      chips: 1000,
    };
    this.players.set(socketId, player);
    return player;
  }

  get(socketId: string): Player | undefined {
    return this.players.get(socketId);
  }

  remove(socketId: string): void {
    this.players.delete(socketId);
  }

  updateChips(socketId: string, chips: number): void {
    const player = this.players.get(socketId);
    if (player) {
      player.chips = chips;
    }
  }
}
