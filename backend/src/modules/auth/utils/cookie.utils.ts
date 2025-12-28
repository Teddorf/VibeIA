import { Response } from 'express';

/**
 * Cookie configuration for authentication tokens
 *
 * HttpOnly: Prevents JavaScript access (XSS protection)
 * Secure: Only sent over HTTPS (in production)
 * SameSite: Strict for CSRF protection
 * Path: Specific paths to limit cookie scope
 */

export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  path: string;
  maxAge: number;
}

// Access token: short-lived, used for API requests
const ACCESS_TOKEN_COOKIE = 'access_token';
const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000; // 15 minutes

// Refresh token: long-lived, used only for token refresh
const REFRESH_TOKEN_COOKIE = 'refresh_token';
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// User ID cookie: readable by frontend for user context
const USER_ID_COOKIE = 'user_id';

function getBaseOptions(): Omit<CookieOptions, 'path' | 'maxAge'> {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
  };
}

/**
 * Set authentication cookies on response
 */
export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
  userId: string,
): void {
  const baseOptions = getBaseOptions();

  // Access token cookie
  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
    ...baseOptions,
    path: '/api',
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });

  // Refresh token cookie (more restricted path)
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...baseOptions,
    path: '/api/auth/refresh',
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });

  // User ID cookie (readable by frontend for user context, not HttpOnly)
  res.cookie(USER_ID_COOKIE, userId, {
    httpOnly: false, // Frontend needs to read this
    secure: baseOptions.secure,
    sameSite: baseOptions.sameSite,
    path: '/',
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
}

/**
 * Clear authentication cookies on logout
 */
export function clearAuthCookies(res: Response): void {
  const baseOptions = getBaseOptions();

  res.clearCookie(ACCESS_TOKEN_COOKIE, {
    ...baseOptions,
    path: '/api',
  });

  res.clearCookie(REFRESH_TOKEN_COOKIE, {
    ...baseOptions,
    path: '/api/auth/refresh',
  });

  res.clearCookie(USER_ID_COOKIE, {
    httpOnly: false,
    secure: baseOptions.secure,
    sameSite: baseOptions.sameSite,
    path: '/',
  });
}

/**
 * Cookie names for extraction
 */
export const COOKIE_NAMES = {
  ACCESS_TOKEN: ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN: REFRESH_TOKEN_COOKIE,
  USER_ID: USER_ID_COOKIE,
};
