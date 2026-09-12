import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env";
import { Role } from "@prisma/client";

export interface AccessTokenPayload {
  sub: string; // userId
  role: Role;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwtAccessSecret, {
  expiresIn: env.accessTokenTtl as `${number}${"s" | "m" | "h" | "d" | "w" | "y"}`,
});
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
}

// Refresh tokens are opaque random strings, not JWTs whose claims a client
// could try to influence. We store only a hash of the token server-side
// (never the raw token) so a leaked database row can't be replayed directly.
export function generateRefreshTokenRaw(): string {
  return crypto.randomBytes(48).toString("hex");
}

export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}
