import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Plan, PlanDocument } from '../../schemas/plan.schema';
import { LlmService } from '../llm/llm.service';
import { CreatePlanDto } from './dto/create-plan.dto';

@Injectable()
export class PlansService {
  constructor(
    @InjectModel(Plan.name) private planModel: Model\u003cPlanDocument\u003e,
    private llmService: LlmService,
  ) {}

  async generatePlan(createPlanDto: CreatePlanDto): Promise\u003cPlan\u003e {
    console.log('Generating plan with LLM...');
    
    // Generate plan using LLM
    const llmResponse = await this.llmService.generatePlan(createPlanDto.wizardData);

    // Create plan document
    const plan = new this.planModel({
      projectId: createPlanDto.projectId,
      userId: createPlanDto.userId,
      wizardData: createPlanDto.wizardData,
      phases: llmResponse.plan.phases,
      estimatedTime: llmResponse.plan.estimatedTime,
      status: 'pending',
      metadata: {
        llmProvider: llmResponse.provider,
        tokensUsed: llmResponse.tokensUsed,
        cost: llmResponse.cost,
        generatedAt: new Date(),
      },
    });

    return plan.save();
  }

  async findAll(userId: string): Promise\u003cPlan[]\u003e {
    return this.planModel.find({ userId }).exec();
  }

  async findOne(id: string): Promise\u003cPlan\u003e {
    return this.planModel.findById(id).exec();
  }

  async updateStatus(id: string, status: string): Promise\u003cPlan\u003e {
    return this.planModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .exec();
  }
}
