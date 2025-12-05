import { Controller, Post, Body } from '@nestjs/common';
import { QualityGatesService } from './quality-gates.service';

@Controller('quality-gates')
export class QualityGatesController {
  constructor(private readonly qualityGatesService: QualityGatesService) {}

  @Post('check')
  async runChecks(
    @Body() body: { files: { path: string; content: string }[]; skipTests?: boolean }
  ) {
    const result = await this.qualityGatesService.runAllChecks(body.files, {
      skipTests: body.skipTests,
    });

    return {
      ...result,
      report: this.qualityGatesService.generateReport(result),
    };
  }

  @Post('lint')
  async runLint(@Body() body: { files: { path: string; content: string }[] }) {
    return this.qualityGatesService.runLintCheck(body.files);
  }

  @Post('security')
  async runSecurity(@Body() body: { files: { path: string; content: string }[] }) {
    return this.qualityGatesService.runSecurityCheck(body.files);
  }
}
