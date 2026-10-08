import { Elysia, t } from "elysia";
import { and, desc, eq } from "drizzle-orm";

import { db } from "../db";
import {
  criticas,
  livros,
  usuarios,
} from "../db/schema";
import { requireUser } from "../auth/require-user";

export const criticasRoutes = new Elysia({
  prefix: "/criticas",
  name: "criticas-routes",
})

  // =========================================================
  // LISTAR CRÍTICAS
  // =========================================================
  .get(
    "/",
    async ({ query, set }) => {
      try {
        const conditions = [];

        if (query.livroId) {
          conditions.push(
            eq(criticas.livroId, query.livroId),
          );
        }

        if (query.usuarioId) {
          conditions.push(
            eq(
              criticas.usuarioId,
              query.usuarioId,
            ),
          );
        }

        const rows = await db
          .select({
            id: criticas.id,

            usuarioId: criticas.usuarioId,

            livroId: criticas.livroId,

            titulo: criticas.titulo,

            conteudo: criticas.conteudo,

            avaliacao: criticas.avaliacao,

            createdAt: criticas.createdAt,

            updatedAt: criticas.updatedAt,

            usuarioNome: usuarios.nome,

            usuarioFotoPerfil:
              usuarios.fotoPerfil,

            livroTitulo: livros.titulo,

            livroAutor: livros.autor,

            livroCapa: livros.capa,
          })
          .from(criticas)
          .innerJoin(
            usuarios,
            eq(
              usuarios.id,
              criticas.usuarioId,
            ),
          )
          .innerJoin(
            livros,
            eq(
              livros.id,
              criticas.livroId,
            ),
          )
          .where(
            conditions.length > 0
              ? and(...conditions)
              : undefined,
          )
          .orderBy(
            desc(criticas.createdAt),
          );

        return {
          success: true,
          data: rows,
          total: rows.length,
        };
      } catch (error) {
        console.error(
          "Erro ao listar críticas:",
          error,
        );

        set.status = 500;

        return {
          success: false,
          message:
            "Não foi possível carregar as críticas.",
        };
      }
    },
    {
      query: t.Object({
        livroId: t.Optional(t.String()),
        usuarioId: t.Optional(t.String()),
      }),
    },
  )

  // =========================================================
  // OBTER UMA CRÍTICA
  // =========================================================
  .get(
    "/:id",
    async ({ params, set }) => {
      try {
        const [critica] = await db
          .select({
            id: criticas.id,

            usuarioId: criticas.usuarioId,

            livroId: criticas.livroId,

            titulo: criticas.titulo,

            conteudo: criticas.conteudo,

            avaliacao: criticas.avaliacao,

            createdAt: criticas.createdAt,

            updatedAt: criticas.updatedAt,

            usuarioNome: usuarios.nome,

            usuarioFotoPerfil:
              usuarios.fotoPerfil,

            livroTitulo: livros.titulo,

            livroAutor: livros.autor,

            livroCapa: livros.capa,
          })
          .from(criticas)
          .innerJoin(
            usuarios,
            eq(
              usuarios.id,
              criticas.usuarioId,
            ),
          )
          .innerJoin(
            livros,
            eq(
              livros.id,
              criticas.livroId,
            ),
          )
          .where(
            eq(
              criticas.id,
              params.id,
            ),
          )
          .limit(1);

        if (!critica) {
          set.status = 404;

          return {
            success: false,
            message: "Crítica não encontrada.",
          };
        }

        return {
          success: true,
          data: critica,
        };
      } catch (error) {
        console.error(
          "Erro ao obter crítica:",
          error,
        );

        set.status = 500;

        return {
          success: false,
          message:
            "Não foi possível carregar a crítica.",
        };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )

  // =========================================================
  // CRIAR CRÍTICA
  // =========================================================
  .post(
    "/",
    async ({ request, body, set }) => {
      try {
        const usuario =
          await requireUser(request);

        const titulo =
          body.titulo?.trim() || null;

        const conteudo =
          body.conteudo.trim();

        // ---------------------------------------------------
        // Validação da avaliação
        // ---------------------------------------------------
        if (
          !Number.isInteger(body.avaliacao) ||
          body.avaliacao < 0 ||
          body.avaliacao > 5
        ) {
          set.status = 400;

          return {
            success: false,
            message:
              "A avaliação deve ser um número inteiro entre 0 e 5.",
          };
        }

        // ---------------------------------------------------
        // Validação do conteúdo
        // ---------------------------------------------------
        if (!conteudo) {
          set.status = 400;

          return {
            success: false,
            message:
              "O conteúdo da crítica é obrigatório.",
          };
        }

        // ---------------------------------------------------
        // Verificar livro
        // ---------------------------------------------------
        const [livro] = await db
          .select({
            id: livros.id,
          })
          .from(livros)
          .where(
            eq(
              livros.id,
              body.livroId,
            ),
          )
          .limit(1);

        if (!livro) {
          set.status = 404;

          return {
            success: false,
            message: "Livro não encontrado.",
          };
        }

        // ---------------------------------------------------
        // Verificar crítica existente
        // ---------------------------------------------------
        const [existente] = await db
          .select({
            id: criticas.id,
          })
          .from(criticas)
          .where(
            and(
              eq(
                criticas.usuarioId,
                usuario,
              ),
              eq(
                criticas.livroId,
                body.livroId,
              ),
            ),
          )
          .limit(1);

        if (existente) {
          set.status = 409;

          return {
            success: false,
            message:
              "Você já publicou uma crítica para este livro.",
          };
        }

        // ---------------------------------------------------
        // Criar crítica
        // ---------------------------------------------------
        const [novaCritica] =
          await db
            .insert(criticas)
            .values({
              usuarioId: usuario,

              livroId: body.livroId,

              titulo,

              conteudo,

              avaliacao:
                body.avaliacao,

              createdAt: new Date(),

              updatedAt: new Date(),
            })
            .returning();

        set.status = 201;

        return {
          success: true,

          message:
            "Crítica publicada com sucesso.",

          data: novaCritica,
        };
      } catch (error) {
        console.error(
          "Erro ao criar crítica:",
          error,
        );

        set.status = 500;

        return {
          success: false,
          message:
            "Não foi possível publicar a crítica.",
        };
      }
    },
    {
      body: t.Object({
        livroId: t.String(),

        titulo: t.Optional(
          t.String(),
        ),

        conteudo: t.String({
          minLength: 1,
        }),

        avaliacao: t.Number(),
      }),
    },
  )

  // =========================================================
  // ATUALIZAR CRÍTICA
  // =========================================================
  .patch(
    "/:id",
    async ({
      request,
      params,
      body,
      set,
    }) => {
      try {
        const usuario =
          await requireUser(request);

        // ---------------------------------------------------
        // Buscar crítica
        // ---------------------------------------------------
        const [existente] =
          await db
            .select({
              id: criticas.id,

              usuarioId:
                criticas.usuarioId,
            })
            .from(criticas)
            .where(
              eq(
                criticas.id,
                params.id,
              ),
            )
            .limit(1);

        if (!existente) {
          set.status = 404;

          return {
            success: false,
            message:
              "Crítica não encontrada.",
          };
        }

        // ---------------------------------------------------
        // Verificar proprietário
        // ---------------------------------------------------
        if (
          existente.usuarioId !==
          usuario
        ) {
          set.status = 403;

          return {
            success: false,
            message:
              "Você não pode editar esta crítica.",
          };
        }

        // ---------------------------------------------------
        // Validar avaliação
        // ---------------------------------------------------
        if (
          body.avaliacao !== undefined &&
          (
            !Number.isInteger(
              body.avaliacao,
            ) ||
            body.avaliacao < 0 ||
            body.avaliacao > 5
          )
        ) {
          set.status = 400;

          return {
            success: false,
            message:
              "A avaliação deve ser um número inteiro entre 0 e 5.",
          };
        }

        // ---------------------------------------------------
        // Validar conteúdo
        // ---------------------------------------------------
        if (
          body.conteudo !== undefined &&
          !body.conteudo.trim()
        ) {
          set.status = 400;

          return {
            success: false,
            message:
              "O conteúdo da crítica não pode ficar vazio.",
          };
        }

        // ---------------------------------------------------
        // Atualizar
        // ---------------------------------------------------
        const [atualizada] =
          await db
            .update(criticas)
            .set({
              titulo:
                body.titulo !==
                undefined
                  ? body.titulo.trim() ||
                    null
                  : undefined,

              conteudo:
                body.conteudo !==
                undefined
                  ? body.conteudo.trim()
                  : undefined,

              avaliacao:
                body.avaliacao !==
                undefined
                  ? body.avaliacao
                  : undefined,

              updatedAt:
                new Date(),
            })
            .where(
              eq(
                criticas.id,
                params.id,
              ),
            )
            .returning();

        return {
          success: true,

          message:
            "Crítica atualizada com sucesso.",

          data: atualizada,
        };
      } catch (error) {
        console.error(
          "Erro ao atualizar crítica:",
          error,
        );

        set.status = 500;

        return {
          success: false,
          message:
            "Não foi possível atualizar a crítica.",
        };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),

      body: t.Object({
        titulo: t.Optional(
          t.String(),
        ),

        conteudo: t.Optional(
          t.String({
            minLength: 1,
          }),
        ),

        avaliacao: t.Optional(
          t.Number(),
        ),
      }),
    },
  )

  // =========================================================
  // APAGAR CRÍTICA
  // =========================================================
  .delete(
    "/:id",
    async ({
      request,
      params,
      set,
    }) => {
      try {
        const usuario =
          await requireUser(request);

        // ---------------------------------------------------
        // Buscar crítica
        // ---------------------------------------------------
        const [existente] =
          await db
            .select({
              id: criticas.id,

              usuarioId:
                criticas.usuarioId,
            })
            .from(criticas)
            .where(
              eq(
                criticas.id,
                params.id,
              ),
            )
            .limit(1);

        if (!existente) {
          set.status = 404;

          return {
            success: false,
            message:
              "Crítica não encontrada.",
          };
        }

        // ---------------------------------------------------
        // Verificar proprietário
        // ---------------------------------------------------
        if (
          existente.usuarioId !==
          usuario
        ) {
          set.status = 403;

          return {
            success: false,
            message:
              "Você não pode apagar esta crítica.",
          };
        }

        // ---------------------------------------------------
        // Apagar
        // ---------------------------------------------------
        await db
          .delete(criticas)
          .where(
            eq(
              criticas.id,
              params.id,
            ),
          );

        return {
          success: true,
          message:
            "Crítica removida com sucesso.",
        };
      } catch (error) {
        console.error(
          "Erro ao apagar crítica:",
          error,
        );

        set.status = 500;

        return {
          success: false,
          message:
            "Não foi possível remover a crítica.",
        };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  );
