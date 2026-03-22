import { Module, forwardRef } from '@nestjs/common';
import { LobbyGateway } from './lobby.gateway';
import { LobbyService } from './lobby.service';
import { PlayerModule } from '../player/player.module';
import { GameModule } from '../game/game.module';

@Module({
  imports: [PlayerModule, forwardRef(() => GameModule)],
  providers: [LobbyGateway, LobbyService],
  exports: [LobbyService],
})
export class LobbyModule {}
