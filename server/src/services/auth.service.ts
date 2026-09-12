import { prisma } from "../config/prisma";
import { ApiError } from "../utils/apiError";
import { hashPassword, verifyPassword } from "../utils/password";
import {
  signAccessToken,
  verifyAccessToken,
  generateRefreshTokenRaw,
  hashToken,
} from "../utils/jwt";
import { env } from "../config/env";
import { Role } from "@prisma/client";

interface AuthTokens {
  accessToken: string;
  refreshTokenRaw: string;
  refreshTokenExpiresAt: Date;
}

async function issueTokens(userId: string, role: Role): Promise<AuthTokens> {
  const accessToken = signAccessToken({ sub: userId, role });
  const refreshTokenRaw = generateRefreshTokenRaw();
  const refreshTokenExpiresAt = new Date(
    Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000
  );
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshTokenRaw),
      expiresAt: refreshTokenExpiresAt,
    },
  });
  return { accessToken, refreshTokenRaw, refreshTokenExpiresAt };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw ApiError.unauthenticated("Invalid email or password.");

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) throw ApiError.unauthenticated("Invalid email or password.");

  const tokens = await issueTokens(user.id, user.role);
  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    ...tokens,
  };
}

// Refresh-token rotation: the presented token is looked up by hash, must be
// unexpired and unrevoked. On success it is revoked immediately and a new
// one is issued in its place ("rotation"). If a client ever presents a
// token that has ALREADY been revoked, that's a reuse signal (the token was
// stolen and used twice) — we respond by revoking every other active
// session for that user too.
export async function refresh(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!existing) throw ApiError.unauthenticated("Invalid refresh token.");

  if (existing.revokedAt) {
    // Reuse of an already-rotated/revoked token: nuke the whole session family.
    await prisma.refreshToken.updateMany({
      where: { userId: existing.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw ApiError.unauthenticated("Refresh token reuse detected. All sessions revoked.");
  }

  if (existing.expiresAt < new Date()) {
    throw ApiError.unauthenticated("Refresh token expired.");
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });
    const newRaw = generateRefreshTokenRaw();
    const newExpiresAt = new Date(
      Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000
    );
    await tx.refreshToken.create({
      data: {
        userId: existing.userId,
        tokenHash: hashToken(newRaw),
        expiresAt: newExpiresAt,
      },
    });
    return { newRaw, newExpiresAt };
  });

  const accessToken = signAccessToken({ sub: existing.userId, role: existing.user.role });
  return {
    user: {
      id: existing.user.id,
      name: existing.user.name,
      email: existing.user.email,
      role: existing.user.role,
    },
    accessToken,
    refreshTokenRaw: result.newRaw,
    refreshTokenExpiresAt: result.newExpiresAt,
  };
}

export async function logout(rawToken: string | undefined) {
  if (!rawToken) return;
  const tokenHash = hashToken(rawToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function me(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound("User not found.");
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function createUser(name: string, email: string, password: string, role: Role) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw ApiError.conflict("A user with this email already exists.");
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role },
  });
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

// Exported so socket auth (sockets/socket.auth.ts) can verify the same
// access token type without duplicating jwt logic.
export { verifyAccessToken };
