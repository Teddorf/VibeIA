import { Module } from '@nestjs/common';
import { QualityGatesService } from './quality-gates.service';
import { QualityGatesController } from './quality-gates.controller';

@Module({
  controllers: [QualityGatesController],
  providers: [QualityGatesService],
  exports: [QualityGatesService],
})
export class QualityGatesModule {}
