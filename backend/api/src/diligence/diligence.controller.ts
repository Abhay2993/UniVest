import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { DiligenceService } from './diligence.service';

@Controller('diligence')
export class DiligenceController {
  constructor(private readonly diligence: DiligenceService) {}

  @Get('startups/:id')
  forStartup(@Param('id', ParseUUIDPipe) id: string) {
    return this.diligence.forStartup(id);
  }
}
