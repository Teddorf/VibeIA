// Team Roles
export enum TeamRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer',
}

// Invitation Status
export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

// Git Providers
export enum GitProvider {
  GITHUB = 'github',
  GITLAB = 'gitlab',
  BITBUCKET = 'bitbucket',
}

// Permission Types
export enum Permission {
  // Project permissions
  PROJECT_CREATE = 'project:create',
  PROJECT_READ = 'project:read',
  PROJECT_UPDATE = 'project:update',
  PROJECT_DELETE = 'project:delete',
  PROJECT_EXECUTE = 'project:execute',

  // Plan permissions
  PLAN_CREATE = 'plan:create',
  PLAN_READ = 'plan:read',
  PLAN_UPDATE = 'plan:update',
  PLAN_DELETE = 'plan:delete',
  PLAN_EXECUTE = 'plan:execute',

  // Team permissions
  TEAM_MANAGE = 'team:manage',
  TEAM_INVITE = 'team:invite',
  TEAM_REMOVE = 'team:remove',

  // Git permissions
  GIT_PUSH = 'git:push',
  GIT_PULL = 'git:pull',
  GIT_MANAGE = 'git:manage',

  // Billing permissions
  BILLING_VIEW = 'billing:view',
  BILLING_MANAGE = 'billing:manage',
}

// Role Permissions Mapping
export const ROLE_PERMISSIONS: Record<TeamRole, Permission[]> = {
  [TeamRole.OWNER]: Object.values(Permission),
  [TeamRole.ADMIN]: [
    Permission.PROJECT_CREATE,
    Permission.PROJECT_READ,
    Permission.PROJECT_UPDATE,
    Permission.PROJECT_DELETE,
    Permission.PROJECT_EXECUTE,
    Permission.PLAN_CREATE,
    Permission.PLAN_READ,
    Permission.PLAN_UPDATE,
    Permission.PLAN_DELETE,
    Permission.PLAN_EXECUTE,
    Permission.TEAM_INVITE,
    Permission.TEAM_REMOVE,
    Permission.GIT_PUSH,
    Permission.GIT_PULL,
    Permission.GIT_MANAGE,
    Permission.BILLING_VIEW,
  ],
  [TeamRole.MEMBER]: [
    Permission.PROJECT_CREATE,
    Permission.PROJECT_READ,
    Permission.PROJECT_UPDATE,
    Permission.PROJECT_EXECUTE,
    Permission.PLAN_CREATE,
    Permission.PLAN_READ,
    Permission.PLAN_UPDATE,
    Permission.PLAN_EXECUTE,
    Permission.GIT_PUSH,
    Permission.GIT_PULL,
  ],
  [TeamRole.VIEWER]: [
    Permission.PROJECT_READ,
    Permission.PLAN_READ,
    Permission.GIT_PULL,
  ],
};

// Team Interface
export interface Team {
  id: string;
  name: string;
  slug: string;
  description?: string;
  avatarUrl?: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  settings: TeamSettings;
  gitConnections: GitConnection[];
  memberCount: number;
  projectCount: number;
}

// Team Settings
export interface TeamSettings {
  defaultRole: TeamRole;
  allowMemberInvites: boolean;
  requireApprovalForJoin: boolean;
  defaultGitProvider: GitProvider;
  enforceQualityGates: boolean;
  minTestCoverage: number;
  allowedLlmProviders: string[];
  notificationPreferences: NotificationPreferences;
}

// Notification Preferences
export interface NotificationPreferences {
  emailOnInvite: boolean;
  emailOnProjectCreate: boolean;
  emailOnPlanComplete: boolean;
  emailOnExecutionFail: boolean;
  slackWebhookUrl?: string;
  discordWebhookUrl?: string;
}

// Git Connection
export interface GitConnection {
  id: string;
  provider: GitProvider;
  name: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  organizationId?: string;
  organizationName?: string;
  webhookSecret?: string;
  isDefault: boolean;
  createdAt: Date;
  lastUsedAt?: Date;
}

// Team Member
export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  joinedAt: Date;
  invitedBy?: string;
  user?: TeamMemberUser;
}

// Team Member User Info
export interface TeamMemberUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

// Invitation
export interface Invitation {
  id: string;
  teamId: string;
  email: string;
  role: TeamRole;
  status: InvitationStatus;
  invitedBy: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  acceptedAt?: Date;
  declinedAt?: Date;
  team?: Team;
  inviter?: TeamMemberUser;
}

// Activity Log
export interface TeamActivity {
  id: string;
  teamId: string;
  userId: string;
  action: TeamActivityAction;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  user?: TeamMemberUser;
}

export type TeamActivityAction =
  | 'team.created'
  | 'team.updated'
  | 'team.deleted'
  | 'member.invited'
  | 'member.joined'
  | 'member.left'
  | 'member.removed'
  | 'member.role_changed'
  | 'project.created'
  | 'project.updated'
  | 'project.deleted'
  | 'plan.created'
  | 'plan.executed'
  | 'git.connected'
  | 'git.disconnected';

// DTOs for API

export class CreateTeamDto {
  name: string;
  description?: string;
  settings?: Partial<TeamSettings>;
}

export class UpdateTeamDto {
  name?: string;
  description?: string;
  avatarUrl?: string;
  settings?: Partial<TeamSettings>;
}

export class InviteMemberDto {
  email: string;
  role: TeamRole;
  message?: string;
}

export class UpdateMemberRoleDto {
  role: TeamRole;
}

export class ConnectGitProviderDto {
  provider: GitProvider;
  code: string;
  redirectUri: string;
  organizationId?: string;
  isDefault?: boolean;
}

export class TransferOwnershipDto {
  newOwnerId: string;
  confirmPassword: string;
}

// GitLab specific types
export interface GitLabProject {
  id: number;
  name: string;
  path: string;
  path_with_namespace: string;
  description?: string;
  default_branch: string;
  visibility: 'private' | 'internal' | 'public';
  web_url: string;
  ssh_url_to_repo: string;
  http_url_to_repo: string;
  created_at: string;
  last_activity_at: string;
}

export interface GitLabGroup {
  id: number;
  name: string;
  path: string;
  full_path: string;
  description?: string;
  visibility: string;
  web_url: string;
  avatar_url?: string;
}

// Bitbucket specific types
export interface BitbucketRepository {
  uuid: string;
  name: string;
  full_name: string;
  description?: string;
  is_private: boolean;
  mainbranch?: { name: string };
  links: {
    html: { href: string };
    clone: Array<{ href: string; name: string }>;
  };
  created_on: string;
  updated_on: string;
}

export interface BitbucketWorkspace {
  uuid: string;
  name: string;
  slug: string;
  links: {
    html: { href: string };
    avatar: { href: string };
  };
}

// Default Team Settings
export const DEFAULT_TEAM_SETTINGS: TeamSettings = {
  defaultRole: TeamRole.MEMBER,
  allowMemberInvites: false,
  requireApprovalForJoin: true,
  defaultGitProvider: GitProvider.GITHUB,
  enforceQualityGates: true,
  minTestCoverage: 80,
  allowedLlmProviders: ['claude', 'openai', 'gemini'],
  notificationPreferences: {
    emailOnInvite: true,
    emailOnProjectCreate: true,
    emailOnPlanComplete: true,
    emailOnExecutionFail: true,
  },
};

// Invitation Token Expiry (7 days)
export const INVITATION_EXPIRY_DAYS = 7;

// Git Provider OAuth Config
export interface GitProviderOAuthConfig {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
  apiBaseUrl: string;
}

export const GIT_PROVIDER_CONFIG: Record<GitProvider, Partial<GitProviderOAuthConfig>> = {
  [GitProvider.GITHUB]: {
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scopes: ['repo', 'read:user', 'read:org'],
    apiBaseUrl: 'https://api.github.com',
  },
  [GitProvider.GITLAB]: {
    authorizationUrl: 'https://gitlab.com/oauth/authorize',
    tokenUrl: 'https://gitlab.com/oauth/token',
    scopes: ['api', 'read_user', 'read_repository', 'write_repository'],
    apiBaseUrl: 'https://gitlab.com/api/v4',
  },
  [GitProvider.BITBUCKET]: {
    authorizationUrl: 'https://bitbucket.org/site/oauth2/authorize',
    tokenUrl: 'https://bitbucket.org/site/oauth2/access_token',
    scopes: ['repository', 'repository:write', 'account'],
    apiBaseUrl: 'https://api.bitbucket.org/2.0',
  },
};
