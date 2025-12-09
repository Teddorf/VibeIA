import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project, ProjectDocument } from '../../schemas/project.schema';
import { GitService } from '../git/git.service';
import { CodebaseAnalysisService } from '../codebase-analysis/codebase-analysis.service';
import { UsersService } from '../users/users.service';
import { ImportProjectDto, ImportedProjectMetadata } from './dto/import-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    private gitService: GitService,
    private codebaseAnalysisService: CodebaseAnalysisService,
    private usersService: UsersService,
  ) { }

  async createProject(userId: string, name: string, description: string) {
    // 1. Create GitHub Repository
    const repo = await this.gitService.createRepository(name, description);

    // 2. Save Project to DB
    const project = new this.projectModel({
      name,
      description,
      ownerId: userId,
      repositoryUrl: repo.html_url,
      githubRepoId: repo.id.toString(),
      status: 'active',
    });

    return project.save();
  }

  async importFromGitHub(
    userId: string,
    importDto: ImportProjectDto,
  ): Promise<ProjectDocument> {
    // 1. Verify user has GitHub connected
    const accessToken = await this.usersService.getGitHubAccessToken(userId);
    if (!accessToken) {
      throw new UnauthorizedException(
        'GitHub not connected. Please connect your GitHub account first.',
      );
    }

    // 2. Parse owner/repo from full name
    const [owner, repoName] = importDto.githubRepoFullName.split('/');
    if (!owner || !repoName) {
      throw new BadRequestException(
        'Invalid repository format. Use "owner/repo" format.',
      );
    }

    // 3. Check if project already exists
    const existingProject = await this.projectModel.findOne({
      ownerId: userId,
      'metadata.githubOwner': owner,
      githubRepoId: { $exists: true },
      repositoryUrl: { $regex: repoName, $options: 'i' },
    });

    if (existingProject) {
      throw new BadRequestException(
        `Project from ${importDto.githubRepoFullName} already exists`,
      );
    }

    // 4. Verify access to repository and get details
    const repoDetails = await this.gitService.getRepository(
      owner,
      repoName,
      accessToken,
    );

    // 5. Analyze the codebase
    const branch = importDto.branch || repoDetails.default_branch;
    const analysis = await this.codebaseAnalysisService.analyzeRepository(
      owner,
      repoName,
      accessToken,
      branch,
    );

    // 6. Prepare metadata
    const metadata: ImportedProjectMetadata = {
      imported: true,
      importedAt: new Date(),
      analysis,
      originalBranch: branch,
      githubOwner: owner,
    };

    // 7. Create project in DB
    const project = new this.projectModel({
      name: importDto.name || repoDetails.name,
      description: importDto.description || repoDetails.description || '',
      ownerId: userId,
      repositoryUrl: repoDetails.html_url,
      githubRepoId: repoDetails.id.toString(),
      status: 'active',
      metadata,
    });

    return project.save();
  }

  async resyncProject(projectId: string, userId: string): Promise<ProjectDocument> {
    // Find the project
    const project = await this.projectModel.findById(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId !== userId) {
      throw new UnauthorizedException('Not authorized to sync this project');
    }

    // Check if it's an imported project
    if (!project.metadata?.imported) {
      throw new BadRequestException('Only imported projects can be resynced');
    }

    // Get user's GitHub token
    const accessToken = await this.usersService.getGitHubAccessToken(userId);
    if (!accessToken) {
      throw new UnauthorizedException('GitHub not connected');
    }

    // Get owner from metadata
    const owner = project.metadata.githubOwner;
    const repoName = project.name;
    const branch = project.metadata.originalBranch;

    // Re-analyze the codebase
    this.codebaseAnalysisService.clearCache(owner, repoName);
    const analysis = await this.codebaseAnalysisService.analyzeRepository(
      owner,
      repoName,
      accessToken,
      branch,
    );

    // Update project metadata
    project.metadata = {
      ...project.metadata,
      analysis,
      lastSyncedAt: new Date(),
    };

    return project.save();
  }

  async findAll(userId: string) {
    return this.projectModel.find({ ownerId: userId }).exec();
  }

  async findOne(id: string, userId: string) {
    const project = await this.projectModel.findById(id).exec();
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId !== userId) {
      throw new UnauthorizedException('You do not have access to this project');
    }

    return project;
  }

  async findImportedProjects(userId: string) {
    return this.projectModel
      .find({
        ownerId: userId,
        'metadata.imported': true,
      })
      .exec();
  }

  async update(id: string, userId: string, updateData: Partial<Project>): Promise<ProjectDocument> {
    const project = await this.projectModel.findById(id);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId !== userId) {
      throw new UnauthorizedException('Not authorized to update this project');
    }

    // Only allow updating certain fields
    const allowedUpdates = ['name', 'description', 'status'];
    const filteredData: Partial<Project> = {};
    for (const key of allowedUpdates) {
      if (updateData[key] !== undefined) {
        filteredData[key] = updateData[key];
      }
    }

    Object.assign(project, filteredData);
    return project.save();
  }

  async delete(id: string, userId: string): Promise<void> {
    const project = await this.projectModel.findById(id);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId !== userId) {
      throw new UnauthorizedException('Not authorized to delete this project');
    }

    await this.projectModel.findByIdAndDelete(id);
  }
}
