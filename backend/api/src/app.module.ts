import { Module } from '@nestjs/common';
import { DbModule } from './db/db.module';
import { AdminModule } from './admin/admin.module';
import { AlertsModule } from './alerts/alerts.module';
import { AngelModule } from './angel/angel.module';
import { AuctionsModule } from './auctions/auctions.module';
import { CopilotModule } from './copilot/copilot.module';
import { CredentialsModule } from './credentials/credentials.module';
import { DiligenceModule } from './diligence/diligence.module';
import { EscrowModule } from './escrow/escrow.module';
import { GovernanceModule } from './governance/governance.module';
import { IndexFundModule } from './index-fund/index.module';
import { InvestmentsModule } from './investments/investments.module';
import { ModelsModule } from './models/models.module';
import { OfferingsModule } from './offerings/offerings.module';
import { PassportModule } from './passport/passport.module';
import { PlatformModule } from './platform/platform.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { ReputationModule } from './reputation/reputation.module';
import { SecondaryModule } from './secondary/secondary.module';
import { TaxReliefModule } from './tax-relief/tax-relief.module';
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
    PlatformModule,
    AngelModule,
    SecondaryModule,
    PortfolioModule,
    CopilotModule,
    EscrowModule,
    ReputationModule,
    GovernanceModule,
    AlertsModule,
    TaxReliefModule,
    IndexFundModule,
  ],
})
export class AppModule {}
