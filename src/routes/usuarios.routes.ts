import { Elysia, t } from "elysia";
import {
  and,
  desc,
  eq,
  ilike,
  ne,
} from "drizzle-orm";

import { db } from "../db";
import {
  estantes,
  criticas,
  publicacoes,
  usuarios,
} from "../db/schema";
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

export const usuariosRoutes = new Elysia({
  prefix: "/usuarios",
})

  .get(
    "/me",
    async ({ request, set }) => {
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
          set.status = 404;

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
          message: "Não autenticado.",
        };
      }
    },
  )

  .get(
    "/",
    async ({ request, query, set }) => {
      try {
        await requireUser(request);
      } catch {
        set.status = 401;

        return {
          success: false,
          message: "Não autenticado.",
        };
      }

      const busca = query.busca?.trim();

      const result = busca
        ? await db
            .select()
            .from(usuarios)
            .where(
              ilike(
                usuarios.nome,
                `%${busca}%`,
              ),
            )
            .orderBy(desc(usuarios.createdAt))
            .limit(50)
        : await db
            .select()
            .from(usuarios)
            .orderBy(desc(usuarios.createdAt))
            .limit(50);

      return {
        success: true,
        data: result.map(serializeUser),
        total: result.length,
      };
    },
    {
      query: t.Object({
        busca: t.Optional(t.String()),
      }),
    },
  )

  .get(
    "/:id",
    async ({ params, set }) => {
      const result = await db
        .select()
        .from(usuarios)
        .where(eq(usuarios.id, params.id))
        .limit(1);

      const user = result[0];

      if (!user) {
        set.status = 404;

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
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )

  .get(
    "/:id/estatisticas",
    async ({ params, set }) => {
      const userResult = await db
        .select({
          id: usuarios.id,
        })
        .from(usuarios)
        .where(eq(usuarios.id, params.id))
        .limit(1);

      if (!userResult[0]) {
        set.status = 404;

        return {
          success: false,
          message:
            "Utilizador não encontrado.",
        };
      }

      const [
        estantesResult,
        criticasResult,
        publicacoesResult,
      ] = await Promise.all([
        db
          .select({
            status: estantes.status,
          })
          .from(estantes)
          .where(eq(estantes.usuarioId, params.id)),

        db
          .select({
            id: criticas.id,
          })
          .from(criticas)
          .where(eq(criticas.usuarioId, params.id)),

        db
          .select({
            id: publicacoes.id,
          })
          .from(publicacoes)
          .where(
            eq(publicacoes.usuarioId, params.id),
          ),
      ]);

      return {
        success: true,
        data: {
          totalLivros:
            estantesResult.length,

          queroLer:
            estantesResult.filter(
              (item) =>
                item.status === "quero_ler",
            ).length,

          lendo:
            estantesResult.filter(
              (item) =>
                item.status === "lendo",
            ).length,

          lidos:
            estantesResult.filter(
              (item) =>
                item.status === "lido",
            ).length,

          criticas:
            criticasResult.length,

          publicacoes:
            publicacoesResult.length,
        },
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )

  .patch(
    "/me",
    async ({ request, body, set }) => {
      try {
        const usuarioId =
          await requireUser(request);

        const values: {
          nome?: string;
          bio?: string | null;
          fotoPerfil?: string | null;
          updatedAt: Date;
        } = {
          updatedAt: new Date(),
        };

        if (body.nome !== undefined) {
          const nome = body.nome.trim();

          if (nome.length < 2) {
            set.status = 400;

            return {
              success: false,
              message:
                "O nome deve ter pelo menos 2 caracteres.",
            };
          }

          values.nome = nome;
        }

        if (body.bio !== undefined) {
          values.bio = body.bio;
        }

        if (body.fotoPerfil !== undefined) {
          values.fotoPerfil =
            body.fotoPerfil;
        }

        const result = await db
          .update(usuarios)
          .set(values)
          .where(eq(usuarios.id, usuarioId))
          .returning();

        const user = result[0];

        if (!user) {
          set.status = 404;

          return {
            success: false,
            message:
              "Utilizador não encontrado.",
          };
        }

        return {
          success: true,
          message:
            "Perfil atualizado com sucesso.",
          user: serializeUser(user),
        };
      } catch {
        set.status = 401;

        return {
          success: false,
          message: "Não autenticado.",
        };
      }
    },
    {
      body: t.Object({
        nome: t.Optional(t.String()),
        bio: t.Optional(
          t.Nullable(t.String()),
        ),
        fotoPerfil: t.Optional(
          t.Nullable(t.String()),
        ),
      }),
    },
  );
