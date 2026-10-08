import { eq } from "drizzle-orm";

import { db } from "../db";
import { usuarios } from "../db/schema";
import {
  extractBearerToken,
  getUserIdFromToken,
} from "./session";

export async function requireUser(
  request: Request,
): Promise<string> {
  const token = extractBearerToken(request);

  if (!token) {
    throw new Error("UNAUTHORIZED");
  }

  const usuarioId =
    await getUserIdFromToken(token);

  if (!usuarioId) {
    throw new Error("UNAUTHORIZED");
  }

  return usuarioId;
}

export async function requireUserData(
  request: Request,
) {
  const usuarioId = await requireUser(request);

  const result = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.id, usuarioId))
    .limit(1);

  const usuario = result[0];

  if (!usuario) {
    throw new Error("UNAUTHORIZED");
  }

  return usuario;
}
