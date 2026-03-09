import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  SecurityAudit,
  SecurityAuditDocument,
  SecurityEventType,
  SecurityEventSeverity,
} from './schemas/security-audit.schema';
import { IRepository } from '../../providers/interfaces/database-provider.interface';
import { SECURITY_AUDIT_REPOSITORY } from '../../providers/repository-tokens';

export interface AuditLogOptions {
  eventType: SecurityEventType;
  severity?: SecurityEventSeverity;
  userId?: string;
  userEmail?: string;
  ipAddress: string;
  userAgent?: string;
  action: string;
  details?: Record<string, any>;
  resourceType?: string;
  resourceId?: string;
  success?: boolean;
  errorMessage?: string;
  sessionId?: string;
}

@Injectable()
export class SecurityAuditService {
  private readonly logger = new Logger(SecurityAuditService.name);

  constructor(
    @Inject(SECURITY_AUDIT_REPOSITORY)
    private readonly auditRepo: IRepository<SecurityAuditDocument>,
  ) {}

  /**
   * Log a security event
   */
  async log(options: AuditLogOptions): Promise<void> {
    try {
      await this.auditRepo.create({
        eventType: options.eventType,
        severity:
          options.severity || this.getSeverityForEvent(options.eventType),
        userId: options.userId,
        userEmail: options.userEmail,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        action: options.action,
        details: this.sanitizeDetails(options.details),
        resourceType: options.resourceType,
        resourceId: options.resourceId,
        success: options.success ?? true,
        errorMessage: options.errorMessage,
        sessionId: options.sessionId,
      } as any);

      // Log critical events to console as well
      if (options.severity === SecurityEventSeverity.CRITICAL) {
        this.logger.warn(
          `CRITICAL SECURITY EVENT: ${options.eventType} - ${options.action} - IP: ${options.ipAddress}`,
        );
      }
    } catch (error) {
      // Never fail the request due to audit logging failure
      this.logger.error('Failed to log security audit event', error);
    }
  }

  /**
   * Log a successful login
   */
  async logLogin(
    userId: string,
    email: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<void> {
    await this.log({
      eventType: SecurityEventType.LOGIN_SUCCESS,
      userId,
      userEmail: email,
      ipAddress,
      userAgent,
      action: 'User logged in successfully',
      success: true,
    });
  }

  /**
   * Log a failed login attempt
   */
  async logLoginFailure(
    email: string,
    ipAddress: string,
    reason: string,
    userAgent?: string,
  ): Promise<void> {
    await this.log({
      eventType: SecurityEventType.LOGIN_FAILURE,
      severity: SecurityEventSeverity.WARNING,
      userEmail: email,
      ipAddress,
      userAgent,
      action: 'Failed login attempt',
      success: false,
      errorMessage: reason,
    });
  }

  /**
   * Log logout
   */
  async logLogout(userId: string, ipAddress: string): Promise<void> {
    await this.log({
      eventType: SecurityEventType.LOGOUT,
      userId,
      ipAddress,
      action: 'User logged out',
      success: true,
    });
  }

  /**
   * Log OAuth login
   */
  async logOAuthLogin(
    userId: string,
    provider: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<void> {
    await this.log({
      eventType: SecurityEventType.OAUTH_LOGIN,
      userId,
      ipAddress,
      userAgent,
      action: `OAuth login via ${provider}`,
      details: { provider },
      success: true,
    });
  }

  /**
   * Log password reset request
   */
  async logPasswordResetRequest(
    email: string,
    ipAddress: string,
  ): Promise<void> {
    await this.log({
      eventType: SecurityEventType.PASSWORD_RESET_REQUEST,
      userEmail: email,
      ipAddress,
      action: 'Password reset requested',
      success: true,
    });
  }

  /**
   * Log access denied
   */
  async logAccessDenied(
    userId: string | undefined,
    resource: string,
    action: string,
    ipAddress: string,
    reason: string,
  ): Promise<void> {
    await this.log({
      eventType: SecurityEventType.ACCESS_DENIED,
      severity: SecurityEventSeverity.WARNING,
      userId,
      ipAddress,
      action: `Access denied: ${action}`,
      resourceType: resource,
      success: false,
      errorMessage: reason,
    });
  }

  /**
   * Log admin action
   */
  async logAdminAction(
    adminUserId: string,
    action: string,
    targetType: string,
    targetId: string,
    ipAddress: string,
    details?: Record<string, any>,
  ): Promise<void> {
    await this.log({
      eventType: SecurityEventType.ADMIN_ACTION,
      userId: adminUserId,
      ipAddress,
      action,
      resourceType: targetType,
      resourceId: targetId,
      details,
      success: true,
    });
  }

  /**
   * Log rate limit exceeded
   */
  async logRateLimitExceeded(
    identifier: string,
    endpoint: string,
    ipAddress: string,
  ): Promise<void> {
    await this.log({
      eventType: SecurityEventType.RATE_LIMIT_EXCEEDED,
      severity: SecurityEventSeverity.WARNING,
      ipAddress,
      action: `Rate limit exceeded on ${endpoint}`,
      details: { identifier, endpoint },
      success: false,
    });
  }

  /**
   * Get audit logs with filters
   */
  async getAuditLogs(
    filters: {
      eventType?: SecurityEventType;
      userId?: string;
      severity?: SecurityEventSeverity;
      startDate?: Date;
      endDate?: Date;
      ipAddress?: string;
    },
    page: number = 1,
    limit: number = 50,
  ): Promise<{ logs: SecurityAuditDocument[]; total: number }> {
    const query: Record<string, any> = {};

    if (filters.eventType) query.eventType = filters.eventType;
    if (filters.userId) query.userId = filters.userId;
    if (filters.severity) query.severity = filters.severity;
    if (filters.ipAddress) query.ipAddress = filters.ipAddress;

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = filters.startDate;
      if (filters.endDate) query.createdAt.$lte = filters.endDate;
    }

    const [logs, total] = await Promise.all([
      this.auditRepo.find(query, {
        sort: { createdAt: -1 },
        skip: (page - 1) * limit,
        limit,
      }),
      this.auditRepo.count(query),
    ]);

    return { logs, total };
  }

  /**
   * Get security summary for dashboard
   */
  async getSecuritySummary(hours: number = 24): Promise<{
    totalEvents: number;
    criticalEvents: number;
    warningEvents: number;
    failedLogins: number;
    accessDenied: number;
    rateLimitExceeded: number;
  }> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [
      totalEvents,
      criticalEvents,
      warningEvents,
      failedLogins,
      accessDenied,
      rateLimitExceeded,
    ] = await Promise.all([
      this.auditRepo.count({ createdAt: { $gte: since } }),
      this.auditRepo.count({
        createdAt: { $gte: since },
        severity: SecurityEventSeverity.CRITICAL,
      }),
      this.auditRepo.count({
        createdAt: { $gte: since },
        severity: SecurityEventSeverity.WARNING,
      }),
      this.auditRepo.count({
        createdAt: { $gte: since },
        eventType: SecurityEventType.LOGIN_FAILURE,
      }),
      this.auditRepo.count({
        createdAt: { $gte: since },
        eventType: SecurityEventType.ACCESS_DENIED,
      }),
      this.auditRepo.count({
        createdAt: { $gte: since },
        eventType: SecurityEventType.RATE_LIMIT_EXCEEDED,
      }),
    ]);

    return {
      totalEvents,
      criticalEvents,
      warningEvents,
      failedLogins,
      accessDenied,
      rateLimitExceeded,
    };
  }

  /**
   * Get default severity for event type
   */
  private getSeverityForEvent(
    eventType: SecurityEventType,
  ): SecurityEventSeverity {
    switch (eventType) {
      case SecurityEventType.LOGIN_FAILURE:
      case SecurityEventType.ACCESS_DENIED:
      case SecurityEventType.RATE_LIMIT_EXCEEDED:
        return SecurityEventSeverity.WARNING;

      case SecurityEventType.ACCOUNT_DISABLED:
      case SecurityEventType.ACCOUNT_DELETED:
      case SecurityEventType.API_KEY_REVOKED:
        return SecurityEventSeverity.CRITICAL;

      default:
        return SecurityEventSeverity.INFO;
    }
  }

  /**
   * Sanitize details to remove sensitive information
   */
  private sanitizeDetails(
    details?: Record<string, any>,
  ): Record<string, any> | undefined {
    if (!details) return undefined;

    const sanitized = { ...details };
    const sensitiveKeys = [
      'password',
      'token',
      'secret',
      'apiKey',
      'accessToken',
      'refreshToken',
    ];

    for (const key of Object.keys(sanitized)) {
      if (
        sensitiveKeys.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))
      ) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
