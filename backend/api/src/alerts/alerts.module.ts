import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';

@Module({
  imports: [DbModule],
  controllers: [AlertsController],
  providers: [AlertsService],
})
export class AlertsModule {}
