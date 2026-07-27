import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { EscrowController } from './escrow.controller';
import { EscrowService } from './escrow.service';

@Module({
  imports: [DbModule],
  controllers: [EscrowController],
  providers: [EscrowService],
})
export class EscrowModule {}
