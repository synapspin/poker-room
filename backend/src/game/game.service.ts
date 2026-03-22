import { Injectable } from '@nestjs/common';
import { PokerEngine, GameState, ActionType } from './poker-engine';
import { LobbyService } from '../lobby/lobby.service';

@Injectable()
export class GameService {
  private engine = new PokerEngine();

  constructor(private lobbyService: LobbyService) {}

  joinTable(tableId: string, playerId: string, playerName: string, chips: number): GameState | null {
    const table = this.lobbyService.getTable(tableId);
    if (!table) return null;
    if (table.players.length >= 6) return null;
    if (table.players.find(p => p.playerId === playerId)) return table;

    table.players.push({
      playerId,
      name: playerName,
      chips,
      cards: [],
      bet: 0,
      totalBet: 0,
      folded: false,
      allIn: false,
      acted: false,
      disconnected: false,
      sittingOut: false,
    });

    // Remove from waitlist if was waiting
    this.lobbyService.removeFromWaitlist(tableId, playerId);

    return table;
  }

  leaveTable(tableId: string, playerId: string): GameState | null {
    const table = this.lobbyService.getTable(tableId);
    if (!table) return null;

    const idx = table.players.findIndex(p => p.playerId === playerId);
    if (idx !== -1) {
      table.players.splice(idx, 1);
    }
    return table;
  }

  startGame(tableId: string): GameState | null {
    const table = this.lobbyService.getTable(tableId);
    if (!table) return null;
    const activePlayers = table.players.filter(p => !p.sittingOut);
    if (activePlayers.length < 2) return null;
    return this.engine.initGame(table);
  }

  processAction(tableId: string, playerId: string, action: ActionType, amount?: number): GameState | null {
    const table = this.lobbyService.getTable(tableId);
    if (!table) return null;
    return this.engine.processAction(table, playerId, action, amount);
  }

  getTable(tableId: string): GameState | undefined {
    return this.lobbyService.getTable(tableId);
  }

  // Mark a player as disconnected at the table
  markPlayerDisconnected(playerId: string, disconnected: boolean): string[] {
    const affectedTables: string[] = [];
    for (const table of this.allTables()) {
      const seat = table.players.find(p => p.playerId === playerId);
      if (seat) {
        seat.disconnected = disconnected;
        affectedTables.push(table.tableId);
      }
    }
    return affectedTables;
  }

  // Mark player as sitting out
  markPlayerSittingOut(playerId: string, sittingOut: boolean): string[] {
    const affectedTables: string[] = [];
    for (const table of this.allTables()) {
      const seat = table.players.find(p => p.playerId === playerId);
      if (seat) {
        seat.sittingOut = sittingOut;
        seat.disconnected = sittingOut ? seat.disconnected : false;
        affectedTables.push(table.tableId);
      }
    }
    return affectedTables;
  }

  // Find which table a player is seated at
  findPlayerTable(playerId: string): GameState | undefined {
    for (const table of this.allTables()) {
      if (table.players.some(p => p.playerId === playerId)) {
        return table;
      }
    }
    return undefined;
  }

  private allTables(): GameState[] {
    // Iterate through all tables via lobbyService
    return this.lobbyService.listAllGameStates();
  }

  // Personalized view for a seated player (hide other players' cards)
  getPlayerView(state: GameState, playerId: string): GameState {
    return {
      ...state,
      players: state.players.map(p => ({
        ...p,
        cards: p.playerId === playerId || state.phase === 'showdown' ? p.cards : [],
      })),
    };
  }

  // Spectator/preview view — all cards hidden except during showdown
  getSpectatorView(state: GameState): GameState {
    return {
      ...state,
      players: state.players.map(p => ({
        ...p,
        cards: state.phase === 'showdown' ? p.cards : [],
      })),
    };
  }
}
