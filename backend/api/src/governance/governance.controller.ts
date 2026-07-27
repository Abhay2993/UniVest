import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { GovernanceService } from './governance.service';

function requireUser(userId?: string): string {
  if (!userId) throw new UnauthorizedException('x-user-id header required');
  return userId;
}

@Controller('governance')
export class GovernanceController {
  constructor(private readonly governance: GovernanceService) {}

  /** Proposals for an SPV (holders + admin). */
  @Get('spv/:spvId/proposals')
  listForSpv(
    @Param('spvId', ParseUUIDPipe) spvId: string,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.governance.listForSpv(requireUser(userId), spvId);
  }

  /** A single proposal with tally + the caller's vote. */
  @Get('proposals/:id')
  getProposal(@Param('id', ParseUUIDPipe) id: string, @Headers('x-user-id') userId?: string) {
    return this.governance.getProposal(requireUser(userId), id);
  }

  /** Cast or change a weighted vote (holders only). */
  @Post('proposals/:id/vote')
  vote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { choice?: string },
    @Headers('x-user-id') userId?: string,
  ) {
    return this.governance.vote(requireUser(userId), id, body?.choice ?? '');
  }

  /** Create a proposal (admin). */
  @Post('proposals')
  create(
    @Headers('x-user-id') userId: string | undefined,
    @Body()
    body: { spvId?: string; title?: string; description?: string; kind?: string; quorumPct?: number; closesAt?: string },
  ) {
    return this.governance.create(requireUser(userId), body ?? {});
  }

  /** Close + finalize a proposal (admin). */
  @Post('proposals/:id/close')
  close(@Param('id', ParseUUIDPipe) id: string, @Headers('x-user-id') userId?: string) {
    return this.governance.close(requireUser(userId), id);
  }
}
