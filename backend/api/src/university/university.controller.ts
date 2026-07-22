import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { UniversityService } from './university.service';

@Controller('universities')
export class UniversityController {
  constructor(private readonly university: UniversityService) {}

  @Get(':id/portfolio')
  portfolio(@Param('id', ParseUUIDPipe) id: string) {
    return this.university.portfolio(id);
  }

  @Get(':id/consortia')
  consortia(@Param('id', ParseUUIDPipe) id: string) {
    return this.university.consortia(id);
  }
}
