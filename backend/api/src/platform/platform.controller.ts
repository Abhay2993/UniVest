import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PlatformService } from './platform.service';
import { PlatformKeyGuard } from './platform-key.guard';

/**
 * Public partner API — the embedded-infrastructure surface. Every route is
 * gated by an API key (PlatformKeyGuard) and namespaced under
 * /api/v1/platform/v1 so the partner contract can version independently of the
 * first-party app API.
 */
@Controller('platform/v1')
@UseGuards(PlatformKeyGuard)
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}

  /** Who am I — lets a partner confirm the key and its mode. */
  @Get('account')
  account(@Req() req: any) {
    const p = req.partner;
    return { object: 'account', id: p.id, name: p.name, kind: p.kind, liveMode: p.liveMode };
  }

  @Post('spvs')
  createSpv(@Req() req: any, @Body() body: Record<string, unknown>) {
    return this.platform.createSpv(req.partner, body as any);
  }

  @Get('spvs')
  listSpvs(@Req() req: any) {
    return this.platform.listSpvs(req.partner);
  }

  @Get('spvs/:id')
  getSpv(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.platform.getSpv(req.partner, id);
  }

  /** Attestation verification as a service. */
  @Post('attestations/verify')
  verifyAttestation(@Body() body: { credential?: Record<string, unknown> }) {
    return this.platform.verifyAttestation((body?.credential ?? {}) as Record<string, any>);
  }

  /** Secondary-market order-book snapshot. */
  @Get('secondary/:windowId/book')
  secondaryBook(@Param('windowId', ParseUUIDPipe) windowId: string) {
    return this.platform.secondaryBook(windowId);
  }
}
