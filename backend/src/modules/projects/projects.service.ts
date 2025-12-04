import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project, ProjectDocument } from '../../schemas/project.schema';
import { GitService } from '../git/git.service';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    private gitService: GitService,
  ) {}

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

  async findAll(userId: string) {
    return this.projectModel.find({ ownerId: userId }).exec();
  }
}