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
import { AdminService } from './admin.service';

function requireUser(userId?: string): string {
  if (!userId) throw new UnauthorizedException('x-user-id header required');
  return userId;
}

@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('kyc/pending')
  pendingKyc(@Headers('x-user-id') userId?: string) {
    return this.admin.pendingKyc(requireUser(userId));
  }

  @Post('questions/:id/hide')
  hideQuestion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason?: string },
    @Headers('x-user-id') userId?: string,
  ) {
    return this.admin.hideQuestion(requireUser(userId), id, String(body?.reason ?? ''));
  }

  @Post('campaigns/:id/approve')
  approveCampaign(@Param('id', ParseUUIDPipe) id: string, @Headers('x-user-id') userId?: string) {
    return this.admin.approveCampaign(requireUser(userId), id);
  }
}
