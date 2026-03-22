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
    if (!table || table.players.length < 2) return null;
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
