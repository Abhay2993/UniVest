import { Module } from '@nestjs/common';
import { DbModule } from './db/db.module';
import { AdminModule } from './admin/admin.module';
import { AuctionsModule } from './auctions/auctions.module';
import { CredentialsModule } from './credentials/credentials.module';
import { DiligenceModule } from './diligence/diligence.module';
import { InvestmentsModule } from './investments/investments.module';
import { ModelsModule } from './models/models.module';
import { OfferingsModule } from './offerings/offerings.module';
import { PassportModule } from './passport/passport.module';
import { UniversityModule } from './university/university.module';
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
    ModelsModule,
    UniversityModule,
    DiligenceModule,
    PassportModule,
  ],
})
export class AppModule {}
