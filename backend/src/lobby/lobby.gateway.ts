import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { LobbyService } from './lobby.service';
import { PlayerService } from '../player/player.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class LobbyGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private lobbyService: LobbyService,
    private playerService: PlayerService,
  ) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    const affectedTables = this.lobbyService.removePlayerFromAllTables(client.id);
    this.playerService.remove(client.id);

    // Notify lobby about updated tables
    if (affectedTables.length > 0) {
      this.server.emit('lobby:tables', this.lobbyService.listTables());
      for (const tableId of affectedTables) {
        const table = this.lobbyService.getTable(tableId);
        if (table) {
          this.server.to(tableId).emit('game:state', table);
        }
      }
    }
  }

  @SubscribeMessage('player:register')
  handleRegister(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { name: string },
  ) {
    const player = this.playerService.register(client.id, data.name);
    client.emit('player:registered', player);
    return player;
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
