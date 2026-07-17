import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CredentialsService } from './credentials.service';

/**
 * Public verifiability surface: fetching and verifying credentials requires
 * no authentication — that is the point. Issuance is an ops action (mounted
 * under /admin in production gateways).
 */
@Controller('credentials')
export class CredentialsController {
  constructor(private readonly credentials: CredentialsService) {}

  @Post('attestations/:id/issue')
  issue(@Param('id', ParseUUIDPipe) id: string) {
    return this.credentials.issue(id);
  }

  @Get('attestations/:id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.credentials.get(id);
  }

  @Post('verify')
  verify(@Body() body: { credential?: Record<string, unknown> }) {
    return this.credentials.verify((body?.credential ?? {}) as Record<string, any>);
  }
}
