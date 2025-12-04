import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionService } from './execution.service';
import { PlansService } from '../plans/plans.service';
import { ProjectsService } from '../projects/projects.service';
import { GitService } from '../git/git.service';
import { LlmService } from '../llm/llm.service';

describe('ExecutionService', () => {
  let service: ExecutionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecutionService,
        { provide: PlansService, useValue: {} },
        { provide: ProjectsService, useValue: {} },
        { provide: GitService, useValue: {} },
        { provide: LlmService, useValue: {} },
      ],
    }).compile();

    service = module.get<ExecutionService>(ExecutionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});