import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { TeamsService } from './teams.service';
import { MembersService } from './members.service';
import { InvitationsService } from './invitations.service';
import { GitConnectionsService } from './git-connections.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateTeamDto,
  UpdateTeamDto,
  InviteMemberDto,
  UpdateMemberRoleDto,
  ConnectGitProviderDto,
  TransferOwnershipDto,
  TeamRole,
  Permission,
  GitProvider,
  InvitationStatus,
} from './dto/teams.dto';

@Controller('api/teams')
@UseGuards(ThrottlerGuard)
export class TeamsController {
  constructor(
    private readonly teamsService: TeamsService,
    private readonly membersService: MembersService,
    private readonly invitationsService: InvitationsService,
    private readonly gitConnectionsService: GitConnectionsService,
  ) {}

  // Team CRUD
  @Post()
  async createTeam(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateTeamDto,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    const team = await this.teamsService.createTeam(userId, dto);

    // Add owner as first member
    await this.membersService.addMember(team.id, userId, TeamRole.OWNER);

    return team;
  }

  @Get()
  async getMyTeams(@CurrentUser('userId') userId: string) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    const memberships = await this.membersService.getUserTeams(userId);

    const teams = await Promise.all(
      memberships.map(async (m) => {
        const team = await this.teamsService.getTeam(m.teamId);
        return { team, role: m.role, joinedAt: m.joinedAt };
      }),
    );

    return teams.filter((t) => t.team !== null);
  }

  @Get(':teamId')
  async getTeam(@Param('teamId') teamId: string) {
    const team = await this.teamsService.getTeam(teamId);
    if (!team) {
      return { error: 'Team not found' };
    }
    return team;
  }

  @Get('slug/:slug')
  async getTeamBySlug(@Param('slug') slug: string) {
    const team = await this.teamsService.getTeamBySlug(slug);
    if (!team) {
      return { error: 'Team not found' };
    }
    return team;
  }

  @Patch(':teamId')
  async updateTeam(
    @Param('teamId') teamId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateTeamDto,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    // Check permission
    const hasPermission = await this.membersService.hasPermission(
      teamId,
      userId,
      Permission.TEAM_MANAGE,
    );
    if (!hasPermission) {
      return { error: 'Permission denied' };
    }

    const team = await this.teamsService.updateTeam(teamId, dto);
    if (!team) {
      return { error: 'Team not found' };
    }
    return team;
  }

  @Delete(':teamId')
  async deleteTeam(
    @Param('teamId') teamId: string,
    @CurrentUser('userId') userId: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    // Only owner can delete
    const member = await this.membersService.getMemberByUserAndTeam(
      teamId,
      userId,
    );
    if (!member || member.role !== TeamRole.OWNER) {
      return { error: 'Only the owner can delete a team' };
    }

    // Clear all related data
    await this.membersService.clearTeamMembers(teamId);
    await this.invitationsService.clearTeamInvitations(teamId);
    await this.gitConnectionsService.clearTeamConnections(teamId);

    const deleted = await this.teamsService.deleteTeam(teamId, userId);
    return { deleted };
  }

  @Post(':teamId/transfer')
  async transferOwnership(
    @Param('teamId') teamId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: TransferOwnershipDto,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    // Verify current owner
    const member = await this.membersService.getMemberByUserAndTeam(
      teamId,
      userId,
    );
    if (!member || member.role !== TeamRole.OWNER) {
      return { error: 'Only the owner can transfer ownership' };
    }

    // Transfer in both services
    await this.membersService.transferOwnership(
      teamId,
      userId,
      dto.newOwnerId,
    );
    await this.teamsService.transferOwnership(teamId, userId, dto.newOwnerId);

    return { transferred: true };
  }

  // Team Stats
  @Get(':teamId/stats')
  async getTeamStats(@Param('teamId') teamId: string) {
    const stats = await this.teamsService.getTeamStats(teamId);
    if (!stats) {
      return { error: 'Team not found' };
    }

    const memberCounts = await this.membersService.countMembersByRole(teamId);
    const invitationStats =
      await this.invitationsService.getInvitationStats(teamId);

    return { ...stats, membersByRole: memberCounts, invitations: invitationStats };
  }

  // Team Activity
  @Get(':teamId/activity')
  async getTeamActivity(
    @Param('teamId') teamId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.teamsService.getActivityLog(
      teamId,
      limit ? parseInt(limit) : 50,
      offset ? parseInt(offset) : 0,
    );
  }

  // Members
  @Get(':teamId/members')
  async getMembers(@Param('teamId') teamId: string) {
    return this.membersService.getTeamMembers(teamId);
  }

  @Post(':teamId/members')
  async addMember(
    @Param('teamId') teamId: string,
    @CurrentUser('userId') userId: string,
    @Body() body: { userId: string; role: TeamRole },
  ) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const hasPermission = await this.membersService.hasPermission(
      teamId,
      userId,
      Permission.TEAM_INVITE,
    );
    if (!hasPermission) {
      return { error: 'Permission denied' };
    }

    // Cannot add as owner
    if (body.role === TeamRole.OWNER) {
      return { error: 'Cannot add member as owner' };
    }

    const member = await this.membersService.addMember(
      teamId,
      body.userId,
      body.role,
      userId,
    );
    await this.teamsService.incrementMemberCount(teamId);
    await this.teamsService.logActivity(
      teamId,
      userId,
      'member.joined',
      'user',
      body.userId,
    );

    return member;
  }

  @Patch(':teamId/members/:memberId/role')
  async updateMemberRole(
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const hasPermission = await this.membersService.hasPermission(
      teamId,
      userId,
      Permission.TEAM_MANAGE,
    );
    if (!hasPermission) {
      return { error: 'Permission denied' };
    }

    const member = await this.membersService.getMember(memberId);
    if (!member || member.teamId !== teamId) {
      return { error: 'Member not found' };
    }

    const updated = await this.membersService.updateRole(
      teamId,
      member.userId,
      dto.role,
    );
    if (!updated) {
      return { error: 'Cannot change role' };
    }

    await this.teamsService.logActivity(
      teamId,
      userId,
      'member.role_changed',
      'user',
      member.userId,
      { newRole: dto.role },
    );

    return updated;
  }

  @Delete(':teamId/members/:memberId')
  async removeMember(
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
    @CurrentUser('userId') userId: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const hasPermission = await this.membersService.hasPermission(
      teamId,
      userId,
      Permission.TEAM_REMOVE,
    );
    if (!hasPermission) {
      return { error: 'Permission denied' };
    }

    const member = await this.membersService.getMember(memberId);
    if (!member || member.teamId !== teamId) {
      return { error: 'Member not found' };
    }

    const removed = await this.membersService.removeMember(
      teamId,
      member.userId,
    );
    if (removed) {
      await this.teamsService.decrementMemberCount(teamId);
      await this.teamsService.logActivity(
        teamId,
        userId,
        'member.removed',
        'user',
        member.userId,
      );
    }

    return { removed };
  }

  @Post(':teamId/leave')
  async leaveTeam(
    @Param('teamId') teamId: string,
    @CurrentUser('userId') userId: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const left = await this.membersService.leaveTeam(teamId, userId);
    if (left) {
      await this.teamsService.decrementMemberCount(teamId);
      await this.teamsService.logActivity(
        teamId,
        userId,
        'member.left',
        'user',
        userId,
      );
    } else {
      return { error: 'Cannot leave team (you may be the owner)' };
    }

    return { left };
  }

  // Invitations
  @Get(':teamId/invitations')
  async getInvitations(
    @Param('teamId') teamId: string,
    @Query('status') status?: InvitationStatus,
  ) {
    return this.invitationsService.getTeamInvitations(teamId, status);
  }

  @Post(':teamId/invitations')
  async inviteMember(
    @Param('teamId') teamId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: InviteMemberDto,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const hasPermission = await this.membersService.hasPermission(
      teamId,
      userId,
      Permission.TEAM_INVITE,
    );
    if (!hasPermission) {
      return { error: 'Permission denied' };
    }

    // Check if already a member
    // This would require looking up user by email - simplified for now

    const invitation = await this.invitationsService.createInvitation(
      teamId,
      dto.email,
      dto.role,
      userId,
    );

    await this.teamsService.logActivity(
      teamId,
      userId,
      'member.invited',
      'invitation',
      invitation.id,
      { email: dto.email, role: dto.role },
    );

    return invitation;
  }

  @Post(':teamId/invitations/bulk')
  async bulkInvite(
    @Param('teamId') teamId: string,
    @CurrentUser('userId') userId: string,
    @Body() body: { emails: string[]; role: TeamRole },
  ) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const hasPermission = await this.membersService.hasPermission(
      teamId,
      userId,
      Permission.TEAM_INVITE,
    );
    if (!hasPermission) {
      return { error: 'Permission denied' };
    }

    const invitations = await this.invitationsService.bulkInvite(
      teamId,
      body.emails,
      body.role,
      userId,
    );

    return { invitations, count: invitations.length };
  }

  @Delete(':teamId/invitations/:invitationId')
  async revokeInvitation(
    @Param('teamId') teamId: string,
    @Param('invitationId') invitationId: string,
    @CurrentUser('userId') userId: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const hasPermission = await this.membersService.hasPermission(
      teamId,
      userId,
      Permission.TEAM_INVITE,
    );
    if (!hasPermission) {
      return { error: 'Permission denied' };
    }

    const revoked = await this.invitationsService.revokeInvitation(invitationId);
    return { revoked };
  }

  @Post(':teamId/invitations/:invitationId/resend')
  async resendInvitation(
    @Param('teamId') teamId: string,
    @Param('invitationId') invitationId: string,
    @CurrentUser('userId') userId: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const hasPermission = await this.membersService.hasPermission(
      teamId,
      userId,
      Permission.TEAM_INVITE,
    );
    if (!hasPermission) {
      return { error: 'Permission denied' };
    }

    const invitation =
      await this.invitationsService.resendInvitation(invitationId);
    if (!invitation) {
      return { error: 'Cannot resend invitation' };
    }

    return invitation;
  }

  // Accept/Decline invitations (public endpoint via token)
  @Post('invitations/accept')
  @HttpCode(HttpStatus.OK)
  async acceptInvitation(
    @Body() body: { token: string },
    @CurrentUser('userId') userId: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const invitation = await this.invitationsService.acceptInvitation(
      body.token,
    );
    if (!invitation) {
      return { error: 'Invalid or expired invitation' };
    }

    if (invitation.status !== InvitationStatus.ACCEPTED) {
      return { error: `Invitation is ${invitation.status}` };
    }

    // Add user as member
    const member = await this.membersService.addMember(
      invitation.teamId,
      userId,
      invitation.role,
      invitation.invitedBy,
    );
    await this.teamsService.incrementMemberCount(invitation.teamId);

    const team = await this.teamsService.getTeam(invitation.teamId);

    return { member, team };
  }

  @Post('invitations/decline')
  @HttpCode(HttpStatus.OK)
  async declineInvitation(@Body() body: { token: string }) {
    const invitation = await this.invitationsService.declineInvitation(
      body.token,
    );
    if (!invitation) {
      return { error: 'Invalid invitation' };
    }

    return { declined: true };
  }

  @Get('invitations/pending')
  async getPendingInvitations(@Headers('x-user-email') email: string) {
    if (!email) {
      return { invitations: [] };
    }

    const invitations =
      await this.invitationsService.getPendingInvitationsByEmail(email);

    // Enrich with team info
    const enriched = await Promise.all(
      invitations.map(async (inv) => {
        const team = await this.teamsService.getTeam(inv.teamId);
        return { ...inv, team };
      }),
    );

    return { invitations: enriched };
  }

  // Git Connections
  @Get(':teamId/git-connections')
  async getGitConnections(@Param('teamId') teamId: string) {
    return this.gitConnectionsService.getTeamConnections(teamId);
  }

  @Post(':teamId/git-connections')
  async connectGitProvider(
    @Param('teamId') teamId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: ConnectGitProviderDto,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const hasPermission = await this.membersService.hasPermission(
      teamId,
      userId,
      Permission.GIT_MANAGE,
    );
    if (!hasPermission) {
      return { error: 'Permission denied' };
    }

    const connection = await this.gitConnectionsService.connectProvider(
      teamId,
      dto,
    );

    await this.teamsService.logActivity(
      teamId,
      userId,
      'git.connected',
      'git_connection',
      connection.id,
      { provider: dto.provider },
    );

    return connection;
  }

  @Delete(':teamId/git-connections/:connectionId')
  async disconnectGitProvider(
    @Param('teamId') teamId: string,
    @Param('connectionId') connectionId: string,
    @CurrentUser('userId') userId: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const hasPermission = await this.membersService.hasPermission(
      teamId,
      userId,
      Permission.GIT_MANAGE,
    );
    if (!hasPermission) {
      return { error: 'Permission denied' };
    }

    const disconnected = await this.gitConnectionsService.disconnectProvider(
      teamId,
      connectionId,
    );

    if (disconnected) {
      await this.teamsService.logActivity(
        teamId,
        userId,
        'git.disconnected',
        'git_connection',
        connectionId,
      );
    }

    return { disconnected };
  }

  @Post(':teamId/git-connections/:connectionId/set-default')
  async setDefaultConnection(
    @Param('teamId') teamId: string,
    @Param('connectionId') connectionId: string,
    @CurrentUser('userId') userId: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const hasPermission = await this.membersService.hasPermission(
      teamId,
      userId,
      Permission.GIT_MANAGE,
    );
    if (!hasPermission) {
      return { error: 'Permission denied' };
    }

    const set = await this.gitConnectionsService.setDefault(teamId, connectionId);
    return { set };
  }

  @Post(':teamId/git-connections/:connectionId/validate')
  async validateConnection(
    @Param('teamId') teamId: string,
    @Param('connectionId') connectionId: string,
  ) {
    const valid =
      await this.gitConnectionsService.validateConnection(connectionId);
    return { valid };
  }

  // OAuth URLs
  @Get('oauth/:provider/url')
  async getOAuthUrl(
    @Param('provider') provider: GitProvider,
    @Query('redirectUri') redirectUri: string,
    @Query('state') state: string,
  ) {
    if (!redirectUri || !state) {
      return { error: 'Missing redirectUri or state' };
    }

    const url = this.gitConnectionsService.getOAuthUrl(
      provider,
      redirectUri,
      state,
    );
    return { url };
  }

  // Check permissions
  @Get(':teamId/permissions')
  async getMyPermissions(
    @Param('teamId') teamId: string,
    @CurrentUser('userId') userId: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    const permissions = await this.membersService.getMemberPermissions(
      teamId,
      userId,
    );
    const member = await this.membersService.getMemberByUserAndTeam(
      teamId,
      userId,
    );

    return { role: member?.role, permissions };
  }

  // Health check
  @Get('health')
  async healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        teams: 'active',
        members: 'active',
        invitations: 'active',
        gitConnections: 'active',
      },
    };
  }
}
