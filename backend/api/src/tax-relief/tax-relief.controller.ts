import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { TaxReliefService } from './tax-relief.service';

function requireUser(userId?: string): string {
  if (!userId) throw new UnauthorizedException('x-user-id header required');
  return userId;
}

@Controller('tax-relief')
export class TaxReliefController {
  constructor(private readonly tax: TaxReliefService) {}

  /** Reference: all tax-advantaged schemes and their parameters. */
  @Get('schemes')
  schemes() {
    return this.tax.schemes();
  }

  /** The caller's own relief claims / certificates. */
  @Get('claims')
  claims(@Headers('x-user-id') userId?: string) {
    return this.tax.claims(requireUser(userId));
  }

  /** Which schemes a campaign carries and which apply to the caller's residency. */
  @Get('campaigns/:campaignId/eligibility')
  eligibility(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.tax.eligibility(requireUser(userId), campaignId);
  }

  /** Estimate the relief for an amount under the best applicable scheme. */
  @Post('estimate')
  estimate(
    @Headers('x-user-id') userId: string | undefined,
    @Body() body: { campaignId?: string; amount?: number },
  ) {
    return this.tax.estimate(requireUser(userId), body?.campaignId ?? '', Number(body?.amount));
  }

  /** Record a pending relief claim for an investment. */
  @Post('claim')
  claim(
    @Headers('x-user-id') userId: string | undefined,
    @Body() body: { campaignId?: string; amount?: number },
  ) {
    return this.tax.claim(requireUser(userId), body?.campaignId ?? '', Number(body?.amount));
  }

  /** Issue the certificate for a claim (admin). */
  @Post('claims/:id/issue')
  issue(@Param('id', ParseUUIDPipe) id: string, @Headers('x-user-id') userId?: string) {
    return this.tax.issue(requireUser(userId), id);
  }
}
