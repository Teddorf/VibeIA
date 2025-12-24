import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SecurityAuditDocument = SecurityAudit & Document;

export enum SecurityEventType {
  // Authentication Events
  LOGIN_SUCCESS = 'auth.login.success',
  LOGIN_FAILURE = 'auth.login.failure',
  LOGOUT = 'auth.logout',
  TOKEN_REFRESH = 'auth.token.refresh',
  PASSWORD_RESET_REQUEST = 'auth.password.reset_request',
  PASSWORD_RESET_SUCCESS = 'auth.password.reset_success',

  // OAuth Events
  OAUTH_LOGIN = 'auth.oauth.login',
  OAUTH_LINK = 'auth.oauth.link',
  OAUTH_UNLINK = 'auth.oauth.unlink',

  // Authorization Events
  ACCESS_DENIED = 'authz.access_denied',
  ROLE_CHANGE = 'authz.role_change',
  PERMISSION_GRANT = 'authz.permission_grant',
  PERMISSION_REVOKE = 'authz.permission_revoke',

  // Account Events
  ACCOUNT_CREATED = 'account.created',
  ACCOUNT_UPDATED = 'account.updated',
  ACCOUNT_DISABLED = 'account.disabled',
  ACCOUNT_DELETED = 'account.deleted',

  // API Events
  API_KEY_CREATED = 'api.key_created',
  API_KEY_REVOKED = 'api.key_revoked',
  RATE_LIMIT_EXCEEDED = 'api.rate_limit_exceeded',

  // Admin Events
  ADMIN_ACTION = 'admin.action',
  CONFIG_CHANGE = 'admin.config_change',
}

export enum SecurityEventSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

@Schema({ timestamps: true })
export class SecurityAudit {
  @Prop({ required: true, type: String, enum: SecurityEventType })
  eventType: SecurityEventType;

  @Prop({ required: true, type: String, enum: SecurityEventSeverity })
  severity: SecurityEventSeverity;

  @Prop()
  userId?: string;

  @Prop()
  userEmail?: string;

  @Prop({ required: true })
  ipAddress: string;

  @Prop()
  userAgent?: string;

  @Prop({ required: true })
  action: string;

  @Prop({ type: Object })
  details?: Record<string, any>;

  @Prop()
  resourceType?: string;

  @Prop()
  resourceId?: string;

  @Prop({ default: false })
  success: boolean;

  @Prop()
  errorMessage?: string;

  @Prop()
  sessionId?: string;

  // Timestamps added by @Schema({ timestamps: true })
  createdAt?: Date;
  updatedAt?: Date;
}

export const SecurityAuditSchema = SchemaFactory.createForClass(SecurityAudit);

// Indexes for efficient querying
SecurityAuditSchema.index({ eventType: 1, createdAt: -1 });
SecurityAuditSchema.index({ userId: 1, createdAt: -1 });
SecurityAuditSchema.index({ severity: 1, createdAt: -1 });
SecurityAuditSchema.index({ ipAddress: 1, createdAt: -1 });
SecurityAuditSchema.index({ createdAt: -1 });

// TTL index to auto-delete old logs after 90 days
SecurityAuditSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
