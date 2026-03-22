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
  waitlistCount: number;
}

@Injectable()
export class LobbyService {
  private tables = new Map<string, GameState>();
  private tableNames = new Map<string, string>();
  private waitlists = new Map<string, string[]>(); // tableId → playerId[]
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
    this.tableNames.set(id, name || `Table ${this.tableCounter}`);
    this.waitlists.set(id, []);
    return state;
  }

  getTable(id: string): GameState | undefined {
    return this.tables.get(id);
  }

  getTableName(id: string): string {
    return this.tableNames.get(id) || `Table ${id.split('_')[1]}`;
  }

  listTables(): TableInfo[] {
    return [...this.tables.values()].map(t => ({
      id: t.tableId,
      name: this.getTableName(t.tableId),
      playerCount: t.players.length,
      maxPlayers: 6,
      smallBlind: t.smallBlind,
      bigBlind: t.bigBlind,
      phase: t.phase,
      waitlistCount: this.getWaitlist(t.tableId).length,
    }));
  }

  // Waitlist management
  getWaitlist(tableId: string): string[] {
    return this.waitlists.get(tableId) || [];
  }

  addToWaitlist(tableId: string, playerId: string): { position: number; total: number } | null {
    if (!this.tables.has(tableId)) return null;
    let list = this.waitlists.get(tableId);
    if (!list) {
      list = [];
      this.waitlists.set(tableId, list);
    }
    if (!list.includes(playerId)) {
      list.push(playerId);
    }
    return { position: list.indexOf(playerId) + 1, total: list.length };
  }

  removeFromWaitlist(tableId: string, playerId: string): void {
    const list = this.waitlists.get(tableId);
    if (list) {
      const idx = list.indexOf(playerId);
      if (idx !== -1) list.splice(idx, 1);
    }
  }

  shiftWaitlist(tableId: string): string | null {
    const list = this.waitlists.get(tableId);
    if (list && list.length > 0) {
      return list.shift()!;
    }
    return null;
  }

  removePlayerFromAllWaitlists(playerId: string): void {
    for (const [, list] of this.waitlists) {
      const idx = list.indexOf(playerId);
      if (idx !== -1) list.splice(idx, 1);
    }
  }

  listAllGameStates(): GameState[] {
    return [...this.tables.values()];
  }

  removePlayerFromAllTables(playerId: string): string[] {
    this.removePlayerFromAllWaitlists(playerId);
    const affectedTables: string[] = [];
    for (const [id, table] of this.tables) {
      const idx = table.players.findIndex(p => p.playerId === playerId);
      if (idx !== -1) {
        table.players.splice(idx, 1);
        affectedTables.push(id);
        if (table.players.length === 0) {
          this.tables.delete(id);
          this.tableNames.delete(id);
          this.waitlists.delete(id);
        }
      }
    }
    return affectedTables;
  }
}
