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
import { ActionType } from './poker-engine';

@WebSocketGateway({ cors: { origin: '*' } })
export class GameGateway {
  @WebSocketServer()
  server: Server;

  // Track spectators and previewers per table
  private spectators = new Map<string, Set<string>>(); // tableId → socketIds
  private previewers = new Map<string, Set<string>>(); // tableId → socketIds

  constructor(
    private gameService: GameService,
    private playerService: PlayerService,
    private lobbyService: LobbyService,
  ) {}

  // --- Spectator / Preview ---

  @SubscribeMessage('game:preview')
  handlePreview(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tableId: string },
  ) {
    // Unsubscribe from previous preview
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

    // Send immediate spectator view
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

    const result = this.lobbyService.addToWaitlist(data.tableId, client.id);
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
    this.lobbyService.removeFromWaitlist(data.tableId, client.id);
    client.emit('game:waitlist:status', { position: 0, total: 0 });
    this.server.emit('lobby:tables', this.lobbyService.listTables());
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

    const state = this.gameService.joinTable(data.tableId, client.id, player.name, player.chips);
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
    const state = this.gameService.leaveTable(data.tableId, client.id);
    client.leave(data.tableId);
    if (state) {
      this.broadcastState(data.tableId);
      // Try to seat someone from waitlist
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
      client.emit('error', { message: 'Cannot start game (need at least 2 players)' });
      return;
    }
    this.broadcastState(data.tableId);
  }

  @SubscribeMessage('game:action')
  handleAction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tableId: string; action: ActionType; amount?: number },
  ) {
    const state = this.gameService.processAction(data.tableId, client.id, data.action, data.amount);
    if (!state) {
      client.emit('error', { message: 'Invalid action' });
      return;
    }

    this.broadcastState(data.tableId);

    // If showdown, auto-start new hand after delay
    if (state.phase === 'showdown') {
      const playersWithChips = state.players.filter(p => p.chips > 0);
      if (playersWithChips.length >= 2) {
        setTimeout(() => {
          this.gameService.startGame(data.tableId);
          this.broadcastState(data.tableId);
        }, 5000);
      }
    }
  }

  // --- Broadcast ---

  private broadcastState(tableId: string) {
    const state = this.gameService.getTable(tableId);
    if (!state) return;

    // Send personalized view to each seated player
    for (const player of state.players) {
      const view = this.gameService.getPlayerView(state, player.playerId);
      this.server.to(player.playerId).emit('game:state', view);
    }

    // Send spectator view to spectators (in the room but not seated)
    const spectatorView = this.gameService.getSpectatorView(state);
    const specSet = this.spectators.get(tableId);
    if (specSet) {
      for (const socketId of specSet) {
        this.server.to(socketId).emit('game:state', spectatorView);
      }
    }

    // Send preview state to previewers in lobby
    const previewSet = this.previewers.get(tableId);
    if (previewSet && previewSet.size > 0) {
      this.server.to(`preview:${tableId}`).emit('game:preview:state', spectatorView);
    }
  }

  private tryPromoteWaitlist(tableId: string) {
    const table = this.gameService.getTable(tableId);
    if (!table || table.players.length >= 6) return;

    const nextPlayerId = this.lobbyService.shiftWaitlist(tableId);
    if (!nextPlayerId) return;

    const player = this.playerService.get(nextPlayerId);
    if (!player) {
      // Player disconnected, try next
      this.tryPromoteWaitlist(tableId);
      return;
    }

    const state = this.gameService.joinTable(tableId, nextPlayerId, player.name, player.chips);
    if (state) {
      // Notify the promoted player
      const socket = this.server.sockets.sockets.get(nextPlayerId);
      if (socket) {
        socket.join(tableId);
        socket.emit('game:waitlist:promoted', { tableId });
      }
      this.broadcastState(tableId);
      this.server.emit('lobby:tables', this.lobbyService.listTables());
    }
  }

  // Cleanup on disconnect — called from LobbyGateway
  cleanupSpectator(socketId: string) {
    for (const [, set] of this.spectators) {
      set.delete(socketId);
    }
    for (const [, set] of this.previewers) {
      set.delete(socketId);
    }
  }
}
