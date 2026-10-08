import { Elysia, t } from "elysia";
import {
  and,
  asc,
  eq,
} from "drizzle-orm";

import { db } from "../db";
import {
  comentarios,
  publicacoes,
  usuarios,
} from "../db/schema";
import { requireUser } from "../auth/require-user";

export const comentariosRoutes = new Elysia({
  prefix: "/comentarios",
})

  // =========================================================
  // LISTAR COMENTÁRIOS
  // GET /comentarios?publicacaoId=
  // =========================================================
  .get(
    "/",
    async ({ query, set }) => {
      if (!query.publicacaoId) {
        set.status = 400;

        return {
          success: false,
          message:
            "publicacaoId é obrigatório.",
        };
      }

      const result = await db
        .select({
          id: comentarios.id,
          usuarioId: comentarios.usuarioId,
          publicacaoId:
            comentarios.publicacaoId,
          parentId: comentarios.parentId,
          conteudo: comentarios.conteudo,
          createdAt: comentarios.createdAt,
          updatedAt: comentarios.updatedAt,

          usuario: {
            id: usuarios.id,
            nome: usuarios.nome,
            fotoPerfil:
              usuarios.fotoPerfil,
          },
        })
        .from(comentarios)
        .innerJoin(
          usuarios,
          eq(
            comentarios.usuarioId,
            usuarios.id,
          ),
        )
        .where(
          eq(
            comentarios.publicacaoId,
            query.publicacaoId,
          ),
        )
        .orderBy(asc(comentarios.createdAt));

      return {
        success: true,
        data: result,
        total: result.length,
      };
    },
    {
      query: t.Object({
        publicacaoId: t.Optional(
          t.String(),
        ),
      }),
    },
  )

  // =========================================================
  // COMENTÁRIO POR ID
  // =========================================================
  .get(
    "/:id",
    async ({ params, set }) => {
      const result = await db
        .select({
          id: comentarios.id,
          usuarioId: comentarios.usuarioId,
          publicacaoId:
            comentarios.publicacaoId,
          parentId: comentarios.parentId,
          conteudo: comentarios.conteudo,
          createdAt: comentarios.createdAt,
          updatedAt: comentarios.updatedAt,

          usuario: {
            id: usuarios.id,
            nome: usuarios.nome,
            fotoPerfil:
              usuarios.fotoPerfil,
          },
        })
        .from(comentarios)
        .innerJoin(
          usuarios,
          eq(
            comentarios.usuarioId,
            usuarios.id,
          ),
        )
        .where(eq(comentarios.id, params.id))
        .limit(1);

      if (!result[0]) {
        set.status = 404;

        return {
          success: false,
          message:
            "Comentário não encontrado.",
        };
      }

      return {
        success: true,
        data: result[0],
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )

  // =========================================================
  // CRIAR COMENTÁRIO
  // =========================================================
  .post(
    "/",
    async ({ request, body, set }) => {
      try {
        const usuarioId =
          await requireUser(request);

        const publication = await db
          .select({
            id: publicacoes.id,
          })
          .from(publicacoes)
          .where(
            eq(
              publicacoes.id,
              body.publicacaoId,
            ),
          )
          .limit(1);

        if (!publication[0]) {
          set.status = 404;

          return {
            success: false,
            message:
              "Publicação não encontrada.",
          };
        }

        if (body.parentId) {
          const parent = await db
            .select()
            .from(comentarios)
            .where(
              and(
                eq(
                  comentarios.id,
                  body.parentId,
                ),
                eq(
                  comentarios.publicacaoId,
                  body.publicacaoId,
                ),
              ),
            )
            .limit(1);

          if (!parent[0]) {
            set.status = 400;

            return {
              success: false,
              message:
                "Comentário pai inválido.",
            };
          }
        }

        const result = await db
          .insert(comentarios)
          .values({
            usuarioId,
            publicacaoId:
              body.publicacaoId,
            parentId:
              body.parentId ?? null,
            conteudo:
              body.conteudo.trim(),
          })
          .returning();

        return {
          success: true,
          message:
            "Comentário publicado.",
          data: result[0],
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
        publicacaoId: t.String(),
        conteudo: t.String({
          minLength: 1,
        }),
        parentId: t.Optional(
          t.Nullable(t.String()),
        ),
      }),
    },
  )

  // =========================================================
  // EDITAR COMENTÁRIO
  // =========================================================
  .patch(
    "/:id",
    async ({ request, params, body, set }) => {
      try {
        const usuarioId =
          await requireUser(request);

        const existing = await db
          .select()
          .from(comentarios)
          .where(
            and(
              eq(comentarios.id, params.id),
              eq(
                comentarios.usuarioId,
                usuarioId,
              ),
            ),
          )
          .limit(1);

        if (!existing[0]) {
          set.status = 404;

          return {
            success: false,
            message:
              "Comentário não encontrado.",
          };
        }

        const result = await db
          .update(comentarios)
          .set({
            conteudo:
              body.conteudo.trim(),
            updatedAt: new Date(),
          })
          .where(eq(comentarios.id, params.id))
          .returning();

        return {
          success: true,
          message:
            "Comentário atualizado.",
          data: result[0],
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
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        conteudo: t.String({
          minLength: 1,
        }),
      }),
    },
  )

  // =========================================================
  // ELIMINAR COMENTÁRIO
  // =========================================================
  .delete(
    "/:id",
    async ({ request, params, set }) => {
      try {
        const usuarioId =
          await requireUser(request);

        const result = await db
          .delete(comentarios)
          .where(
            and(
              eq(comentarios.id, params.id),
              eq(
                comentarios.usuarioId,
                usuarioId,
              ),
            ),
          )
          .returning();

        if (!result[0]) {
          set.status = 404;

          return {
            success: false,
            message:
              "Comentário não encontrado.",
          };
        }

        return {
          success: true,
          message:
            "Comentário eliminado.",
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
      params: t.Object({
        id: t.String(),
      }),
    },
  );
