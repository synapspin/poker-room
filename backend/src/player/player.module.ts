import { Module } from '@nestjs/common';
import { PlayerService } from './player.service';
import { ConnectionService } from './connection.service';

@Module({
  providers: [PlayerService, ConnectionService],
  exports: [PlayerService, ConnectionService],
})
export class PlayerModule {}
