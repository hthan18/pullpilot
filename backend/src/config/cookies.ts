import { CookieOptions } from 'express';
import { env } from './env';

export const OAUTH_STATE_COOKIE = 'pullpilot_oauth_state';
export const SESSION_COOKIE = 'pullpilot_session';

const sharedOptions: CookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  path: '/',
};

export const oauthStateCookieOptions: CookieOptions = {
  ...sharedOptions,
  sameSite: 'lax',
  maxAge: 10 * 60 * 1000,
};

export const sessionCookieOptions: CookieOptions = {
  ...sharedOptions,
  sameSite: env.isProduction ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const clearOauthStateCookieOptions: CookieOptions = {
  ...sharedOptions,
  sameSite: 'lax',
};

export const clearSessionCookieOptions: CookieOptions = {
  ...sharedOptions,
  sameSite: env.isProduction ? 'none' : 'lax',
};
