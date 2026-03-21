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

  constructor(
    private gameService: GameService,
    private playerService: PlayerService,
    private lobbyService: LobbyService,
  ) {}

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

  private broadcastState(tableId: string) {
    const state = this.gameService.getTable(tableId);
    if (!state) return;

    // Send personalized view to each player
    for (const player of state.players) {
      const view = this.gameService.getPlayerView(state, player.playerId);
      this.server.to(player.playerId).emit('game:state', view);
    }
  }
}
