import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('api/projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  async create(
    @CurrentUser('userId') userId: string,
    @Body() createProjectDto: { name: string; description: string },
  ) {
    return this.projectsService.createProject(
      userId,
      createProjectDto.name,
      createProjectDto.description,
    );
  }

  @Get()
  async findAll(@CurrentUser('userId') userId: string) {
    return this.projectsService.findAll(userId);
  }

  @Get(':id')
  async findOne(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.projectsService.findOne(id);
  }
}