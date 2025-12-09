import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  Team,
  TeamSettings,
  TeamActivity,
  TeamActivityAction,
  CreateTeamDto,
  UpdateTeamDto,
  DEFAULT_TEAM_SETTINGS,
  TeamRole,
} from './dto/teams.dto';

@Injectable()
export class TeamsService {
  private teams: Map<string, Team> = new Map();
  private activities: Map<string, TeamActivity[]> = new Map();

  async createTeam(ownerId: string, dto: CreateTeamDto): Promise<Team> {
    const id = randomUUID();
    const slug = this.generateSlug(dto.name);

    const team: Team = {
      id,
      name: dto.name,
      slug,
      description: dto.description,
      ownerId,
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: {
        ...DEFAULT_TEAM_SETTINGS,
        ...dto.settings,
      },
      gitConnections: [],
      memberCount: 1, // Owner
      projectCount: 0,
    };

    this.teams.set(id, team);

    await this.logActivity(id, ownerId, 'team.created', 'team', id);

    return team;
  }

  async getTeam(teamId: string): Promise<Team | null> {
    return this.teams.get(teamId) || null;
  }

  async getTeamBySlug(slug: string): Promise<Team | null> {
    for (const team of this.teams.values()) {
      if (team.slug === slug) {
        return team;
      }
    }
    return null;
  }

  async getTeamsByOwner(ownerId: string): Promise<Team[]> {
    const teams: Team[] = [];
    for (const team of this.teams.values()) {
      if (team.ownerId === ownerId) {
        teams.push(team);
      }
    }
    return teams;
  }

  async updateTeam(teamId: string, dto: UpdateTeamDto): Promise<Team | null> {
    const team = this.teams.get(teamId);
    if (!team) return null;

    const updatedTeam: Team = {
      ...team,
      name: dto.name ?? team.name,
      description: dto.description ?? team.description,
      avatarUrl: dto.avatarUrl ?? team.avatarUrl,
      settings: dto.settings
        ? { ...team.settings, ...dto.settings }
        : team.settings,
      slug: dto.name ? this.generateSlug(dto.name) : team.slug,
      updatedAt: new Date(),
    };

    this.teams.set(teamId, updatedTeam);

    await this.logActivity(teamId, team.ownerId, 'team.updated', 'team', teamId);

    return updatedTeam;
  }

  async deleteTeam(teamId: string, userId: string): Promise<boolean> {
    const team = this.teams.get(teamId);
    if (!team) return false;

    await this.logActivity(teamId, userId, 'team.deleted', 'team', teamId);

    this.teams.delete(teamId);
    this.activities.delete(teamId);

    return true;
  }

  async updateSettings(
    teamId: string,
    settings: Partial<TeamSettings>,
  ): Promise<TeamSettings | null> {
    const team = this.teams.get(teamId);
    if (!team) return null;

    team.settings = {
      ...team.settings,
      ...settings,
    };
    team.updatedAt = new Date();

    this.teams.set(teamId, team);

    return team.settings;
  }

  async transferOwnership(
    teamId: string,
    currentOwnerId: string,
    newOwnerId: string,
  ): Promise<boolean> {
    const team = this.teams.get(teamId);
    if (!team || team.ownerId !== currentOwnerId) return false;

    team.ownerId = newOwnerId;
    team.updatedAt = new Date();

    this.teams.set(teamId, team);

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
    const team = this.teams.get(teamId);
    if (team) {
      team.memberCount++;
      this.teams.set(teamId, team);
    }
  }

  async decrementMemberCount(teamId: string): Promise<void> {
    const team = this.teams.get(teamId);
    if (team && team.memberCount > 0) {
      team.memberCount--;
      this.teams.set(teamId, team);
    }
  }

  async incrementProjectCount(teamId: string): Promise<void> {
    const team = this.teams.get(teamId);
    if (team) {
      team.projectCount++;
      this.teams.set(teamId, team);
    }
  }

  async decrementProjectCount(teamId: string): Promise<void> {
    const team = this.teams.get(teamId);
    if (team && team.projectCount > 0) {
      team.projectCount--;
      this.teams.set(teamId, team);
    }
  }

  async getTeamStats(teamId: string): Promise<{
    memberCount: number;
    projectCount: number;
    activityCount: number;
    gitConnections: number;
  } | null> {
    const team = this.teams.get(teamId);
    if (!team) return null;

    const activities = this.activities.get(teamId) || [];

    return {
      memberCount: team.memberCount,
      projectCount: team.projectCount,
      activityCount: activities.length,
      gitConnections: team.gitConnections.length,
    };
  }

  async logActivity(
    teamId: string,
    userId: string,
    action: TeamActivityAction,
    resourceType: string,
    resourceId: string,
    metadata?: Record<string, any>,
  ): Promise<TeamActivity> {
    const activity: TeamActivity = {
      id: randomUUID(),
      teamId,
      userId,
      action,
      resourceType,
      resourceId,
      metadata,
      timestamp: new Date(),
    };

    const teamActivities = this.activities.get(teamId) || [];
    teamActivities.unshift(activity);

    // Keep only last 1000 activities
    if (teamActivities.length > 1000) {
      teamActivities.pop();
    }

    this.activities.set(teamId, teamActivities);

    return activity;
  }

  async getActivityLog(
    teamId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<TeamActivity[]> {
    const activities = this.activities.get(teamId) || [];
    return activities.slice(offset, offset + limit);
  }

  async getActivityByUser(
    teamId: string,
    userId: string,
    limit: number = 50,
  ): Promise<TeamActivity[]> {
    const activities = this.activities.get(teamId) || [];
    return activities.filter((a) => a.userId === userId).slice(0, limit);
  }

  async getRecentActivity(
    teamId: string,
    hours: number = 24,
  ): Promise<TeamActivity[]> {
    const activities = this.activities.get(teamId) || [];
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    return activities.filter((a) => a.timestamp >= cutoff);
  }

  async searchTeams(query: string, limit: number = 10): Promise<Team[]> {
    const results: Team[] = [];
    const lowerQuery = query.toLowerCase();

    for (const team of this.teams.values()) {
      if (
        team.name.toLowerCase().includes(lowerQuery) ||
        team.slug.includes(lowerQuery) ||
        team.description?.toLowerCase().includes(lowerQuery)
      ) {
        results.push(team);
        if (results.length >= limit) break;
      }
    }

    return results;
  }

  async getAllTeams(): Promise<Team[]> {
    return Array.from(this.teams.values());
  }

  async checkSlugAvailability(slug: string): Promise<boolean> {
    for (const team of this.teams.values()) {
      if (team.slug === slug) {
        return false;
      }
    }
    return true;
  }

  private generateSlug(name: string): string {
    let slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check if slug exists and append number if needed
    let counter = 1;
    let finalSlug = slug;
    while (!this.checkSlugAvailabilitySync(finalSlug)) {
      finalSlug = `${slug}-${counter}`;
      counter++;
    }

    return finalSlug;
  }

  private checkSlugAvailabilitySync(slug: string): boolean {
    for (const team of this.teams.values()) {
      if (team.slug === slug) {
        return false;
      }
    }
    return true;
  }
}
