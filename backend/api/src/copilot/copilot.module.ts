import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { CopilotController } from './copilot.controller';
import { CopilotService } from './copilot.service';

@Module({
  imports: [DbModule],
  controllers: [CopilotController],
  providers: [CopilotService],
})
export class CopilotModule {}
