import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { CopilotService } from './copilot.service';

function requireUser(userId?: string): string {
  if (!userId) throw new UnauthorizedException('x-user-id header required');
  return userId;
}

interface AskBody {
  campaignId?: string;
  question?: string;
}

@Controller('copilot')
export class CopilotController {
  constructor(private readonly copilot: CopilotService) {}

  /** Grounded, cited answer over the deal's evidence bundle + knowledge graph. */
  @Post('ask')
  ask(@Headers('x-user-id') userId: string | undefined, @Body() body: AskBody) {
    if (!body?.campaignId) throw new BadRequestException('campaignId required');
    return this.copilot.ask(requireUser(userId), body.campaignId, body.question ?? '');
  }

  /** The caller's own copilot history for a campaign (audit trail). */
  @Get('history')
  history(
    @Headers('x-user-id') userId: string | undefined,
    @Query('campaignId') campaignId?: string,
  ) {
    if (!campaignId) throw new BadRequestException('campaignId required');
    return this.copilot.history(requireUser(userId), campaignId);
  }
}
