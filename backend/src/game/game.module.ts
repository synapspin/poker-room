import { Module, forwardRef } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { ChatService } from './chat.service';
import { LobbyModule } from '../lobby/lobby.module';
import { PlayerModule } from '../player/player.module';

@Module({
  imports: [forwardRef(() => LobbyModule), PlayerModule],
  providers: [GameGateway, GameService, ChatService],
  exports: [GameGateway, GameService, ChatService],
})
export class GameModule {}
