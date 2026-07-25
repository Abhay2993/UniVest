import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';

function requireUser(userId?: string): string {
  if (!userId) throw new UnauthorizedException('x-user-id header required');
  return userId;
}

@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolio: PortfolioService) {}

  /** IRR/TVPI/MOIC, per-position metrics, and exposure by vertical/geo/stage. */
  @Get('analytics')
  analytics(@Headers('x-user-id') userId?: string) {
    return this.portfolio.analytics(requireUser(userId));
  }

  /** Tax documents + per-lot cost basis and holding period. */
  @Get('tax')
  tax(@Headers('x-user-id') userId?: string) {
    return this.portfolio.tax(requireUser(userId));
  }
}
