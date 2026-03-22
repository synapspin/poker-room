import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { PlayerService } from '../player/player.service';
import { LobbyService } from '../lobby/lobby.service';
import { ConnectionService, TURN_TIMER_MS, TURN_TIMER_DISCONNECTED_MS } from '../player/connection.service';
import { ActionType } from './poker-engine';

@WebSocketGateway({ cors: { origin: '*' } })
export class GameGateway {
  @WebSocketServer()
  server: Server;

  // Track spectators and previewers per table
  private spectators = new Map<string, Set<string>>(); // tableId → socketIds
  private previewers = new Map<string, Set<string>>(); // tableId → socketIds
  // Action sequence counters per table for replay validation
  private actionSeq = new Map<string, number>(); // tableId → sequence number

  constructor(
    private gameService: GameService,
    private playerService: PlayerService,
    private lobbyService: LobbyService,
    private connectionService: ConnectionService,
  ) {}

  // --- Spectator / Preview ---

  @SubscribeMessage('game:preview')
  handlePreview(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tableId: string },
  ) {
    for (const [tid, set] of this.previewers) {
      if (set.has(client.id)) {
        set.delete(client.id);
        client.leave(`preview:${tid}`);
      }
    }

    const state = this.gameService.getTable(data.tableId);
    if (!state) {
      client.emit('error', { message: 'Table not found' });
      return;
    }

    if (!this.previewers.has(data.tableId)) {
      this.previewers.set(data.tableId, new Set());
    }
    this.previewers.get(data.tableId)!.add(client.id);
    client.join(`preview:${data.tableId}`);

    const view = this.gameService.getSpectatorView(state);
    client.emit('game:preview:state', view);
  }

  @SubscribeMessage('game:unpreview')
  handleUnpreview(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tableId: string },
  ) {
    const set = this.previewers.get(data.tableId);
    if (set) set.delete(client.id);
    client.leave(`preview:${data.tableId}`);
  }

  @SubscribeMessage('game:spectate')
  handleSpectate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tableId: string },
  ) {
    const state = this.gameService.getTable(data.tableId);
    if (!state) {
      client.emit('error', { message: 'Table not found' });
      return;
    }

    if (!this.spectators.has(data.tableId)) {
      this.spectators.set(data.tableId, new Set());
    }
    this.spectators.get(data.tableId)!.add(client.id);
    client.join(data.tableId);

    const view = this.gameService.getSpectatorView(state);
    client.emit('game:state', view);
  }

  @SubscribeMessage('game:unspectate')
  handleUnspectate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tableId: string },
  ) {
    const set = this.spectators.get(data.tableId);
    if (set) set.delete(client.id);
    client.leave(data.tableId);
  }

  // --- Waitlist ---

  @SubscribeMessage('game:waitlist:join')
  handleWaitlistJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tableId: string },
  ) {
    const player = this.playerService.get(client.id);
    if (!player) {
      client.emit('error', { message: 'Not registered' });
      return;
    }

    const result = this.lobbyService.addToWaitlist(data.tableId, player.userId);
    if (!result) {
      client.emit('error', { message: 'Table not found' });
      return;
    }

    client.emit('game:waitlist:status', result);
    this.server.emit('lobby:tables', this.lobbyService.listTables());
  }

  @SubscribeMessage('game:waitlist:leave')
  handleWaitlistLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tableId: string },
  ) {
    const player = this.playerService.get(client.id);
    if (player) {
      this.lobbyService.removeFromWaitlist(data.tableId, player.userId);
    }
    client.emit('game:waitlist:status', { position: 0, total: 0 });
    this.server.emit('lobby:tables', this.lobbyService.listTables());
  }

  // --- Sit out ---

  @SubscribeMessage('game:sitout')
  handleSitOut(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tableId: string },
  ) {
    const player = this.playerService.get(client.id);
    if (!player) return;
    this.gameService.markPlayerSittingOut(player.userId, true);
    this.broadcastState(data.tableId);
  }

  @SubscribeMessage('game:sitback')
  handleSitBack(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tableId: string },
  ) {
    const player = this.playerService.get(client.id);
    if (!player) return;
    this.connectionService.cancelSitOutTimer(player.userId);
    this.gameService.markPlayerSittingOut(player.userId, false);
    this.broadcastState(data.tableId);
  }

  // --- Core game events ---

  @SubscribeMessage('game:join')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tableId: string },
  ) {
    const player = this.playerService.get(client.id);
    if (!player) {
      client.emit('error', { message: 'Not registered' });
      return;
    }

    const state = this.gameService.joinTable(data.tableId, player.userId, player.name, player.chips);
    if (!state) {
      client.emit('error', { message: 'Cannot join table' });
      return;
    }

    // Remove from spectators if was spectating
    const specSet = this.spectators.get(data.tableId);
    if (specSet) specSet.delete(client.id);

    client.join(data.tableId);
    this.broadcastState(data.tableId);
    this.server.emit('lobby:tables', this.lobbyService.listTables());
  }

  @SubscribeMessage('game:leave')
  handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tableId: string },
  ) {
    const player = this.playerService.get(client.id);
    if (!player) return;

    const state = this.gameService.leaveTable(data.tableId, player.userId);
    client.leave(data.tableId);
    if (state) {
      this.connectionService.cancelActionTimer(data.tableId);
      this.broadcastState(data.tableId);
      this.tryPromoteWaitlist(data.tableId);
    }
    this.server.emit('lobby:tables', this.lobbyService.listTables());
  }

  @SubscribeMessage('game:start')
  handleStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tableId: string },
  ) {
    const state = this.gameService.startGame(data.tableId);
    if (!state) {
      client.emit('error', { message: 'Cannot start game (need at least 2 active players)' });
      return;
    }
    this.broadcastState(data.tableId);
    this.startTurnTimer(data.tableId);
  }

  @SubscribeMessage('game:action')
  handleAction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tableId: string; action: ActionType; amount?: number; seq?: number },
  ) {
    const player = this.playerService.get(client.id);
    if (!player) return;

    const result = this.processAndBroadcast(data.tableId, player.userId, data.action, data.amount);

    // Ack with sequence number for replay tracking
    const currentSeq = this.actionSeq.get(data.tableId) || 0;
    client.emit('game:action:ack', {
      seq: data.seq ?? null,
      serverSeq: currentSeq,
      success: result.success,
      reason: result.reason,
    });
  }

  @SubscribeMessage('game:action:replay')
  handleActionReplay(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tableId: string; actions: { action: ActionType; amount?: number; seq: number; timestamp: number }[] },
  ) {
    const player = this.playerService.get(client.id);
    if (!player) return;

    const results: { seq: number; success: boolean; reason?: string }[] = [];

    for (const entry of data.actions) {
      // Skip actions older than 60s (stale)
      if (Date.now() - entry.timestamp > 60_000) {
        results.push({ seq: entry.seq, success: false, reason: 'expired' });
        continue;
      }

      const result = this.processAndBroadcast(data.tableId, player.userId, entry.action, entry.amount);
      results.push({ seq: entry.seq, success: result.success, reason: result.reason });

      // Stop on first failure — subsequent actions likely invalid
      if (!result.success) {
        for (const remaining of data.actions.slice(data.actions.indexOf(entry) + 1)) {
          results.push({ seq: remaining.seq, success: false, reason: 'skipped_after_failure' });
        }
        break;
      }
    }

    client.emit('game:action:replay:result', { results });
  }

  private processAndBroadcast(tableId: string, userId: string, action: ActionType, amount?: number): { success: boolean; reason?: string } {
    const state = this.gameService.processAction(tableId, userId, action, amount);
    if (!state) {
      return { success: false, reason: 'invalid_action' };
    }

    // Increment sequence
    const seq = (this.actionSeq.get(tableId) || 0) + 1;
    this.actionSeq.set(tableId, seq);

    this.connectionService.cancelActionTimer(tableId);
    this.broadcastState(tableId);

    if (state.phase === 'showdown') {
      this.handleShowdown(tableId, state);
    } else if (state.phase !== 'waiting') {
      this.startTurnTimer(tableId);
    }

    return { success: true };
  }

  // --- Turn timer ---

  private startTurnTimer(tableId: string) {
    const state = this.gameService.getTable(tableId);
    if (!state || state.phase === 'waiting' || state.phase === 'showdown') return;

    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.folded || currentPlayer.allIn) return;

    const duration = currentPlayer.disconnected ? TURN_TIMER_DISCONNECTED_MS : TURN_TIMER_MS;

    const timerInfo = this.connectionService.startActionTimer(tableId, duration, () => {
      this.handleTurnTimeout(tableId);
    });

    // Store timer info in game state for client display
    state.turnTimer = {
      playerId: currentPlayer.playerId,
      startedAt: timerInfo.startedAt,
      duration: timerInfo.duration,
    };

    // Re-broadcast with timer info
    this.broadcastState(tableId);
  }

  private handleTurnTimeout(tableId: string) {
    const state = this.gameService.getTable(tableId);
    if (!state || state.phase === 'waiting' || state.phase === 'showdown') return;

    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.folded || currentPlayer.allIn) return;

    // Auto-action: check if possible, otherwise fold
    const canCheck = currentPlayer.bet >= state.currentBet;
    const action: ActionType = canCheck ? 'check' : 'fold';

    console.log(`Turn timeout: ${currentPlayer.name} auto-${action}`);

    const newState = this.gameService.processAction(tableId, currentPlayer.playerId, action);
    if (!newState) return;

    this.broadcastState(tableId);

    if (newState.phase === 'showdown') {
      this.handleShowdown(tableId, newState);
    } else if (newState.phase !== 'waiting') {
      this.startTurnTimer(tableId);
    }
  }

  private handleShowdown(tableId: string, state: any) {
    const playersWithChips = state.players.filter((p: any) => p.chips > 0 && !p.sittingOut);
    if (playersWithChips.length >= 2) {
      setTimeout(() => {
        const newState = this.gameService.startGame(tableId);
        if (newState) {
          this.broadcastState(tableId);
          this.startTurnTimer(tableId);
        }
      }, 5000);
    }
  }

  // --- Disconnect / Reconnect support ---

  handlePlayerDisconnect(userId: string) {
    const affectedTables = this.gameService.markPlayerDisconnected(userId, true);
    for (const tableId of affectedTables) {
      this.broadcastState(tableId);

      // If it's this player's turn, restart timer with shorter duration
      const state = this.gameService.getTable(tableId);
      if (state) {
        const currentPlayer = state.players[state.currentPlayerIndex];
        if (currentPlayer && currentPlayer.playerId === userId && state.phase !== 'waiting' && state.phase !== 'showdown') {
          this.connectionService.cancelActionTimer(tableId);
          this.startTurnTimer(tableId);
        }
      }
    }
  }

  handlePlayerReconnect(userId: string, newSocketId: string) {
    const affectedTables = this.gameService.markPlayerDisconnected(userId, false);

    // Rejoin socket rooms
    const socket = this.server.sockets.sockets.get(newSocketId);
    if (socket) {
      for (const tableId of affectedTables) {
        socket.join(tableId);
      }
    }

    for (const tableId of affectedTables) {
      this.broadcastState(tableId);

      // If it's now this player's turn and they were on shorter timer, reset to full
      const state = this.gameService.getTable(tableId);
      if (state) {
        const currentPlayer = state.players[state.currentPlayerIndex];
        if (currentPlayer && currentPlayer.playerId === userId && state.phase !== 'waiting' && state.phase !== 'showdown') {
          this.connectionService.cancelActionTimer(tableId);
          this.startTurnTimer(tableId);
        }
      }
    }
  }

  handleGracePeriodExpired(userId: string) {
    // Auto-fold if in hand, then mark sitting out
    for (const table of this.lobbyService.listAllGameStates()) {
      const seat = table.players.find(p => p.playerId === userId);
      if (!seat) continue;

      // If it's their turn, auto-fold
      const currentPlayer = table.players[table.currentPlayerIndex];
      if (currentPlayer && currentPlayer.playerId === userId && table.phase !== 'waiting' && table.phase !== 'showdown') {
        this.connectionService.cancelActionTimer(table.tableId);
        this.gameService.processAction(table.tableId, userId, 'fold');
      }

      // Mark sitting out
      seat.sittingOut = true;
      this.broadcastState(table.tableId);
    }

    // Start sit-out timer
    this.connectionService.startSitOutTimer(userId, () => {
      this.handleSitOutExpired(userId);
    });
  }

  handleSitOutExpired(userId: string) {
    // Remove from all tables
    const affectedTables = this.lobbyService.removePlayerFromAllTables(userId);
    for (const tableId of affectedTables) {
      this.broadcastState(tableId);
      this.tryPromoteWaitlist(tableId);
    }
    this.server.emit('lobby:tables', this.lobbyService.listTables());
  }

  // --- Broadcast ---

  broadcastState(tableId: string) {
    const state = this.gameService.getTable(tableId);
    if (!state) return;

    // Send personalized view to each seated player
    for (const player of state.players) {
      const playerData = this.playerService.getByUserId(player.playerId);
      if (playerData && !playerData.disconnected) {
        const view = this.gameService.getPlayerView(state, player.playerId);
        this.server.to(playerData.socketId).emit('game:state', view);
      }
    }

    // Send spectator view to spectators
    const spectatorView = this.gameService.getSpectatorView(state);
    const specSet = this.spectators.get(tableId);
    if (specSet) {
      for (const socketId of specSet) {
        this.server.to(socketId).emit('game:state', spectatorView);
      }
    }

    // Send preview state to previewers
    const previewSet = this.previewers.get(tableId);
    if (previewSet && previewSet.size > 0) {
      this.server.to(`preview:${tableId}`).emit('game:preview:state', spectatorView);
    }
  }

  private tryPromoteWaitlist(tableId: string) {
    const table = this.gameService.getTable(tableId);
    if (!table || table.players.length >= 6) return;

    const nextUserId = this.lobbyService.shiftWaitlist(tableId);
    if (!nextUserId) return;

    const player = this.playerService.getByUserId(nextUserId);
    if (!player || player.disconnected) {
      this.tryPromoteWaitlist(tableId);
      return;
    }

    const state = this.gameService.joinTable(tableId, player.userId, player.name, player.chips);
    if (state) {
      const socket = this.server.sockets.sockets.get(player.socketId);
      if (socket) {
        socket.join(tableId);
        socket.emit('game:waitlist:promoted', { tableId });
      }
      this.broadcastState(tableId);
      this.server.emit('lobby:tables', this.lobbyService.listTables());
    }
  }

  cleanupSpectator(socketId: string) {
    for (const [, set] of this.spectators) {
      set.delete(socketId);
    }
    for (const [, set] of this.previewers) {
      set.delete(socketId);
    }
  }
}
