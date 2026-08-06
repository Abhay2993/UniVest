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
import { IndexService } from './index.service';

function requireUser(userId?: string): string {
  if (!userId) throw new UnauthorizedException('x-user-id header required');
  return userId;
}

function parseVerticals(v?: string): string[] {
  return (v ?? '').split(',').map((x) => x.trim()).filter(Boolean);
}

@Controller('index')
export class IndexController {
  constructor(private readonly index: IndexService) {}

  /** The index composition (qualifying live deals) for the given filters. */
  @Get('composition')
  composition(
    @Query('currency') currency = 'USD',
    @Query('minAttested') minAttested = '1',
    @Query('verticals') verticals?: string,
  ) {
    return this.index.composition(currency, Number(minAttested), parseVerticals(verticals));
  }

  /** The caller's auto-invest mandates. */
  @Get('mandates')
  mandates(@Headers('x-user-id') userId?: string) {
    return this.index.listMandates(requireUser(userId));
  }

  /** Create an auto-invest mandate. */
  @Post('mandates')
  create(
    @Headers('x-user-id') userId: string | undefined,
    @Body()
    body: {
      budgetAmount?: number;
      currencyCode?: string;
      cadence?: 'once' | 'quarterly';
      verticals?: string[];
      minAttestedMilestones?: number;
      maxPerDealPct?: number;
    },
  ) {
    return this.index.createMandate(requireUser(userId), body ?? {});
  }

  /** Dry-run the allocation for a mandate's current period. */
  @Post('mandates/:id/preview')
  preview(@Param('id', ParseUUIDPipe) id: string, @Headers('x-user-id') userId?: string) {
    return this.index.preview(requireUser(userId), id);
  }

  /** Execute the allocation for the current period. */
  @Post('mandates/:id/run')
  run(@Param('id', ParseUUIDPipe) id: string, @Headers('x-user-id') userId?: string) {
    return this.index.run(requireUser(userId), id);
  }

  /** The mandate's deployment history. */
  @Get('mandates/:id/allocations')
  allocations(@Param('id', ParseUUIDPipe) id: string, @Headers('x-user-id') userId?: string) {
    return this.index.allocations(requireUser(userId), id);
  }

  /** Pause a mandate. */
  @Post('mandates/:id/pause')
  pause(@Param('id', ParseUUIDPipe) id: string, @Headers('x-user-id') userId?: string) {
    return this.index.pause(requireUser(userId), id);
  }
}
