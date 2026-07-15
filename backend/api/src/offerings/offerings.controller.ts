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
import { OfferingsService } from './offerings.service';

/** Demo auth: `x-user-id` stands in for the verified JWT subject. */
function requireUser(userId?: string): string {
  if (!userId) throw new UnauthorizedException('x-user-id header required');
  return userId;
}

@Controller('offerings')
export class OfferingsController {
  constructor(private readonly offerings: OfferingsService) {}

  @Get()
  list() {
    return this.offerings.list();
  }

  @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.offerings.detail(id);
  }

  @Post(':id/questions')
  addQuestion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { body?: string },
    @Headers('x-user-id') userId?: string,
  ) {
    return this.offerings.addQuestion(requireUser(userId), id, body?.body ?? '');
  }
}
