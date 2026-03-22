import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Inject, forwardRef } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { LobbyService } from './lobby.service';
import { PlayerService } from '../player/player.service';
import { ConnectionService } from '../player/connection.service';
import { GameGateway } from '../game/game.gateway';
import { GameService } from '../game/game.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class LobbyGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private lobbyService: LobbyService,
    private playerService: PlayerService,
    private connectionService: ConnectionService,
    @Inject(forwardRef(() => GameGateway))
    private gameGateway: GameGateway,
    @Inject(forwardRef(() => GameService))
    private gameService: GameService,
  ) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    // Start soft disconnect detection — if no heartbeat within 15s, treat as unstable
    this.connectionService.startSoftDisconnectTimer(client.id, () => {
      this.handleSoftDisconnect(client.id);
    });
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);

    this.connectionService.removeHeartbeat(client.id);

    const player = this.playerService.get(client.id);
    if (!player) return;

    // Cleanup spectator/preview subscriptions
    this.gameGateway.cleanupSpectator(client.id);

    // Mark player as disconnected (do NOT remove from tables)
    this.playerService.markDisconnected(client.id);

    // Mark player as disconnected at the table
    this.gameGateway.handlePlayerDisconnect(player.userId);

    // Start grace period timer
    this.connectionService.startGraceTimer(player.userId, () => {
      console.log(`Grace period expired for ${player.name} (${player.userId})`);
      this.gameGateway.handleGracePeriodExpired(player.userId);
    });

    this.server.emit('lobby:tables', this.lobbyService.listTables());
  }

  // Soft disconnect: heartbeat missed but socket still technically open
  private handleSoftDisconnect(socketId: string) {
    const player = this.playerService.get(socketId);
    if (!player) return;

    console.log(`Soft disconnect detected: ${player.name} (missed heartbeats)`);
    // Mark as disconnected at table level (show "unstable" to others)
    this.gameGateway.handlePlayerDisconnect(player.userId);
    this.server.emit('lobby:tables', this.lobbyService.listTables());
  }

  @SubscribeMessage('player:register')
  handleRegister(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { name: string },
  ) {
    const player = this.playerService.register(client.id, data.name);
    client.emit('player:registered', {
      id: player.userId,
      userId: player.userId,
      name: player.name,
      chips: player.chips,
    });
  }

  @SubscribeMessage('player:reconnect')
  handleReconnect(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    const player = this.playerService.reconnect(data.userId, client.id);
    if (!player) {
      // Player not found — must register again
      client.emit('player:reconnect:failed', { reason: 'session_expired' });
      return;
    }

    console.log(`Player reconnected: ${player.name} (${player.userId}) → ${client.id}`);

    // Cancel grace and sit-out timers
    this.connectionService.cancelGraceTimer(player.userId);
    this.connectionService.cancelSitOutTimer(player.userId);

    // Restore connection at table level
    this.gameGateway.handlePlayerReconnect(player.userId, client.id);

    // Find active table
    const activeTable = this.gameService.findPlayerTable(player.userId);

    // Determine screen
    let screen: string = 'lobby';
    let gameState = null;
    let activeTableId: string | null = null;

    if (activeTable) {
      screen = 'table';
      activeTableId = activeTable.tableId;
      gameState = this.gameService.getPlayerView(activeTable, player.userId);
    }

    client.emit('player:reconnected', {
      player: {
        id: player.userId,
        userId: player.userId,
        name: player.name,
        chips: player.chips,
      },
      screen,
      activeTableId,
      gameState,
    });

    this.server.emit('lobby:tables', this.lobbyService.listTables());
  }

  @SubscribeMessage('heartbeat')
  handleHeartbeat(@ConnectedSocket() client: Socket) {
    const quality = this.connectionService.recordHeartbeat(client.id);

    // Reset soft disconnect timer
    this.connectionService.startSoftDisconnectTimer(client.id, () => {
      this.handleSoftDisconnect(client.id);
    });

    // If player was marked disconnected due to soft disconnect, restore
    const player = this.playerService.get(client.id);
    if (player) {
      const table = this.gameService.findPlayerTable(player.userId);
      if (table) {
        const seat = table.players.find(p => p.playerId === player.userId);
        if (seat && seat.disconnected) {
          seat.disconnected = false;
          this.gameGateway.broadcastState(table.tableId);
        }
      }
    }

    client.emit('heartbeat:ack', { quality, serverTime: Date.now() });
  }

  @SubscribeMessage('lobby:list')
  handleListTables(@ConnectedSocket() client: Socket) {
    client.emit('lobby:tables', this.lobbyService.listTables());
  }

  @SubscribeMessage('lobby:create')
  handleCreateTable(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { name?: string; smallBlind?: number; bigBlind?: number; maxPlayers?: number },
  ) {
    const table = this.lobbyService.createTable(
      data.name || 'New Table',
      data.smallBlind || 5,
      data.bigBlind || 10,
      data.maxPlayers || 6,
    );
    this.server.emit('lobby:tables', this.lobbyService.listTables());
    client.emit('lobby:created', { tableId: table.tableId });
  }
}
