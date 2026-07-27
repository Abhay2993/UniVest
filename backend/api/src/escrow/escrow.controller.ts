import {
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { EscrowService } from './escrow.service';

function requireUser(userId?: string): string {
  if (!userId) throw new UnauthorizedException('x-user-id header required');
  return userId;
}

@Controller('escrow')
export class EscrowController {
  constructor(private readonly escrow: EscrowService) {}

  /** Public escrow schedule + roll-up (released vs held vs refunded). */
  @Get(':campaignId')
  schedule(@Param('campaignId', ParseUUIDPipe) campaignId: string) {
    return this.escrow.schedule(campaignId);
  }

  /** Release a held tranche to the company (admin; gated on attestation). */
  @Post('tranches/:id/release')
  release(@Param('id', ParseUUIDPipe) id: string, @Headers('x-user-id') userId?: string) {
    return this.escrow.release(requireUser(userId), id);
  }

  /** Refund a held tranche to investors (admin). */
  @Post('tranches/:id/refund')
  refund(@Param('id', ParseUUIDPipe) id: string, @Headers('x-user-id') userId?: string) {
    return this.escrow.refund(requireUser(userId), id);
  }
}
