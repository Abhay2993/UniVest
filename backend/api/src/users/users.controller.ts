import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from './users.service';

function requireUser(userId?: string): string {
  if (!userId) throw new UnauthorizedException('x-user-id header required');
  return userId;
}

@Controller()
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('users/me')
  me(@Headers('x-user-id') userId?: string) {
    return this.users.me(requireUser(userId));
  }

  @Post('users/me/suitability')
  suitability(
    @Body() body: { annualIncome?: number; netWorth?: number; quizScore?: number },
    @Headers('x-user-id') userId?: string,
  ) {
    return this.users.suitability(
      requireUser(userId),
      Number(body?.annualIncome),
      Number(body?.netWorth),
      Number(body?.quizScore),
    );
  }

  /** Persona-style KYC result webhook (signature verification in production). */
  @Post('webhooks/kyc')
  kycWebhook(@Body() body: { userRef?: string; status?: string }) {
    return this.users.kycWebhook(String(body?.userRef ?? ''), String(body?.status ?? ''));
  }
}
