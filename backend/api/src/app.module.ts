import { Module } from '@nestjs/common';
import { DbModule } from './db/db.module';
import { AuctionsModule } from './auctions/auctions.module';
import { InvestmentsModule } from './investments/investments.module';
import { OfferingsModule } from './offerings/offerings.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [DbModule, OfferingsModule, InvestmentsModule, AuctionsModule, UsersModule],
})
export class AppModule {}
