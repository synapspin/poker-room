import { Injectable } from '@nestjs/common';
import { GameState, GamePhase } from '../game/poker-engine';

export interface TableInfo {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  smallBlind: number;
  bigBlind: number;
  phase: GamePhase;
}

@Injectable()
export class LobbyService {
  private tables = new Map<string, GameState>();
  private tableCounter = 0;

  createTable(name: string, smallBlind: number, bigBlind: number, maxPlayers: number): GameState {
    const id = `table_${++this.tableCounter}`;
    const state: GameState = {
      tableId: id,
      phase: 'waiting',
      communityCards: [],
      pot: 0,
      players: [],
      currentPlayerIndex: 0,
      dealerIndex: -1,
      smallBlind,
      bigBlind,
      currentBet: 0,
    };
    this.tables.set(id, state);
    return state;
  }

  getTable(id: string): GameState | undefined {
    return this.tables.get(id);
  }

  listTables(): TableInfo[] {
    return [...this.tables.values()].map(t => ({
      id: t.tableId,
      name: `Table ${t.tableId.split('_')[1]}`,
      playerCount: t.players.length,
      maxPlayers: 6,
      smallBlind: t.smallBlind,
      bigBlind: t.bigBlind,
      phase: t.phase,
    }));
  }

  removePlayerFromAllTables(playerId: string): string[] {
    const affectedTables: string[] = [];
    for (const [id, table] of this.tables) {
      const idx = table.players.findIndex(p => p.playerId === playerId);
      if (idx !== -1) {
        table.players.splice(idx, 1);
        affectedTables.push(id);
        if (table.players.length === 0) {
          this.tables.delete(id);
        }
      }
    }
    return affectedTables;
  }
}
