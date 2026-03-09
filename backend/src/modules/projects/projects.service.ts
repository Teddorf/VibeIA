import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { Project, ProjectDocument } from '../../schemas/project.schema';
import { GitService } from '../git/git.service';
import { CodebaseAnalysisService } from '../codebase-analysis/codebase-analysis.service';
import { UsersService } from '../users/users.service';
import {
  ImportProjectDto,
  ImportedProjectMetadata,
} from './dto/import-project.dto';
import { IRepository } from '../../providers/interfaces/database-provider.interface';
import { PROJECT_REPOSITORY } from '../../providers/repository-tokens';

@Injectable()
export class ProjectsService {
  constructor(
    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepo: IRepository<Project>,
    private gitService: GitService,
    private codebaseAnalysisService: CodebaseAnalysisService,
    private usersService: UsersService,
  ) {}

  async createProject(userId: string, name: string, description: string) {
    // 1. Create GitHub Repository
    const repo = await this.gitService.createRepository(name, description);

    // 2. Save Project to DB
    return this.projectRepo.create({
      name,
      description,
      ownerId: userId,
      repositoryUrl: repo.html_url,
      githubRepoId: repo.id.toString(),
      status: 'active',
    });
  }

  async importFromGitHub(
    userId: string,
    importDto: ImportProjectDto,
  ): Promise<Project> {
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
    const existingProject = await this.projectRepo.findOne({
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
    return this.projectRepo.create({
      name: importDto.name || repoDetails.name,
      description: importDto.description || repoDetails.description || '',
      ownerId: userId,
      repositoryUrl: repoDetails.html_url,
      githubRepoId: repoDetails.id.toString(),
      status: 'active',
      metadata,
    } as Partial<Project>);
  }

  async resyncProject(projectId: string, userId: string): Promise<Project> {
    const project = await this.projectRepo.findById(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId !== userId) {
      throw new UnauthorizedException('Not authorized to sync this project');
    }

    if (!project.metadata?.imported) {
      throw new BadRequestException('Only imported projects can be resynced');
    }

    const accessToken = await this.usersService.getGitHubAccessToken(userId);
    if (!accessToken) {
      throw new UnauthorizedException('GitHub not connected');
    }

    const owner = project.metadata.githubOwner;
    const repoName = project.name;
    const branch = project.metadata.originalBranch;

    this.codebaseAnalysisService.clearCache(owner, repoName);
    const analysis = await this.codebaseAnalysisService.analyzeRepository(
      owner,
      repoName,
      accessToken,
      branch,
    );

    const updatedProject = await this.projectRepo.update(projectId, {
      metadata: {
        ...project.metadata,
        analysis,
        lastSyncedAt: new Date(),
      },
    });

    if (!updatedProject) {
      throw new NotFoundException('Project not found during update');
    }

    return updatedProject;
  }

  async findAll(userId: string) {
    return this.projectRepo.find({ ownerId: userId });
  }

  async findOne(id: string, userId: string) {
    const project = await this.projectRepo.findById(id);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId !== userId) {
      throw new UnauthorizedException('You do not have access to this project');
    }

    return project;
  }

  async findImportedProjects(userId: string) {
    return this.projectRepo.find({
      ownerId: userId,
      'metadata.imported': true,
    });
  }

  async update(
    id: string,
    userId: string,
    updateData: Partial<Project>,
  ): Promise<Project> {
    const project = await this.projectRepo.findById(id);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId !== userId) {
      throw new UnauthorizedException('Not authorized to update this project');
    }

    const allowedUpdates = ['name', 'description', 'status'];
    const filteredData: Record<string, any> = {};
    for (const key of allowedUpdates) {
      if ((updateData as any)[key] !== undefined) {
        filteredData[key] = (updateData as any)[key];
      }
    }

    const updated = await this.projectRepo.update(id, filteredData);
    if (!updated) {
      throw new NotFoundException('Project not found during update');
    }
    return updated;
  }

  async delete(id: string, userId: string): Promise<void> {
    const project = await this.projectRepo.findById(id);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId !== userId) {
      throw new UnauthorizedException('Not authorized to delete this project');
    }

    await this.projectRepo.delete(id);
  }
}
