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
import { PassportService } from './passport.service';

function requireUser(userId?: string): string {
  if (!userId) throw new UnauthorizedException('x-user-id header required');
  return userId;
}

@Controller('passport')
export class PassportController {
  constructor(private readonly passport: PassportService) {}

  /** The holder issues their own passport from their verified profile. */
  @Post('issue')
  issue(@Headers('x-user-id') userId?: string) {
    return this.passport.issue(requireUser(userId));
  }

  @Get('me')
  me(@Headers('x-user-id') userId?: string) {
    return this.passport.get(requireUser(userId));
  }

  /** Public: any platform can verify a presented passport — no auth. */
  @Post('verify')
  verify(@Body() body: { credential?: Record<string, unknown> }) {
    return this.passport.verify((body?.credential ?? {}) as Record<string, any>);
  }
}
