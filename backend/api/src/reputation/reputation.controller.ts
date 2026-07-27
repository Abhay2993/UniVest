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
import { ReputationService } from './reputation.service';

function requireUser(userId?: string): string {
  if (!userId) throw new UnauthorizedException('x-user-id header required');
  return userId;
}

interface FollowBody {
  subjectKind?: string;
  subjectId?: string;
}
interface EndorseBody extends FollowBody {
  note?: string;
}

@Controller('reputation')
export class ReputationController {
  constructor(private readonly reputation: ReputationService) {}

  /** The caller's feed: activity from subjects they follow. */
  @Get('feed')
  feed(@Headers('x-user-id') userId?: string) {
    return this.reputation.feed(requireUser(userId));
  }

  /** Ranked trust leaderboard for a subject kind. */
  @Get('leaderboard')
  leaderboard(@Query('kind') kind = 'founder') {
    return this.reputation.leaderboard(kind);
  }

  /** Public trust profile for a subject. */
  @Get('profile/:kind/:id')
  profile(@Param('kind') kind: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.reputation.profile(kind, id);
  }

  /** Follow a subject. */
  @Post('follow')
  follow(@Headers('x-user-id') userId: string | undefined, @Body() body: FollowBody) {
    return this.reputation.follow(requireUser(userId), body?.subjectKind ?? '', body?.subjectId ?? '');
  }

  @Delete('follow/:kind/:id')
  unfollow(
    @Param('kind') kind: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.reputation.unfollow(requireUser(userId), kind, id);
  }

  /** Endorse a subject (web-of-trust). */
  @Post('endorse')
  endorse(@Headers('x-user-id') userId: string | undefined, @Body() body: EndorseBody) {
    return this.reputation.endorse(
      requireUser(userId),
      body?.subjectKind ?? '',
      body?.subjectId ?? '',
      body?.note ?? '',
    );
  }
}
