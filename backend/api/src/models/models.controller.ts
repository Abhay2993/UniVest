import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ModelsService } from './models.service';

/**
 * Calibration is public (transparency is the point). Prediction logging and
 * resolution are internal/ops actions (gateway-restricted in production).
 */
@Controller('models')
export class ModelsController {
  constructor(private readonly models: ModelsService) {}

  @Get(':model/calibration')
  calibration(@Param('model') model: string) {
    return this.models.calibration(model);
  }

  @Post('predictions')
  log(
    @Body()
    body: { model?: string; subjectKind?: string; subjectId?: string; predictedProb?: number },
  ) {
    return this.models.logPrediction({
      model: String(body?.model ?? ''),
      subjectKind: String(body?.subjectKind ?? ''),
      subjectId: String(body?.subjectId ?? ''),
      predictedProb: Number(body?.predictedProb),
    });
  }

  @Post('predictions/:id/resolve')
  resolve(@Param('id', ParseUUIDPipe) id: string, @Body() body: { outcome?: number }) {
    return this.models.resolve(id, Number(body?.outcome));
  }
}
