import { Module } from '@nestjs/common';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';
import { PlatformKeyGuard } from './platform-key.guard';

@Module({
  controllers: [PlatformController],
  providers: [PlatformService, PlatformKeyGuard],
})
export class PlatformModule {}
