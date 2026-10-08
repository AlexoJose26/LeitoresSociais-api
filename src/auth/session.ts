import crypto from "node:crypto";
import { and, eq, gt } from "drizzle-orm";

import { db } from "../db";
import { sessoes } from "../db/schema";

const DEFAULT_SESSION_TTL_DAYS = 30;

function getSessionTtlDays(): number {
  const value = Number(process.env.SESSION_TTL_DAYS);

  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_SESSION_TTL_DAYS;
  }

  return value;
}

function generateToken(): string {
  return crypto.randomBytes(48).toString("base64url");
}

function hashToken(token: string): string {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

export async function createSession(usuarioId: string) {
  const token = generateToken();
  const tokenHash = hashToken(token);

  const expiresAt = new Date(
    Date.now() +
      getSessionTtlDays() * 24 * 60 * 60 * 1000,
  );

  await db.insert(sessoes).values({
    usuarioId,
    tokenHash,
    expiresAt,
    revoked: false,
  });

  return {
    token,
    expiresAt,
  };
}

export async function getUserIdFromToken(
  token: string,
): Promise<string | null> {
  if (!token) {
    return null;
  }

  const tokenHash = hashToken(token);

  const result = await db
    .select({
      usuarioId: sessoes.usuarioId,
    })
    .from(sessoes)
    .where(
      and(
        eq(sessoes.tokenHash, tokenHash),
        eq(sessoes.revoked, false),
        gt(sessoes.expiresAt, new Date()),
      ),
    )
    .limit(1);

  return result[0]?.usuarioId ?? null;
}

export async function revokeSession(
  token: string,
): Promise<void> {
  if (!token) {
    return;
  }

  const tokenHash = hashToken(token);

  await db
    .update(sessoes)
    .set({
      revoked: true,
    })
    .where(eq(sessoes.tokenHash, tokenHash));
}

export async function revokeUserSessions(
  usuarioId: string,
): Promise<void> {
  await db
    .update(sessoes)
    .set({
      revoked: true,
    })
    .where(eq(sessoes.usuarioId, usuarioId));
}

export function extractBearerToken(
  request: Request,
): string | null {
  const authorization =
    request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  const [scheme, token] =
    authorization.trim().split(/\s+/);

  if (
    scheme?.toLowerCase() !== "bearer" ||
    !token
  ) {
    return null;
  }

  return token;
}
