import { Elysia, t } from "elysia";
import {
  and,
  desc,
  eq,
} from "drizzle-orm";

import { db } from "../db";
import {
  estantes,
  livros,
} from "../db/schema";
import { requireUser } from "../auth/require-user";

export const estantesRoutes = new Elysia({
  prefix: "/estantes",
})

  // =========================================================
  // MINHA ESTANTE
  // GET /estantes
  // =========================================================
  .get(
    "/",
    async ({ request, query, set }) => {
      try {
        const usuarioId =
          await requireUser(request);

        const conditions = [
          eq(estantes.usuarioId, usuarioId),
        ];

        if (query.status) {
          conditions.push(
            eq(estantes.status, query.status),
          );
        }

        const result = await db
          .select({
            id: estantes.id,
            usuarioId: estantes.usuarioId,
            livroId: estantes.livroId,
            status: estantes.status,
            progresso: estantes.progresso,
            nota: estantes.nota,
            createdAt: estantes.createdAt,
            updatedAt: estantes.updatedAt,

            livro: {
              id: livros.id,
              googleBooksId:
                livros.googleBooksId,
              titulo: livros.titulo,
              autor: livros.autor,
              descricao: livros.descricao,
              capa: livros.capa,
              isbn: livros.isbn,
              categoria: livros.categoria,
              paginas: livros.paginas,
              publicadoEm:
                livros.publicadoEm,
              pdfUrl: livros.pdfUrl,
              pdfNome: livros.pdfNome,
            },
          })
          .from(estantes)
          .innerJoin(
            livros,
            eq(estantes.livroId, livros.id),
          )
          .where(and(...conditions))
          .orderBy(desc(estantes.updatedAt));

        return {
          success: true,
          data: result,
          total: result.length,
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
      query: t.Object({
        status: t.Optional(
          t.Union([
            t.Literal("quero_ler"),
            t.Literal("lendo"),
            t.Literal("lido"),
          ]),
        ),
      }),
    },
  )

  // =========================================================
  // ADICIONAR / ATUALIZAR LIVRO NA ESTANTE
  // POST /estantes
  // =========================================================
  .post(
    "/",
    async ({ request, body, set }) => {
      try {
        const usuarioId =
          await requireUser(request);

        const livro = await db
          .select()
          .from(livros)
          .where(eq(livros.id, body.livroId))
          .limit(1);

        if (!livro[0]) {
          set.status = 404;

          return {
            success: false,
            message: "Livro não encontrado.",
          };
        }

        const existing = await db
          .select()
          .from(estantes)
          .where(
            and(
              eq(estantes.usuarioId, usuarioId),
              eq(estantes.livroId, body.livroId),
            ),
          )
          .limit(1);

        let result;

        if (existing[0]) {
          result = await db
            .update(estantes)
            .set({
              status: body.status,
              progresso:
                body.progresso ??
                existing[0].progresso,
              nota:
                body.nota ??
                existing[0].nota,
              updatedAt: new Date(),
            })
            .where(
              eq(
                estantes.id,
                existing[0].id,
              ),
            )
            .returning();
        } else {
          result = await db
            .insert(estantes)
            .values({
              usuarioId,
              livroId: body.livroId,
              status:
                body.status ?? "quero_ler",
              progresso:
                body.progresso ?? 0,
              nota: body.nota ?? null,
            })
            .returning();
        }

        return {
          success: true,
          message:
            "Estante atualizada com sucesso.",
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
        livroId: t.String(),
        status: t.Optional(
          t.Union([
            t.Literal("quero_ler"),
            t.Literal("lendo"),
            t.Literal("lido"),
          ]),
        ),
        progresso: t.Optional(
          t.Integer({
            minimum: 0,
            maximum: 100,
          }),
        ),
        nota: t.Optional(
          t.Nullable(
            t.Integer({
              minimum: 0,
              maximum: 5,
            }),
          ),
        ),
      }),
    },
  )

  // =========================================================
  // ATUALIZAR ITEM DA ESTANTE
  // PATCH /estantes/:id
  // =========================================================
  .patch(
    "/:id",
    async ({ request, params, body, set }) => {
      try {
        const usuarioId =
          await requireUser(request);

        const existing = await db
          .select()
          .from(estantes)
          .where(
            and(
              eq(estantes.id, params.id),
              eq(estantes.usuarioId, usuarioId),
            ),
          )
          .limit(1);

        if (!existing[0]) {
          set.status = 404;

          return {
            success: false,
            message:
              "Item da estante não encontrado.",
          };
        }

        const result = await db
          .update(estantes)
          .set({
            ...(body.status !== undefined && {
              status: body.status,
            }),
            ...(body.progresso !== undefined && {
              progresso: body.progresso,
            }),
            ...(body.nota !== undefined && {
              nota: body.nota,
            }),
            updatedAt: new Date(),
          })
          .where(eq(estantes.id, params.id))
          .returning();

        return {
          success: true,
          message:
            "Item da estante atualizado.",
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
        status: t.Optional(
          t.Union([
            t.Literal("quero_ler"),
            t.Literal("lendo"),
            t.Literal("lido"),
          ]),
        ),
        progresso: t.Optional(
          t.Integer({
            minimum: 0,
            maximum: 100,
          }),
        ),
        nota: t.Optional(
          t.Nullable(
            t.Integer({
              minimum: 0,
              maximum: 5,
            }),
          ),
        ),
      }),
    },
  )

  // =========================================================
  // REMOVER DA ESTANTE
  // DELETE /estantes/:id
  // =========================================================
  .delete(
    "/:id",
    async ({ request, params, set }) => {
      try {
        const usuarioId =
          await requireUser(request);

        const result = await db
          .delete(estantes)
          .where(
            and(
              eq(estantes.id, params.id),
              eq(estantes.usuarioId, usuarioId),
            ),
          )
          .returning();

        if (!result[0]) {
          set.status = 404;

          return {
            success: false,
            message:
              "Item da estante não encontrado.",
          };
        }

        return {
          success: true,
          message:
            "Livro removido da estante.",
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
