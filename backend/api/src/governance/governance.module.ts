import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { GovernanceController } from './governance.controller';
import { GovernanceService } from './governance.service';

@Module({
  imports: [DbModule],
  controllers: [GovernanceController],
  providers: [GovernanceService],
})
export class GovernanceModule {}
