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
} from '@nestjs/common';
import { TeamsService } from './teams.service';
import { MembersService } from './members.service';
import { InvitationsService } from './invitations.service';
import { GitConnectionsService } from './git-connections.service';
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
    @Headers('x-user-id') userId: string,
    @Body() dto: CreateTeamDto,
  ) {
    const safeUserId = userId || 'default-user';
    const team = await this.teamsService.createTeam(safeUserId, dto);

    // Add owner as first member
    await this.membersService.addMember(team.id, safeUserId, TeamRole.OWNER);

    return team;
  }

  @Get()
  async getMyTeams(@Headers('x-user-id') userId: string) {
    const safeUserId = userId || 'default-user';
    const memberships = await this.membersService.getUserTeams(safeUserId);

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
    @Headers('x-user-id') userId: string,
    @Body() dto: UpdateTeamDto,
  ) {
    const safeUserId = userId || 'default-user';

    // Check permission
    const hasPermission = await this.membersService.hasPermission(
      teamId,
      safeUserId,
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
    @Headers('x-user-id') userId: string,
  ) {
    const safeUserId = userId || 'default-user';

    // Only owner can delete
    const member = await this.membersService.getMemberByUserAndTeam(
      teamId,
      safeUserId,
    );
    if (!member || member.role !== TeamRole.OWNER) {
      return { error: 'Only the owner can delete a team' };
    }

    // Clear all related data
    await this.membersService.clearTeamMembers(teamId);
    await this.invitationsService.clearTeamInvitations(teamId);
    await this.gitConnectionsService.clearTeamConnections(teamId);

    const deleted = await this.teamsService.deleteTeam(teamId, safeUserId);
    return { deleted };
  }

  @Post(':teamId/transfer')
  async transferOwnership(
    @Param('teamId') teamId: string,
    @Headers('x-user-id') userId: string,
    @Body() dto: TransferOwnershipDto,
  ) {
    const safeUserId = userId || 'default-user';

    // Verify current owner
    const member = await this.membersService.getMemberByUserAndTeam(
      teamId,
      safeUserId,
    );
    if (!member || member.role !== TeamRole.OWNER) {
      return { error: 'Only the owner can transfer ownership' };
    }

    // Transfer in both services
    await this.membersService.transferOwnership(
      teamId,
      safeUserId,
      dto.newOwnerId,
    );
    await this.teamsService.transferOwnership(teamId, safeUserId, dto.newOwnerId);

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
    @Headers('x-user-id') userId: string,
    @Body() body: { userId: string; role: TeamRole },
  ) {
    const safeUserId = userId || 'default-user';

    const hasPermission = await this.membersService.hasPermission(
      teamId,
      safeUserId,
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
      safeUserId,
    );
    await this.teamsService.incrementMemberCount(teamId);
    await this.teamsService.logActivity(
      teamId,
      safeUserId,
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
    @Headers('x-user-id') userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    const safeUserId = userId || 'default-user';

    const hasPermission = await this.membersService.hasPermission(
      teamId,
      safeUserId,
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
      safeUserId,
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
    @Headers('x-user-id') userId: string,
  ) {
    const safeUserId = userId || 'default-user';

    const hasPermission = await this.membersService.hasPermission(
      teamId,
      safeUserId,
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
        safeUserId,
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
    @Headers('x-user-id') userId: string,
  ) {
    const safeUserId = userId || 'default-user';

    const left = await this.membersService.leaveTeam(teamId, safeUserId);
    if (left) {
      await this.teamsService.decrementMemberCount(teamId);
      await this.teamsService.logActivity(
        teamId,
        safeUserId,
        'member.left',
        'user',
        safeUserId,
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
    @Headers('x-user-id') userId: string,
    @Body() dto: InviteMemberDto,
  ) {
    const safeUserId = userId || 'default-user';

    const hasPermission = await this.membersService.hasPermission(
      teamId,
      safeUserId,
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
      safeUserId,
    );

    await this.teamsService.logActivity(
      teamId,
      safeUserId,
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
    @Headers('x-user-id') userId: string,
    @Body() body: { emails: string[]; role: TeamRole },
  ) {
    const safeUserId = userId || 'default-user';

    const hasPermission = await this.membersService.hasPermission(
      teamId,
      safeUserId,
      Permission.TEAM_INVITE,
    );
    if (!hasPermission) {
      return { error: 'Permission denied' };
    }

    const invitations = await this.invitationsService.bulkInvite(
      teamId,
      body.emails,
      body.role,
      safeUserId,
    );

    return { invitations, count: invitations.length };
  }

  @Delete(':teamId/invitations/:invitationId')
  async revokeInvitation(
    @Param('teamId') teamId: string,
    @Param('invitationId') invitationId: string,
    @Headers('x-user-id') userId: string,
  ) {
    const safeUserId = userId || 'default-user';

    const hasPermission = await this.membersService.hasPermission(
      teamId,
      safeUserId,
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
    @Headers('x-user-id') userId: string,
  ) {
    const safeUserId = userId || 'default-user';

    const hasPermission = await this.membersService.hasPermission(
      teamId,
      safeUserId,
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
    @Headers('x-user-id') userId: string,
  ) {
    const safeUserId = userId || 'default-user';

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
      safeUserId,
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
    @Headers('x-user-id') userId: string,
    @Body() dto: ConnectGitProviderDto,
  ) {
    const safeUserId = userId || 'default-user';

    const hasPermission = await this.membersService.hasPermission(
      teamId,
      safeUserId,
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
      safeUserId,
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
    @Headers('x-user-id') userId: string,
  ) {
    const safeUserId = userId || 'default-user';

    const hasPermission = await this.membersService.hasPermission(
      teamId,
      safeUserId,
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
        safeUserId,
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
    @Headers('x-user-id') userId: string,
  ) {
    const safeUserId = userId || 'default-user';

    const hasPermission = await this.membersService.hasPermission(
      teamId,
      safeUserId,
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
    @Headers('x-user-id') userId: string,
  ) {
    const safeUserId = userId || 'default-user';
    const permissions = await this.membersService.getMemberPermissions(
      teamId,
      safeUserId,
    );
    const member = await this.membersService.getMemberByUserAndTeam(
      teamId,
      safeUserId,
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
