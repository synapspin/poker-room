import { Module } from '@nestjs/common';
import { LobbyModule } from './lobby/lobby.module';
import { GameModule } from './game/game.module';
import { PlayerModule } from './player/player.module';

@Module({
  imports: [LobbyModule, GameModule, PlayerModule],
})
export class AppModule {}
