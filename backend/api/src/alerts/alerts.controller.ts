import {
  Body,
  Controller,
  Get,
  Headers,
  Put,
  UnauthorizedException,
} from '@nestjs/common';
import { AlertPreferences, AlertsService } from './alerts.service';

function requireUser(userId?: string): string {
  if (!userId) throw new UnauthorizedException('x-user-id header required');
  return userId;
}

@Controller('alerts')
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  /** The caller's material-event feed, scoped to holdings + filtered by prefs. */
  @Get('feed')
  feed(@Headers('x-user-id') userId?: string) {
    return this.alerts.feed(requireUser(userId));
  }

  /** The caller's alert preferences (defaults created on first read). */
  @Get('preferences')
  getPreferences(@Headers('x-user-id') userId?: string) {
    return this.alerts.getPreferences(requireUser(userId));
  }

  @Put('preferences')
  updatePreferences(
    @Headers('x-user-id') userId: string | undefined,
    @Body() body: Partial<AlertPreferences>,
  ) {
    return this.alerts.updatePreferences(requireUser(userId), body ?? {});
  }
}
