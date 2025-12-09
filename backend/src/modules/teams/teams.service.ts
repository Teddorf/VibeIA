import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Team, TeamDocument } from './schemas/team.schema';
import { TeamActivity, TeamActivityDocument } from './schemas/team-activity.schema';
import {
  TeamSettings,
  TeamActivityAction,
  CreateTeamDto,
  UpdateTeamDto,
  DEFAULT_TEAM_SETTINGS,
} from './dto/teams.dto';

@Injectable()
export class TeamsService {
  constructor(
    @InjectModel(Team.name) private teamModel: Model<TeamDocument>,
    @InjectModel(TeamActivity.name) private activityModel: Model<TeamActivityDocument>,
  ) {}

  async createTeam(ownerId: string, dto: CreateTeamDto): Promise<TeamDocument> {
    const slug = await this.generateSlug(dto.name);

    const team = new this.teamModel({
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
    });

    const savedTeam = await team.save();

    await this.logActivity(savedTeam._id.toString(), ownerId, 'team.created', 'team', savedTeam._id.toString());

    return savedTeam;
  }

  async getTeam(teamId: string): Promise<TeamDocument | null> {
    try {
      return await this.teamModel.findById(teamId).exec();
    } catch {
      return null;
    }
  }

  async getTeamBySlug(slug: string): Promise<TeamDocument | null> {
    return this.teamModel.findOne({ slug }).exec();
  }

  async getTeamsByOwner(ownerId: string): Promise<TeamDocument[]> {
    return this.teamModel.find({ ownerId }).exec();
  }

  async updateTeam(teamId: string, dto: UpdateTeamDto): Promise<TeamDocument | null> {
    const team = await this.teamModel.findById(teamId).exec();
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

    const updatedTeam = await this.teamModel
      .findByIdAndUpdate(teamId, updateData, { new: true })
      .exec();

    if (updatedTeam) {
      await this.logActivity(teamId, team.ownerId, 'team.updated', 'team', teamId);
    }

    return updatedTeam;
  }

  async deleteTeam(teamId: string, userId: string): Promise<boolean> {
    const team = await this.teamModel.findById(teamId).exec();
    if (!team) return false;

    await this.logActivity(teamId, userId, 'team.deleted', 'team', teamId);

    await this.teamModel.findByIdAndDelete(teamId).exec();
    await this.activityModel.deleteMany({ teamId }).exec();

    return true;
  }

  async updateSettings(
    teamId: string,
    settings: Partial<TeamSettings>,
  ): Promise<TeamSettings | null> {
    const team = await this.teamModel.findById(teamId).exec();
    if (!team) return null;

    const updatedSettings = { ...team.settings, ...settings };
    await this.teamModel
      .findByIdAndUpdate(teamId, { settings: updatedSettings })
      .exec();

    return updatedSettings as TeamSettings;
  }

  async transferOwnership(
    teamId: string,
    currentOwnerId: string,
    newOwnerId: string,
  ): Promise<boolean> {
    const team = await this.teamModel.findById(teamId).exec();
    if (!team || team.ownerId !== currentOwnerId) return false;

    await this.teamModel
      .findByIdAndUpdate(teamId, { ownerId: newOwnerId })
      .exec();

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
    await this.teamModel
      .findByIdAndUpdate(teamId, { $inc: { memberCount: 1 } })
      .exec();
  }

  async decrementMemberCount(teamId: string): Promise<void> {
    await this.teamModel
      .findByIdAndUpdate(teamId, { $inc: { memberCount: -1 } })
      .exec();
  }

  async incrementProjectCount(teamId: string): Promise<void> {
    await this.teamModel
      .findByIdAndUpdate(teamId, { $inc: { projectCount: 1 } })
      .exec();
  }

  async decrementProjectCount(teamId: string): Promise<void> {
    await this.teamModel
      .findByIdAndUpdate(teamId, { $inc: { projectCount: -1 } })
      .exec();
  }

  async getTeamStats(teamId: string): Promise<{
    memberCount: number;
    projectCount: number;
    activityCount: number;
    gitConnections: number;
  } | null> {
    const team = await this.teamModel.findById(teamId).exec();
    if (!team) return null;

    const activityCount = await this.activityModel.countDocuments({ teamId }).exec();

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
    const activity = new this.activityModel({
      teamId,
      userId,
      action,
      targetType,
      targetId,
      metadata,
    });

    return activity.save();
  }

  async getActivityLog(
    teamId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<TeamActivityDocument[]> {
    return this.activityModel
      .find({ teamId })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .exec();
  }

  async getActivityByUser(
    teamId: string,
    userId: string,
    limit: number = 50,
  ): Promise<TeamActivityDocument[]> {
    return this.activityModel
      .find({ teamId, userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async getRecentActivity(
    teamId: string,
    hours: number = 24,
  ): Promise<TeamActivityDocument[]> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    return this.activityModel
      .find({
        teamId,
        createdAt: { $gte: cutoff },
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async searchTeams(query: string, limit: number = 10): Promise<TeamDocument[]> {
    return this.teamModel
      .find({
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { slug: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
        ],
      })
      .limit(limit)
      .exec();
  }

  async getAllTeams(): Promise<TeamDocument[]> {
    return this.teamModel.find().exec();
  }

  async checkSlugAvailability(slug: string): Promise<boolean> {
    const existing = await this.teamModel.findOne({ slug }).exec();
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
