import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ok, created } from "../utils/apiResponse";
import { env } from "../config/env";
import * as authService from "../services/auth.service";
import { ApiError } from "../utils/apiError";

const REFRESH_COOKIE = "refreshToken";

function setRefreshCookie(res: Response, token: string, expiresAt: Date) {
  // HttpOnly => never readable by JavaScript (mitigates XSS token theft).
  // Secure in production => only sent over HTTPS. SameSite=lax balances CSRF
  // protection against normal top-level navigation flows.
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    domain: env.cookieDomain,
    path: "/api/auth",
    expires: expiresAt,
  });
}

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  setRefreshCookie(res, result.refreshTokenRaw, result.refreshTokenExpiresAt);
  return ok(res, { user: result.user, accessToken: result.accessToken });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const rawToken = req.cookies?.[REFRESH_COOKIE];
  if (!rawToken) throw ApiError.unauthenticated("No refresh token provided.");
  const result = await authService.refresh(rawToken);
  setRefreshCookie(res, result.refreshTokenRaw, result.refreshTokenExpiresAt);
  return ok(res, { user: result.user, accessToken: result.accessToken });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const rawToken = req.cookies?.[REFRESH_COOKIE];
  await authService.logout(rawToken);
  res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
  return ok(res, { loggedOut: true });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.me(req.user!.id);
  return ok(res, result);
});
