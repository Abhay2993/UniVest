import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { IndexController } from './index.controller';
import { IndexService } from './index.service';

@Module({
  imports: [DbModule],
  controllers: [IndexController],
  providers: [IndexService],
})
export class IndexFundModule {}
