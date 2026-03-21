import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { LobbyModule } from '../lobby/lobby.module';
import { PlayerModule } from '../player/player.module';

@Module({
  imports: [LobbyModule, PlayerModule],
  providers: [GameGateway, GameService],
})
export class GameModule {}
