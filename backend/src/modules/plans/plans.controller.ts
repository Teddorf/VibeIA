import { Controller, Get, Post, Body, Param, Patch, Query } from '@nestjs/common';
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('api/plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) { }

  @Post('generate')
  async generate(
    @CurrentUser('userId') userId: string,
    @Body() createPlanDto: CreatePlanDto,
  ) {
    return this.plansService.generatePlan({ ...createPlanDto, userId });
  }

  @Get()
  async findAll(
    @CurrentUser('userId') userId: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.plansService.findAll(userId, projectId);
  }

  @Get(':id')
  async findOne(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.plansService.findOne(id, userId);
  }

  @Patch(':id')
  async updateStatus(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.plansService.updateStatus(id, status, userId);
  }
}
