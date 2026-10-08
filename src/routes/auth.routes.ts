import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";

import { db } from "../db";
import { usuarios } from "../db/schema";
import {
  hashPassword,
  verifyPassword,
} from "../auth/password";
import {
  createSession,
  extractBearerToken,
  revokeSession,
} from "../auth/session";
import { requireUser } from "../auth/require-user";

function serializeUser(
  user: typeof usuarios.$inferSelect,
) {
  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
    username: null,
    fotoPerfil: user.fotoPerfil,
    foto_perfil: user.fotoPerfil,
    bio: user.bio,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export const authRoutes = new Elysia({
  prefix: "/auth",
})

  .post(
    "/register",
    async ({ body, set }) => {
      const nome = body.nome.trim();
      const email = body.email
        .trim()
        .toLowerCase();

      if (nome.length < 2) {
        set.status = 400;

        return {
          success: false,
          message:
            "O nome deve ter pelo menos 2 caracteres.",
        };
      }

      if (
        email.length < 5 ||
        !email.includes("@")
      ) {
        set.status = 400;

        return {
          success: false,
          message: "Introduza um email válido.",
        };
      }

      if (body.senha.length < 6) {
        set.status = 400;

        return {
          success: false,
          message:
            "A palavra-passe deve ter pelo menos 6 caracteres.",
        };
      }

      const existing = await db
        .select({
          id: usuarios.id,
        })
        .from(usuarios)
        .where(eq(usuarios.email, email))
        .limit(1);

      if (existing.length > 0) {
        set.status = 409;

        return {
          success: false,
          message:
            "Já existe uma conta com este email.",
        };
      }

      const senhaHash =
        await hashPassword(body.senha);

      const inserted = await db
        .insert(usuarios)
        .values({
          nome,
          email,
          senhaHash,
        })
        .returning();

      const user = inserted[0];

      if (!user) {
        set.status = 500;

        return {
          success: false,
          message:
            "Não foi possível criar a conta.",
        };
      }

      return {
        success: true,
        message: "Conta criada com sucesso.",
        user: serializeUser(user),
      };
    },
    {
      body: t.Object({
        nome: t.String({
          minLength: 2,
          maxLength: 120,
        }),
        email: t.String({
          minLength: 5,
          maxLength: 255,
        }),
        senha: t.String({
          minLength: 6,
        }),
      }),
    },
  )

  .post(
    "/login",
    async ({ body, set }) => {
      const email = body.email
        .trim()
        .toLowerCase();

      const result = await db
        .select()
        .from(usuarios)
        .where(eq(usuarios.email, email))
        .limit(1);

      const user = result[0];

      if (!user) {
        set.status = 401;

        return {
          success: false,
          message:
            "Email ou palavra-passe incorretos.",
        };
      }

      const valid = await verifyPassword(
        body.senha,
        user.senhaHash,
      );

      if (!valid) {
        set.status = 401;

        return {
          success: false,
          message:
            "Email ou palavra-passe incorretos.",
        };
      }

      const session =
        await createSession(user.id);

      return {
        success: true,
        message:
          "Sessão iniciada com sucesso.",
        token: session.token,
        expiresAt: session.expiresAt,
        user: serializeUser(user),
      };
    },
    {
      body: t.Object({
        email: t.String(),
        senha: t.String(),
      }),
    },
  )

  .get("/me", async ({ request, set }) => {
    try {
      const usuarioId =
        await requireUser(request);

      const result = await db
        .select()
        .from(usuarios)
        .where(eq(usuarios.id, usuarioId))
        .limit(1);

      const user = result[0];

      if (!user) {
        set.status = 401;

        return {
          success: false,
          message:
            "Utilizador não encontrado.",
        };
      }

      return {
        success: true,
        user: serializeUser(user),
      };
    } catch {
      set.status = 401;

      return {
        success: false,
        message:
          "Sessão inválida ou expirada.",
      };
    }
  })

  .post("/logout", async ({ request }) => {
    const token =
      extractBearerToken(request);

    if (token) {
      await revokeSession(token);
    }

    return {
      success: true,
      message:
        "Sessão terminada com sucesso.",
    };
  });
