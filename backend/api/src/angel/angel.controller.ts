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
import { AngelService } from './angel.service';

function requireUser(userId?: string): string {
  if (!userId) throw new UnauthorizedException('x-user-id header required');
  return userId;
}

@Controller('angel')
export class AngelController {
  constructor(private readonly angel: AngelService) {}

  /** Apply as an angel from your (accredited) profile. */
  @Post('apply')
  apply(
    @Body() body: { thesis?: string; committedCapital?: number; focusVerticals?: string[] },
    @Headers('x-user-id') userId?: string,
  ) {
    return this.angel.apply(requireUser(userId), body ?? {});
  }

  @Get('me')
  me(@Headers('x-user-id') userId?: string) {
    return this.angel.me(requireUser(userId));
  }

  /** Deals inside their angel-only early-access window. */
  @Get('dealflow')
  dealflow(@Headers('x-user-id') userId?: string) {
    return this.angel.dealflow(requireUser(userId));
  }

  /** Lead (or co-lead) a deal. */
  @Post('deals/:campaignId/lead')
  lead(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Body() body: { committedAmount?: number; carryPct?: number },
    @Headers('x-user-id') userId?: string,
  ) {
    return this.angel.lead(requireUser(userId), campaignId, body ?? {});
  }

  @Get('leads')
  leads(@Headers('x-user-id') userId?: string) {
    return this.angel.myLeads(requireUser(userId));
  }
}
