import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { TaxReliefController } from './tax-relief.controller';
import { TaxReliefService } from './tax-relief.service';

@Module({
  imports: [DbModule],
  controllers: [TaxReliefController],
  providers: [TaxReliefService],
})
export class TaxReliefModule {}
