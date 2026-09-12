import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";
import { verifyAccessToken } from "../utils/jwt";

// Verifies the access token and attaches the AUTHENTICATED identity to
// req.user. Every protected route depends on this running first — nothing
// downstream trusts req.body/req.query for identity or role.
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(ApiError.unauthenticated("Missing access token."));
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(ApiError.unauthenticated("Invalid or expired access token."));
  }
}
