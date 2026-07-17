import { Module } from '@nestjs/common';
import { DbModule } from './db/db.module';
import { AdminModule } from './admin/admin.module';
import { AuctionsModule } from './auctions/auctions.module';
import { CredentialsModule } from './credentials/credentials.module';
import { InvestmentsModule } from './investments/investments.module';
import { OfferingsModule } from './offerings/offerings.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    DbModule,
    OfferingsModule,
    InvestmentsModule,
    AuctionsModule,
    UsersModule,
    AdminModule,
    CredentialsModule,
  ],
})
export class AppModule {}
