import { Controller, Post, Body, Get, Param, UseGuards, Request } from '@nestjs/common';
import { ProjectsService } from './projects.service';

@Controller('api/projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  async create(@Body() createProjectDto: { name: string; description: string; userId: string }) {
    return this.projectsService.createProject(
      createProjectDto.userId,
      createProjectDto.name,
      createProjectDto.description,
    );
  }

  @Get()
  async findAll(@Request() req) {
    // For now, we expect userId in query or body, later from JWT
    // This is a temporary simplification
    const userId = req.query.userId || req.body.userId;
    return this.projectsService.findAll(userId);
  }
}