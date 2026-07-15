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
import { AuctionsService } from './auctions.service';

function requireUser(userId?: string): string {
  if (!userId) throw new UnauthorizedException('x-user-id header required');
  return userId;
}

@Controller('auctions')
export class AuctionsController {
  constructor(private readonly auctions: AuctionsService) {}

  @Get('active')
  active() {
    return this.auctions.active();
  }

  @Post(':id/orders')
  placeOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { side?: string; units?: number; limitPrice?: number },
    @Headers('x-user-id') userId?: string,
  ) {
    return this.auctions.placeOrder(
      requireUser(userId),
      id,
      String(body?.side ?? ''),
      Number(body?.units),
      Number(body?.limitPrice),
    );
  }

  /** Ops/scheduler endpoint — clears the window at its close. */
  @Post(':id/clear')
  clear(@Param('id', ParseUUIDPipe) id: string) {
    return this.auctions.clear(id);
  }
}
