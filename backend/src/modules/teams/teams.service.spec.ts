import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { TeamsService } from './teams.service';
import { MembersService } from './members.service';
import { InvitationsService } from './invitations.service';
import { GitConnectionsService } from './git-connections.service';
import { GitLabProvider } from './git-providers/gitlab.provider';
import { BitbucketProvider } from './git-providers/bitbucket.provider';
import { TokenEncryptionService } from '../security/token-encryption.service';
import {
  TeamRole,
  Permission,
  InvitationStatus,
  GitProvider,
  ROLE_PERMISSIONS,
} from './dto/teams.dto';
import { IRepository } from '../../providers/interfaces/database-provider.interface';
import {
  TEAM_REPOSITORY,
  TEAM_ACTIVITY_REPOSITORY,
  TEAM_MEMBER_REPOSITORY,
  TEAM_INVITATION_REPOSITORY,
  GIT_CONNECTION_REPOSITORY,
} from '../../providers/repository-tokens';

// Helper to create a mock IRepository
function createMockRepository<T = any>(): jest.Mocked<IRepository<T>> {
  return {
    findById: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    insertMany: jest.fn(),
  };
}

// Helper to create a mock document with _id
function createMockDocument(data: Record<string, any> = {}) {
  return {
    _id: data._id || new Types.ObjectId(),
    ...data,
    toObject: () => ({ _id: data._id || new Types.ObjectId(), ...data }),
  };
}

describe('TeamsService', () => {
  let teamsService: TeamsService;
  let teamRepo: jest.Mocked<IRepository<any>>;
  let activityRepo: jest.Mocked<IRepository<any>>;

  beforeEach(async () => {
    teamRepo = createMockRepository();
    activityRepo = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        {
          provide: TEAM_REPOSITORY,
          useValue: teamRepo,
        },
        {
          provide: TEAM_ACTIVITY_REPOSITORY,
          useValue: activityRepo,
        },
      ],
    }).compile();

    teamsService = module.get<TeamsService>(TeamsService);
  });

  describe('createTeam', () => {
    it('should create a team with default settings', async () => {
      teamRepo.findOne.mockResolvedValue(null);
      teamRepo.create.mockImplementation(async (data: any) =>
        createMockDocument(data),
      );
      activityRepo.create.mockImplementation(async (data: any) =>
        createMockDocument(data),
      );

      const team = await teamsService.createTeam('user-1', {
        name: 'My Team',
        description: 'Test team',
      });

      expect(team).toBeDefined();
      expect(team.name).toBe('My Team');
      expect(team.slug).toBe('my-team');
      expect(team.ownerId).toBe('user-1');
      expect(team.settings.defaultRole).toBe(TeamRole.MEMBER);
    });

    it('should generate unique slugs', async () => {
      activityRepo.create.mockImplementation(async (data: any) =>
        createMockDocument(data),
      );

      // First team - slug available
      teamRepo.findOne.mockResolvedValueOnce(null);
      teamRepo.create.mockImplementation(async (data: any) =>
        createMockDocument(data),
      );

      const team1 = await teamsService.createTeam('user-1', {
        name: 'Test Team',
      });
      expect(team1.slug).toBe('test-team');

      // Second team - slug taken, should get -1 suffix
      teamRepo.findOne
        .mockResolvedValueOnce({ slug: 'test-team' }) // first slug check: taken
        .mockResolvedValueOnce(null); // test-team-1: available

      const team2 = await teamsService.createTeam('user-2', {
        name: 'Test Team',
      });
      expect(team2.slug).toBe('test-team-1');
    });
  });

  describe('getTeam', () => {
    it('should return team by id', async () => {
      const mockTeam = createMockDocument({
        name: 'Test',
        slug: 'test',
        ownerId: 'user-1',
      });

      teamRepo.findById.mockResolvedValue(mockTeam);

      const team = await teamsService.getTeam(mockTeam._id.toString());
      expect(team).toBeDefined();
      expect(team!.name).toBe('Test');
    });

    it('should return null for non-existent team', async () => {
      teamRepo.findById.mockRejectedValue(new Error('not found'));

      const team = await teamsService.getTeam('non-existent');
      expect(team).toBeNull();
    });
  });

  describe('getTeamBySlug', () => {
    it('should find team by slug', async () => {
      const mockTeam = createMockDocument({
        name: 'My Awesome Team',
        slug: 'my-awesome-team',
        ownerId: 'user-1',
      });

      teamRepo.findOne.mockResolvedValue(mockTeam);

      const team = await teamsService.getTeamBySlug('my-awesome-team');
      expect(team).toBeDefined();
      expect(team!.name).toBe('My Awesome Team');
    });
  });

  describe('updateTeam', () => {
    it('should update team properties', async () => {
      const mockTeam = createMockDocument({
        name: 'Test',
        slug: 'test',
        ownerId: 'user-1',
        settings: { defaultRole: TeamRole.MEMBER },
      });

      teamRepo.findById.mockResolvedValue(mockTeam);

      const updatedTeam = createMockDocument({
        ...mockTeam,
        name: 'Updated Name',
        description: 'New description',
      });

      teamRepo.update.mockResolvedValue(updatedTeam);
      teamRepo.findOne.mockResolvedValue(null); // slug availability check
      activityRepo.create.mockImplementation(async (data: any) =>
        createMockDocument(data),
      );

      const result = await teamsService.updateTeam(mockTeam._id.toString(), {
        name: 'Updated Name',
        description: 'New description',
      });

      expect(result).toBeDefined();
      expect(result!.name).toBe('Updated Name');
      expect(result!.description).toBe('New description');
    });
  });

  describe('deleteTeam', () => {
    it('should delete a team', async () => {
      const mockTeam = createMockDocument({
        name: 'Test',
        slug: 'test',
        ownerId: 'user-1',
      });

      teamRepo.findById.mockResolvedValue(mockTeam);
      teamRepo.delete.mockResolvedValue(true);
      activityRepo.create.mockImplementation(async (data: any) =>
        createMockDocument(data),
      );
      activityRepo.deleteMany.mockResolvedValue({ deletedCount: 1 });

      const deleted = await teamsService.deleteTeam(
        mockTeam._id.toString(),
        'user-1',
      );
      expect(deleted).toBe(true);
    });
  });

  describe('activity logging', () => {
    it('should log team activity', async () => {
      const teamId = new Types.ObjectId().toString();

      activityRepo.create.mockImplementation(async (data: any) =>
        createMockDocument(data),
      );

      const activity = await teamsService.logActivity(
        teamId,
        'user-1',
        'team.created',
        'team',
        teamId,
      );

      expect(activity).toBeDefined();
      expect(activity.teamId).toBe(teamId);
      expect(activity.action).toBe('team.created');
    });

    it('should get activity log', async () => {
      const teamId = new Types.ObjectId().toString();
      const mockActivities = [
        createMockDocument({
          teamId,
          action: 'team.created',
          userId: 'user-1',
        }),
      ];

      activityRepo.find.mockResolvedValue(mockActivities);

      const activities = await teamsService.getActivityLog(teamId);
      expect(activities.length).toBeGreaterThan(0);
    });

    it('should get recent activity', async () => {
      const teamId = new Types.ObjectId().toString();
      const mockActivities = [
        createMockDocument({
          teamId,
          action: 'member.invited',
          userId: 'user-1',
        }),
      ];

      activityRepo.find.mockResolvedValue(mockActivities);

      const recent = await teamsService.getRecentActivity(teamId, 24);
      expect(recent.length).toBeGreaterThan(0);
    });
  });

  describe('member counts', () => {
    it('should increment member count', async () => {
      teamRepo.update.mockResolvedValue(null);

      await teamsService.incrementMemberCount('team-id');
      expect(teamRepo.update).toHaveBeenCalledWith('team-id', {
        $inc: { memberCount: 1 },
      });
    });

    it('should decrement member count', async () => {
      teamRepo.update.mockResolvedValue(null);

      await teamsService.decrementMemberCount('team-id');
      expect(teamRepo.update).toHaveBeenCalledWith('team-id', {
        $inc: { memberCount: -1 },
      });
    });
  });

  describe('searchTeams', () => {
    it('should search teams by name', async () => {
      const mockTeams = [
        createMockDocument({ name: 'Alpha Team', slug: 'alpha-team' }),
        createMockDocument({ name: 'Beta Team', slug: 'beta-team' }),
      ];

      teamRepo.find.mockResolvedValue(mockTeams);

      const results = await teamsService.searchTeams('team');
      expect(results.length).toBe(2);
    });
  });
});

describe('MembersService', () => {
  let membersService: MembersService;
  let memberRepo: jest.Mocked<IRepository<any>>;

  beforeEach(async () => {
    memberRepo = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembersService,
        {
          provide: TEAM_MEMBER_REPOSITORY,
          useValue: memberRepo,
        },
      ],
    }).compile();

    membersService = module.get<MembersService>(MembersService);
  });

  describe('addMember', () => {
    it('should add a member to a team', async () => {
      memberRepo.findOne.mockResolvedValue(null);
      memberRepo.create.mockImplementation(async (data: any) =>
        createMockDocument(data),
      );

      const member = await membersService.addMember(
        'team-1',
        'user-1',
        TeamRole.MEMBER,
      );

      expect(member).toBeDefined();
      expect(member.teamId).toBe('team-1');
      expect(member.userId).toBe('user-1');
      expect(member.role).toBe(TeamRole.MEMBER);
    });

    it('should not duplicate members', async () => {
      const existingMember = createMockDocument({
        teamId: 'team-1',
        userId: 'user-1',
        role: TeamRole.MEMBER,
      });

      memberRepo.findOne.mockResolvedValue(existingMember);

      const duplicate = await membersService.addMember(
        'team-1',
        'user-1',
        TeamRole.ADMIN,
      );

      // Should return existing member
      expect(duplicate.role).toBe(TeamRole.MEMBER);
    });
  });

  describe('removeMember', () => {
    it('should remove a member', async () => {
      const member = createMockDocument({
        teamId: 'team-1',
        userId: 'user-1',
        role: TeamRole.MEMBER,
      });

      memberRepo.findOne.mockResolvedValue(member);
      memberRepo.delete.mockResolvedValue(true);

      const removed = await membersService.removeMember('team-1', 'user-1');
      expect(removed).toBe(true);
    });

    it('should not remove owner', async () => {
      const ownerMember = createMockDocument({
        teamId: 'team-1',
        userId: 'user-1',
        role: TeamRole.OWNER,
      });

      memberRepo.findOne.mockResolvedValue(ownerMember);

      const removed = await membersService.removeMember('team-1', 'user-1');
      expect(removed).toBe(false);
    });
  });

  describe('getTeamMembers', () => {
    it('should return all team members sorted by role', async () => {
      const members = [
        createMockDocument({
          teamId: 'team-1',
          userId: 'user-1',
          role: TeamRole.VIEWER,
        }),
        createMockDocument({
          teamId: 'team-1',
          userId: 'user-2',
          role: TeamRole.OWNER,
        }),
        createMockDocument({
          teamId: 'team-1',
          userId: 'user-3',
          role: TeamRole.ADMIN,
        }),
      ];

      memberRepo.find.mockResolvedValue(members);

      const result = await membersService.getTeamMembers('team-1');

      expect(result.length).toBe(3);
      expect(result[0].role).toBe(TeamRole.OWNER);
      expect(result[1].role).toBe(TeamRole.ADMIN);
      expect(result[2].role).toBe(TeamRole.VIEWER);
    });
  });

  describe('updateRole', () => {
    it('should update member role', async () => {
      const member = createMockDocument({
        teamId: 'team-1',
        userId: 'user-1',
        role: TeamRole.MEMBER,
      });

      memberRepo.findOne.mockResolvedValue(member);

      const updatedMember = createMockDocument({
        ...member,
        role: TeamRole.ADMIN,
      });

      memberRepo.update.mockResolvedValue(updatedMember);

      const updated = await membersService.updateRole(
        'team-1',
        'user-1',
        TeamRole.ADMIN,
      );
      expect(updated).toBeDefined();
      expect(updated!.role).toBe(TeamRole.ADMIN);
    });

    it('should not update owner role', async () => {
      const ownerMember = createMockDocument({
        teamId: 'team-1',
        userId: 'user-1',
        role: TeamRole.OWNER,
      });

      memberRepo.findOne.mockResolvedValue(ownerMember);

      const updated = await membersService.updateRole(
        'team-1',
        'user-1',
        TeamRole.ADMIN,
      );
      expect(updated).toBeNull();
    });

    it('should not promote to owner', async () => {
      const member = createMockDocument({
        teamId: 'team-1',
        userId: 'user-1',
        role: TeamRole.ADMIN,
      });

      memberRepo.findOne.mockResolvedValue(member);

      const updated = await membersService.updateRole(
        'team-1',
        'user-1',
        TeamRole.OWNER,
      );
      expect(updated).toBeNull();
    });
  });

  describe('hasPermission', () => {
    it('should check permissions correctly', async () => {
      const ownerMember = createMockDocument({
        teamId: 'team-1',
        userId: 'user-1',
        role: TeamRole.OWNER,
      });

      const viewerMember = createMockDocument({
        teamId: 'team-1',
        userId: 'user-2',
        role: TeamRole.VIEWER,
      });

      memberRepo.findOne
        .mockResolvedValueOnce(ownerMember)
        .mockResolvedValueOnce(viewerMember)
        .mockResolvedValueOnce(viewerMember);

      expect(
        await membersService.hasPermission(
          'team-1',
          'user-1',
          Permission.TEAM_MANAGE,
        ),
      ).toBe(true);
      expect(
        await membersService.hasPermission(
          'team-1',
          'user-2',
          Permission.TEAM_MANAGE,
        ),
      ).toBe(false);
      expect(
        await membersService.hasPermission(
          'team-1',
          'user-2',
          Permission.PROJECT_READ,
        ),
      ).toBe(true);
    });
  });

  describe('hasRole', () => {
    it('should check role hierarchy', async () => {
      const adminMember = createMockDocument({
        teamId: 'team-1',
        userId: 'user-1',
        role: TeamRole.ADMIN,
      });

      memberRepo.findOne.mockResolvedValue(adminMember);

      expect(
        await membersService.hasRole('team-1', 'user-1', TeamRole.MEMBER),
      ).toBe(true);
      expect(
        await membersService.hasRole('team-1', 'user-1', TeamRole.ADMIN),
      ).toBe(true);
      expect(
        await membersService.hasRole('team-1', 'user-1', TeamRole.OWNER),
      ).toBe(false);
    });
  });

  describe('transferOwnership', () => {
    it('should transfer ownership', async () => {
      const currentOwner = createMockDocument({
        teamId: 'team-1',
        userId: 'user-1',
        role: TeamRole.OWNER,
      });

      const newOwner = createMockDocument({
        teamId: 'team-1',
        userId: 'user-2',
        role: TeamRole.ADMIN,
      });

      memberRepo.findOne
        .mockResolvedValueOnce(currentOwner)
        .mockResolvedValueOnce(newOwner);

      memberRepo.update.mockResolvedValue(null);

      const transferred = await membersService.transferOwnership(
        'team-1',
        'user-1',
        'user-2',
      );
      expect(transferred).toBe(true);
    });
  });

  describe('getUserTeams', () => {
    it('should return all teams for a user', async () => {
      const memberships = [
        createMockDocument({
          teamId: 'team-1',
          userId: 'user-1',
          role: TeamRole.OWNER,
        }),
        createMockDocument({
          teamId: 'team-2',
          userId: 'user-1',
          role: TeamRole.MEMBER,
        }),
        createMockDocument({
          teamId: 'team-3',
          userId: 'user-1',
          role: TeamRole.ADMIN,
        }),
      ];

      memberRepo.find.mockResolvedValue(memberships);

      const teams = await membersService.getUserTeams('user-1');
      expect(teams.length).toBe(3);
    });
  });
});

describe('InvitationsService', () => {
  let invitationsService: InvitationsService;
  let invitationRepo: jest.Mocked<IRepository<any>>;

  beforeEach(async () => {
    invitationRepo = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationsService,
        {
          provide: TEAM_INVITATION_REPOSITORY,
          useValue: invitationRepo,
        },
      ],
    }).compile();

    invitationsService = module.get<InvitationsService>(InvitationsService);
  });

  describe('createInvitation', () => {
    it('should create an invitation', async () => {
      invitationRepo.findOne.mockResolvedValue(null);
      invitationRepo.create.mockImplementation(async (data: any) =>
        createMockDocument(data),
      );

      const invitation = await invitationsService.createInvitation(
        'team-1',
        'test@example.com',
        TeamRole.MEMBER,
        'user-1',
      );

      expect(invitation).toBeDefined();
      expect(invitation.email).toBe('test@example.com');
      expect(invitation.role).toBe(TeamRole.MEMBER);
      expect(invitation.status).toBe(InvitationStatus.PENDING);
      expect(invitation.token).toBeDefined();
    });

    it('should update existing pending invitation', async () => {
      const existingInvitation = createMockDocument({
        teamId: 'team-1',
        email: 'test@example.com',
        role: TeamRole.MEMBER,
        status: InvitationStatus.PENDING,
        token: 'old-token',
      });

      invitationRepo.findOne.mockResolvedValue(existingInvitation);

      const updatedInvitation = createMockDocument({
        ...existingInvitation,
        role: TeamRole.ADMIN,
        token: 'new-token',
      });

      invitationRepo.update.mockResolvedValue(updatedInvitation);

      const result = await invitationsService.createInvitation(
        'team-1',
        'test@example.com',
        TeamRole.ADMIN,
        'user-2',
      );

      expect(result._id).toEqual(existingInvitation._id);
      expect(result.role).toBe(TeamRole.ADMIN);
    });
  });

  describe('acceptInvitation', () => {
    it('should accept a pending invitation', async () => {
      const invitation = createMockDocument({
        teamId: 'team-1',
        email: 'test@example.com',
        role: TeamRole.MEMBER,
        status: InvitationStatus.PENDING,
        token: 'valid-token',
        expiresAt: new Date(Date.now() + 86400000),
      });

      invitationRepo.findOne.mockResolvedValue(invitation);

      const acceptedInvitation = createMockDocument({
        ...invitation,
        status: InvitationStatus.ACCEPTED,
        acceptedAt: new Date(),
      });

      invitationRepo.update.mockResolvedValue(acceptedInvitation);

      const accepted = await invitationsService.acceptInvitation('valid-token');
      expect(accepted).toBeDefined();
      expect(accepted!.status).toBe(InvitationStatus.ACCEPTED);
      expect(accepted!.acceptedAt).toBeDefined();
    });

    it('should return null for invalid token', async () => {
      invitationRepo.findOne.mockResolvedValue(null);

      const result = await invitationsService.acceptInvitation('invalid-token');
      expect(result).toBeNull();
    });
  });

  describe('declineInvitation', () => {
    it('should decline a pending invitation', async () => {
      const invitation = createMockDocument({
        teamId: 'team-1',
        email: 'test@example.com',
        role: TeamRole.MEMBER,
        status: InvitationStatus.PENDING,
        token: 'valid-token',
        expiresAt: new Date(Date.now() + 86400000),
      });

      invitationRepo.findOne.mockResolvedValue(invitation);

      const declinedInvitation = createMockDocument({
        ...invitation,
        status: InvitationStatus.DECLINED,
      });

      invitationRepo.update.mockResolvedValue(declinedInvitation);

      const declined =
        await invitationsService.declineInvitation('valid-token');
      expect(declined).toBeDefined();
      expect(declined!.status).toBe(InvitationStatus.DECLINED);
    });
  });

  describe('revokeInvitation', () => {
    it('should revoke a pending invitation', async () => {
      const invitation = createMockDocument({
        teamId: 'team-1',
        email: 'test@example.com',
        role: TeamRole.MEMBER,
        status: InvitationStatus.PENDING,
        token: 'token',
      });

      invitationRepo.findById.mockResolvedValue(invitation);

      invitationRepo.update.mockResolvedValue({
        ...invitation,
        status: InvitationStatus.REVOKED,
      });

      const revoked = await invitationsService.revokeInvitation(
        invitation._id.toString(),
      );
      expect(revoked).toBe(true);
    });
  });

  describe('resendInvitation', () => {
    it('should resend and generate new token', async () => {
      const invitation = createMockDocument({
        teamId: 'team-1',
        email: 'test@example.com',
        role: TeamRole.MEMBER,
        status: InvitationStatus.PENDING,
        token: 'original-token',
      });

      invitationRepo.findById.mockResolvedValue(invitation);

      const resentInvitation = createMockDocument({
        ...invitation,
        token: 'new-token',
      });

      invitationRepo.update.mockResolvedValue(resentInvitation);

      const resent = await invitationsService.resendInvitation(
        invitation._id.toString(),
      );
      expect(resent).toBeDefined();
      expect(resent!.token).not.toBe('original-token');
    });
  });

  describe('getTeamInvitations', () => {
    it('should get all team invitations', async () => {
      const invitations = [
        createMockDocument({
          teamId: 'team-1',
          email: 'a@test.com',
          role: TeamRole.MEMBER,
        }),
        createMockDocument({
          teamId: 'team-1',
          email: 'b@test.com',
          role: TeamRole.ADMIN,
        }),
      ];

      invitationRepo.find.mockResolvedValue(invitations);

      const result = await invitationsService.getTeamInvitations('team-1');
      expect(result.length).toBe(2);
    });

    it('should filter by status', async () => {
      const pendingInvitations = [
        createMockDocument({
          teamId: 'team-1',
          email: 'b@test.com',
          status: InvitationStatus.PENDING,
        }),
      ];

      invitationRepo.find.mockResolvedValue(pendingInvitations);

      const pending = await invitationsService.getTeamInvitations(
        'team-1',
        InvitationStatus.PENDING,
      );
      expect(pending.length).toBe(1);
    });
  });

  describe('bulkInvite', () => {
    it('should create multiple invitations', async () => {
      invitationRepo.findOne.mockResolvedValue(null);
      invitationRepo.create.mockImplementation(async (data: any) =>
        createMockDocument(data),
      );

      const invitations = await invitationsService.bulkInvite(
        'team-1',
        ['a@test.com', 'b@test.com', 'c@test.com'],
        TeamRole.MEMBER,
        'user-1',
      );

      expect(invitations.length).toBe(3);
    });
  });

  describe('getInvitationStats', () => {
    it('should return invitation statistics', async () => {
      invitationRepo.count
        .mockResolvedValueOnce(1) // pending
        .mockResolvedValueOnce(1) // accepted
        .mockResolvedValueOnce(0) // declined
        .mockResolvedValueOnce(0) // expired
        .mockResolvedValueOnce(0); // revoked

      const stats = await invitationsService.getInvitationStats('team-1');

      expect(stats.accepted).toBe(1);
      expect(stats.pending).toBe(1);
    });
  });
});

describe('GitConnectionsService', () => {
  let gitConnectionsService: GitConnectionsService;
  let connectionRepo: jest.Mocked<IRepository<any>>;
  let gitlabProvider: GitLabProvider;
  let bitbucketProvider: BitbucketProvider;

  beforeEach(async () => {
    connectionRepo = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitConnectionsService,
        {
          provide: GIT_CONNECTION_REPOSITORY,
          useValue: connectionRepo,
        },
        {
          provide: GitLabProvider,
          useValue: {
            exchangeCodeForToken: jest.fn().mockResolvedValue({
              access_token: 'gitlab-token',
              refresh_token: 'gitlab-refresh',
              expires_in: 7200,
            }),
            getGroups: jest.fn().mockResolvedValue([]),
            validateToken: jest.fn().mockResolvedValue(true),
            getOAuthUrl: jest.fn().mockReturnValue('https://gitlab.com/oauth'),
            refreshToken: jest.fn().mockResolvedValue({
              access_token: 'new-gitlab-token',
              refresh_token: 'new-gitlab-refresh',
              expires_in: 7200,
            }),
          },
        },
        {
          provide: BitbucketProvider,
          useValue: {
            exchangeCodeForToken: jest.fn().mockResolvedValue({
              access_token: 'bitbucket-token',
              refresh_token: 'bitbucket-refresh',
              expires_in: 7200,
            }),
            getWorkspaces: jest.fn().mockResolvedValue([]),
            validateToken: jest.fn().mockResolvedValue(true),
            getOAuthUrl: jest
              .fn()
              .mockReturnValue('https://bitbucket.org/oauth'),
            refreshToken: jest.fn().mockResolvedValue({
              access_token: 'new-bitbucket-token',
              refresh_token: 'new-bitbucket-refresh',
              expires_in: 7200,
            }),
          },
        },
        {
          provide: TokenEncryptionService,
          useValue: {
            encrypt: jest
              .fn()
              .mockImplementation((token: string) => `encrypted_${token}`),
            decrypt: jest
              .fn()
              .mockImplementation((token: string) =>
                token.replace('encrypted_', ''),
              ),
            isEncrypted: jest.fn().mockReturnValue(true),
          },
        },
      ],
    }).compile();

    gitConnectionsService = module.get<GitConnectionsService>(
      GitConnectionsService,
    );
    gitlabProvider = module.get<GitLabProvider>(GitLabProvider);
    bitbucketProvider = module.get<BitbucketProvider>(BitbucketProvider);
  });

  describe('connectProvider', () => {
    it('should connect GitLab provider', async () => {
      connectionRepo.updateMany.mockResolvedValue({ modifiedCount: 0 });
      connectionRepo.create.mockImplementation(async (data: any) =>
        createMockDocument(data),
      );

      const connection = await gitConnectionsService.connectProvider('team-1', {
        provider: GitProvider.GITLAB,
        code: 'auth-code',
        redirectUri: 'http://localhost/callback',
      });

      expect(connection).toBeDefined();
      expect(connection.provider).toBe(GitProvider.GITLAB);
      expect(connection.accessToken).toBeUndefined(); // Sanitized
    });

    it('should connect Bitbucket provider', async () => {
      connectionRepo.updateMany.mockResolvedValue({ modifiedCount: 0 });
      connectionRepo.create.mockImplementation(async (data: any) =>
        createMockDocument(data),
      );

      const connection = await gitConnectionsService.connectProvider('team-1', {
        provider: GitProvider.BITBUCKET,
        code: 'auth-code',
        redirectUri: 'http://localhost/callback',
      });

      expect(connection).toBeDefined();
      expect(connection.provider).toBe(GitProvider.BITBUCKET);
    });
  });

  describe('getTeamConnections', () => {
    it('should return team connections without tokens', async () => {
      const connection = createMockDocument({
        teamId: 'team-1',
        provider: GitProvider.GITLAB,
        accessToken: 'secret-token',
        refreshToken: 'secret-refresh',
      });

      connectionRepo.find.mockResolvedValue([connection]);

      const connections =
        await gitConnectionsService.getTeamConnections('team-1');

      expect(connections.length).toBe(1);
      expect(connections[0].accessToken).toBeUndefined();
      expect(connections[0].refreshToken).toBeUndefined();
    });
  });

  describe('setDefault', () => {
    it('should set default connection', async () => {
      const connection = createMockDocument({
        teamId: 'team-1',
        provider: GitProvider.GITLAB,
        isDefault: false,
      });

      connectionRepo.findById.mockResolvedValue(connection);
      connectionRepo.updateMany.mockResolvedValue({ modifiedCount: 0 });
      connectionRepo.update.mockResolvedValue({
        ...connection,
        isDefault: true,
      });

      const set = await gitConnectionsService.setDefault(
        'team-1',
        connection._id.toString(),
      );
      expect(set).toBe(true);
    });
  });

  describe('validateConnection', () => {
    it('should validate connection token', async () => {
      const connection = createMockDocument({
        teamId: 'team-1',
        provider: GitProvider.GITLAB,
        accessToken: 'encrypted_valid-token',
        expiresAt: new Date(Date.now() + 86400000),
      });

      connectionRepo.findById.mockResolvedValue(connection);

      const valid = await gitConnectionsService.validateConnection(
        connection._id.toString(),
      );
      expect(valid).toBe(true);
    });
  });

  describe('disconnectProvider', () => {
    it('should disconnect a provider', async () => {
      const connection = createMockDocument({
        teamId: 'team-1',
        provider: GitProvider.GITLAB,
      });

      connectionRepo.findById.mockResolvedValue(connection);
      connectionRepo.delete.mockResolvedValue(true);

      const disconnected = await gitConnectionsService.disconnectProvider(
        'team-1',
        connection._id.toString(),
      );
      expect(disconnected).toBe(true);
    });
  });
});

describe('Role Permissions', () => {
  it('owner should have all permissions', () => {
    const ownerPermissions = ROLE_PERMISSIONS[TeamRole.OWNER];
    expect(ownerPermissions).toContain(Permission.TEAM_MANAGE);
    expect(ownerPermissions).toContain(Permission.BILLING_MANAGE);
    expect(ownerPermissions).toContain(Permission.PROJECT_DELETE);
  });

  it('admin should not have billing manage', () => {
    const adminPermissions = ROLE_PERMISSIONS[TeamRole.ADMIN];
    expect(adminPermissions).not.toContain(Permission.BILLING_MANAGE);
    expect(adminPermissions).toContain(Permission.BILLING_VIEW);
  });

  it('member should have basic permissions', () => {
    const memberPermissions = ROLE_PERMISSIONS[TeamRole.MEMBER];
    expect(memberPermissions).toContain(Permission.PROJECT_READ);
    expect(memberPermissions).toContain(Permission.PROJECT_CREATE);
    expect(memberPermissions).not.toContain(Permission.PROJECT_DELETE);
  });

  it('viewer should only have read permissions', () => {
    const viewerPermissions = ROLE_PERMISSIONS[TeamRole.VIEWER];
    expect(viewerPermissions).toContain(Permission.PROJECT_READ);
    expect(viewerPermissions).toContain(Permission.PLAN_READ);
    expect(viewerPermissions).not.toContain(Permission.PROJECT_CREATE);
    expect(viewerPermissions).not.toContain(Permission.PROJECT_UPDATE);
  });
});
