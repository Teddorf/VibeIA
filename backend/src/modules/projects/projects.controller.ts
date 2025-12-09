import { Controller, Post, Body, Get, Param, Patch, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ImportProjectDto } from './dto/import-project.dto';

@Controller('api/projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) { }

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

  /**
   * POST /api/projects/import
   * Import a project from an existing GitHub repository
   */
  @Post('import')
  async importFromGitHub(
    @CurrentUser('userId') userId: string,
    @Body() importDto: ImportProjectDto,
  ) {
    return this.projectsService.importFromGitHub(userId, importDto);
  }

  @Get()
  async findAll(@CurrentUser('userId') userId: string) {
    return this.projectsService.findAll(userId);
  }

  /**
   * GET /api/projects/imported
   * Get only imported projects for the current user
   */
  @Get('imported')
  async findImported(@CurrentUser('userId') userId: string) {
    return this.projectsService.findImportedProjects(userId);
  }

  @Get(':id')
  async findOne(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.projectsService.findOne(id, userId);
  }

  /**
   * POST /api/projects/:id/resync
   * Re-analyze an imported project to update its codebase analysis
   */
  @Post(':id/resync')
  async resync(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.projectsService.resyncProject(id, userId);
  }

  /**
   * PATCH /api/projects/:id
   * Update project details
   */
  @Patch(':id')
  async update(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() updateData: { name?: string; description?: string; status?: string },
  ) {
    return this.projectsService.update(id, userId, updateData);
  }

  /**
   * DELETE /api/projects/:id
   * Delete a project
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    await this.projectsService.delete(id, userId);
  }
}
