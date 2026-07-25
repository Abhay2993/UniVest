import { Module } from '@nestjs/common';
import { SecondaryController } from './secondary.controller';
import { SecondaryService } from './secondary.service';

@Module({
  controllers: [SecondaryController],
  providers: [SecondaryService],
})
export class SecondaryModule {}
