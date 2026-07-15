import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { InvestmentsService } from './investments.service';

function requireUser(userId?: string): string {
  if (!userId) throw new UnauthorizedException('x-user-id header required');
  return userId;
}

@Controller()
export class InvestmentsController {
  constructor(private readonly investments: InvestmentsService) {}

  @Post('investments')
  create(
    @Body() body: { campaignId?: string; amount?: number },
    @Headers('x-user-id') userId?: string,
  ) {
    return this.investments.create(
      requireUser(userId),
      String(body?.campaignId ?? ''),
      Number(body?.amount),
    );
  }

  @Delete('investments/:id')
  cancel(@Param('id', ParseUUIDPipe) id: string, @Headers('x-user-id') userId?: string) {
    return this.investments.cancel(requireUser(userId), id);
  }

  @Get('portfolio')
  portfolio(@Headers('x-user-id') userId?: string) {
    return this.investments.portfolio(requireUser(userId));
  }
}
