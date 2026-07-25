import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { SecondaryService } from './secondary.service';

function requireUser(userId?: string): string {
  if (!userId) throw new UnauthorizedException('x-user-id header required');
  return userId;
}

@Controller('secondary')
export class SecondaryController {
  constructor(private readonly secondary: SecondaryService) {}

  @Get('listings')
  listings(@Query('spvId') spvId?: string, @Headers('x-user-id') userId?: string) {
    return this.secondary.listings(requireUser(userId), spvId || undefined);
  }

  @Get('holdings')
  holdings(@Headers('x-user-id') userId?: string) {
    return this.secondary.holdings(requireUser(userId));
  }

  @Post('listings')
  createListing(
    @Body() body: { spvId?: string; units?: number; pricePerUnit?: number },
    @Headers('x-user-id') userId?: string,
  ) {
    return this.secondary.createListing(requireUser(userId), body ?? {});
  }

  @Delete('listings/:id')
  cancelListing(@Param('id', ParseUUIDPipe) id: string, @Headers('x-user-id') userId?: string) {
    return this.secondary.cancelListing(requireUser(userId), id);
  }

  @Post('listings/:id/buy')
  buyListing(@Param('id', ParseUUIDPipe) id: string, @Headers('x-user-id') userId?: string) {
    return this.secondary.buyListing(requireUser(userId), id);
  }

  @Get('tenders/:spvId')
  tenders(@Param('spvId', ParseUUIDPipe) spvId: string, @Headers('x-user-id') userId?: string) {
    return this.secondary.tenders(requireUser(userId), spvId);
  }

  @Post('tenders')
  createTender(
    @Body() body: { spvId?: string; pricePerUnit?: number; maxUnits?: number },
    @Headers('x-user-id') userId?: string,
  ) {
    return this.secondary.createTender(requireUser(userId), body ?? {});
  }

  /** Public book snapshot for an SPV — no per-user data. */
  @Get('book/:spvId')
  book(@Param('spvId', ParseUUIDPipe) spvId: string) {
    return this.secondary.book(spvId);
  }
}
