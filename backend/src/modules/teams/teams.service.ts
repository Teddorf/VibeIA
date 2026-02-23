import { Injectable, Inject } from '@nestjs/common';
import { Team, TeamDocument } from './schemas/team.schema';
import {
  TeamActivity,
  TeamActivityDocument,
} from './schemas/team-activity.schema';
import {
  TeamSettings,
  TeamActivityAction,
  CreateTeamDto,
  UpdateTeamDto,
  DEFAULT_TEAM_SETTINGS,
} from './dto/teams.dto';
import { IRepository } from '../../providers/interfaces/database-provider.interface';
import {
  TEAM_REPOSITORY,
  TEAM_ACTIVITY_REPOSITORY,
} from '../../providers/repository-tokens';

@Injectable()
export class TeamsService {
  constructor(
    @Inject(TEAM_REPOSITORY)
    private readonly teamRepo: IRepository<TeamDocument>,
    @Inject(TEAM_ACTIVITY_REPOSITORY)
    private readonly activityRepo: IRepository<TeamActivityDocument>,
  ) {}

  async createTeam(ownerId: string, dto: CreateTeamDto): Promise<TeamDocument> {
    const slug = await this.generateSlug(dto.name);

    const savedTeam = await this.teamRepo.create({
      name: dto.name,
      slug,
      description: dto.description,
      ownerId,
      settings: {
        ...DEFAULT_TEAM_SETTINGS,
        ...dto.settings,
      },
      gitConnections: [],
      memberCount: 1, // Owner
      projectCount: 0,
    } as any);

    await this.logActivity(
      (savedTeam as any)._id.toString(),
      ownerId,
      'team.created',
      'team',
      (savedTeam as any)._id.toString(),
    );

    return savedTeam;
  }

  async getTeam(teamId: string): Promise<TeamDocument | null> {
    try {
      return await this.teamRepo.findById(teamId);
    } catch {
      return null;
    }
  }

  async getTeamBySlug(slug: string): Promise<TeamDocument | null> {
    return this.teamRepo.findOne({ slug });
  }

  async getTeamsByOwner(ownerId: string): Promise<TeamDocument[]> {
    return this.teamRepo.find({ ownerId });
  }

  async updateTeam(
    teamId: string,
    dto: UpdateTeamDto,
  ): Promise<TeamDocument | null> {
    const team = await this.teamRepo.findById(teamId);
    if (!team) return null;

    const updateData: Partial<Team> = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name;
      updateData.slug = await this.generateSlug(dto.name);
    }
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.avatarUrl !== undefined) updateData.avatarUrl = dto.avatarUrl;
    if (dto.settings) {
      updateData.settings = { ...team.settings, ...dto.settings } as any;
    }

    const updatedTeam = await this.teamRepo.update(teamId, updateData);

    if (updatedTeam) {
      await this.logActivity(
        teamId,
        team.ownerId,
        'team.updated',
        'team',
        teamId,
      );
    }

    return updatedTeam;
  }

  async deleteTeam(teamId: string, userId: string): Promise<boolean> {
    const team = await this.teamRepo.findById(teamId);
    if (!team) return false;

    await this.logActivity(teamId, userId, 'team.deleted', 'team', teamId);

    await this.teamRepo.delete(teamId);
    await this.activityRepo.deleteMany({ teamId });

    return true;
  }

  async updateSettings(
    teamId: string,
    settings: Partial<TeamSettings>,
  ): Promise<TeamSettings | null> {
    const team = await this.teamRepo.findById(teamId);
    if (!team) return null;

    const updatedSettings = { ...team.settings, ...settings };
    await this.teamRepo.update(teamId, { settings: updatedSettings });

    return updatedSettings as TeamSettings;
  }

  async transferOwnership(
    teamId: string,
    currentOwnerId: string,
    newOwnerId: string,
  ): Promise<boolean> {
    const team = await this.teamRepo.findById(teamId);
    if (!team || team.ownerId !== currentOwnerId) return false;

    await this.teamRepo.update(teamId, { ownerId: newOwnerId });

    await this.logActivity(
      teamId,
      currentOwnerId,
      'member.role_changed',
      'user',
      newOwnerId,
      { previousOwner: currentOwnerId, action: 'ownership_transferred' },
    );

    return true;
  }

  async incrementMemberCount(teamId: string): Promise<void> {
    await this.teamRepo.update(teamId, { $inc: { memberCount: 1 } });
  }

  async decrementMemberCount(teamId: string): Promise<void> {
    await this.teamRepo.update(teamId, { $inc: { memberCount: -1 } });
  }

  async incrementProjectCount(teamId: string): Promise<void> {
    await this.teamRepo.update(teamId, { $inc: { projectCount: 1 } });
  }

  async decrementProjectCount(teamId: string): Promise<void> {
    await this.teamRepo.update(teamId, { $inc: { projectCount: -1 } });
  }

  async getTeamStats(teamId: string): Promise<{
    memberCount: number;
    projectCount: number;
    activityCount: number;
    gitConnections: number;
  } | null> {
    const team = await this.teamRepo.findById(teamId);
    if (!team) return null;

    const activityCount = await this.activityRepo.count({ teamId });

    return {
      memberCount: team.memberCount,
      projectCount: team.projectCount,
      activityCount,
      gitConnections: team.gitConnections.length,
    };
  }

  async logActivity(
    teamId: string,
    userId: string,
    action: TeamActivityAction,
    targetType: string,
    targetId: string,
    metadata?: Record<string, any>,
  ): Promise<TeamActivityDocument> {
    return this.activityRepo.create({
      teamId,
      userId,
      action,
      targetType,
      targetId,
      metadata,
    } as any);
  }

  async getActivityLog(
    teamId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<TeamActivityDocument[]> {
    return this.activityRepo.find(
      { teamId },
      { sort: { createdAt: -1 }, skip: offset, limit },
    );
  }

  async getActivityByUser(
    teamId: string,
    userId: string,
    limit: number = 50,
  ): Promise<TeamActivityDocument[]> {
    return this.activityRepo.find(
      { teamId, userId },
      { sort: { createdAt: -1 }, limit },
    );
  }

  async getRecentActivity(
    teamId: string,
    hours: number = 24,
  ): Promise<TeamActivityDocument[]> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    return this.activityRepo.find(
      {
        teamId,
        createdAt: { $gte: cutoff },
      },
      { sort: { createdAt: -1 } },
    );
  }

  async searchTeams(
    query: string,
    limit: number = 10,
  ): Promise<TeamDocument[]> {
    return this.teamRepo.find(
      {
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { slug: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
        ],
      },
      { limit },
    );
  }

  async getAllTeams(): Promise<TeamDocument[]> {
    return this.teamRepo.find({});
  }

  async checkSlugAvailability(slug: string): Promise<boolean> {
    const existing = await this.teamRepo.findOne({ slug });
    return !existing;
  }

  private async generateSlug(name: string): Promise<string> {
    let slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check if slug exists and append number if needed
    let counter = 1;
    let finalSlug = slug;
    while (!(await this.checkSlugAvailability(finalSlug))) {
      finalSlug = `${slug}-${counter}`;
      counter++;
    }

    return finalSlug;
  }
}
