import { Elysia, t } from "elysia";
import {
  and,
  desc,
  eq,
  sql,
} from "drizzle-orm";

import { db } from "../db";
import {
  comentarios,
  curtidas,
  estatisticasPublicacoes,
  livros,
  partilhas,
  publicacoes,
  usuarios,
} from "../db/schema";
import { requireUser } from "../auth/require-user";

async function getPublicationStats(
  publicacaoId: string,
) {
  const result = await db
    .select({
      curtidas: sql<number>`count(distinct ${curtidas.id})`,
      comentarios: sql<number>`count(distinct ${comentarios.id})`,
      partilhas: sql<number>`count(distinct ${partilhas.id})`,
    })
    .from(publicacoes)
    .leftJoin(
      curtidas,
      eq(
        curtidas.publicacaoId,
        publicacoes.id,
      ),
    )
    .leftJoin(
      comentarios,
      eq(
        comentarios.publicacaoId,
        publicacoes.id,
      ),
    )
    .leftJoin(
      partilhas,
      eq(
        partilhas.publicacaoId,
        publicacoes.id,
      ),
    )
    .where(eq(publicacoes.id, publicacaoId));

  return {
    curtidas: Number(
      result[0]?.curtidas ?? 0,
    ),
    comentarios: Number(
      result[0]?.comentarios ?? 0,
    ),
    partilhas: Number(
      result[0]?.partilhas ?? 0,
    ),
  };
}

export const publicacoesRoutes = new Elysia({
  prefix: "/publicacoes",
})

  // =========================================================
  // FEED
  // GET /publicacoes
  // =========================================================
  .get(
    "/",
    async ({ query }) => {
      const result = await db
        .select({
          id: publicacoes.id,
          usuarioId: publicacoes.usuarioId,
          livroId: publicacoes.livroId,
          conteudo: publicacoes.conteudo,
          tipo: publicacoes.tipo,
          createdAt: publicacoes.createdAt,
          updatedAt: publicacoes.updatedAt,

          usuario: {
            id: usuarios.id,
            nome: usuarios.nome,
            fotoPerfil:
              usuarios.fotoPerfil,
            bio: usuarios.bio,
          },

          livro: {
            id: livros.id,
            titulo: livros.titulo,
            autor: livros.autor,
            capa: livros.capa,
            pdfUrl: livros.pdfUrl,
            pdfNome: livros.pdfNome,
          },
        })
        .from(publicacoes)
        .innerJoin(
          usuarios,
          eq(
            publicacoes.usuarioId,
            usuarios.id,
          ),
        )
        .leftJoin(
          livros,
          eq(
            publicacoes.livroId,
            livros.id,
          ),
        )
        .orderBy(desc(publicacoes.createdAt))
        .limit(
          Math.min(
            Math.max(query.limit ?? 20, 1),
            100,
          ),
        )
        .offset(query.offset ?? 0);

      const data = await Promise.all(
        result.map(async (item) => ({
          ...item,
          estatisticas:
            await getPublicationStats(
              item.id,
            ),
        })),
      );

      return {
        success: true,
        data,
        total: data.length,
      };
    },
    {
      query: t.Object({
        limit: t.Optional(t.Integer()),
        offset: t.Optional(t.Integer()),
      }),
    },
  )

  // =========================================================
  // PUBLICAÇÃO POR ID
  // GET /publicacoes/:id
  // =========================================================
  .get(
    "/:id",
    async ({ params, set }) => {
      const result = await db
        .select({
          id: publicacoes.id,
          usuarioId: publicacoes.usuarioId,
          livroId: publicacoes.livroId,
          conteudo: publicacoes.conteudo,
          tipo: publicacoes.tipo,
          createdAt: publicacoes.createdAt,
          updatedAt: publicacoes.updatedAt,

          usuario: {
            id: usuarios.id,
            nome: usuarios.nome,
            fotoPerfil:
              usuarios.fotoPerfil,
          },

          livro: {
            id: livros.id,
            titulo: livros.titulo,
            autor: livros.autor,
            capa: livros.capa,
            pdfUrl: livros.pdfUrl,
            pdfNome: livros.pdfNome,
          },
        })
        .from(publicacoes)
        .innerJoin(
          usuarios,
          eq(
            publicacoes.usuarioId,
            usuarios.id,
          ),
        )
        .leftJoin(
          livros,
          eq(
            publicacoes.livroId,
            livros.id,
          ),
        )
        .where(
          eq(publicacoes.id, params.id),
        )
        .limit(1);

      const publication = result[0];

      if (!publication) {
        set.status = 404;

        return {
          success: false,
          message:
            "Publicação não encontrada.",
        };
      }

      return {
        success: true,
        data: {
          ...publication,
          estatisticas:
            await getPublicationStats(
              publication.id,
            ),
        },
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )

  // =========================================================
  // CRIAR PUBLICAÇÃO
  // POST /publicacoes
  // =========================================================
  .post(
    "/",
    async ({ request, body, set }) => {
      try {
        const usuarioId =
          await requireUser(request);

        if (
          !body.conteudo?.trim() &&
          !body.livroId
        ) {
          set.status = 400;

          return {
            success: false,
            message:
              "A publicação precisa de conteúdo ou de um livro.",
          };
        }

        if (body.livroId) {
          const book = await db
            .select({
              id: livros.id,
            })
            .from(livros)
            .where(
              eq(livros.id, body.livroId),
            )
            .limit(1);

          if (!book[0]) {
            set.status = 404;

            return {
              success: false,
              message:
                "Livro não encontrado.",
            };
          }
        }

        const result = await db
          .insert(publicacoes)
          .values({
            usuarioId,
            livroId: body.livroId ?? null,
            conteudo:
              body.conteudo?.trim() ?? null,
            tipo: body.tipo ?? "texto",
          })
          .returning();

        const publication = result[0];

        if (publication) {
          await db
            .insert(
              estatisticasPublicacoes,
            )
            .values({
              publicacaoId:
                publication.id,
              visualizacoes: 0,
              curtidas: 0,
              comentarios: 0,
              partilhas: 0,
            })
            .onConflictDoNothing();
        }

        return {
          success: true,
          message:
            "Publicação criada com sucesso.",
          data: publication,
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
        conteudo: t.Optional(
          t.Nullable(t.String()),
        ),
        livroId: t.Optional(
          t.Nullable(t.String()),
        ),
        tipo: t.Optional(
          t.Union([
            t.Literal("texto"),
            t.Literal("livro"),
            t.Literal("leitura"),
            t.Literal("critica"),
          ]),
        ),
      }),
    },
  )

  // =========================================================
  // ATUALIZAR PUBLICAÇÃO
  // PATCH /publicacoes/:id
  // =========================================================
  .patch(
    "/:id",
    async ({ request, params, body, set }) => {
      try {
        const usuarioId =
          await requireUser(request);

        const existing = await db
          .select()
          .from(publicacoes)
          .where(
            and(
              eq(publicacoes.id, params.id),
              eq(
                publicacoes.usuarioId,
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
              "Publicação não encontrada.",
          };
        }

        const result = await db
          .update(publicacoes)
          .set({
            ...(body.conteudo !== undefined && {
              conteudo: body.conteudo,
            }),
            ...(body.livroId !== undefined && {
              livroId: body.livroId,
            }),
            ...(body.tipo !== undefined && {
              tipo: body.tipo,
            }),
            updatedAt: new Date(),
          })
          .where(
            eq(publicacoes.id, params.id),
          )
          .returning();

        return {
          success: true,
          message:
            "Publicação atualizada.",
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
        conteudo: t.Optional(
          t.Nullable(t.String()),
        ),
        livroId: t.Optional(
          t.Nullable(t.String()),
        ),
        tipo: t.Optional(
          t.Union([
            t.Literal("texto"),
            t.Literal("livro"),
            t.Literal("leitura"),
            t.Literal("critica"),
          ]),
        ),
      }),
    },
  )

  // =========================================================
  // ELIMINAR PUBLICAÇÃO
  // DELETE /publicacoes/:id
  // =========================================================
  .delete(
    "/:id",
    async ({ request, params, set }) => {
      try {
        const usuarioId =
          await requireUser(request);

        const result = await db
          .delete(publicacoes)
          .where(
            and(
              eq(publicacoes.id, params.id),
              eq(
                publicacoes.usuarioId,
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
              "Publicação não encontrada.",
          };
        }

        return {
          success: true,
          message:
            "Publicação eliminada.",
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
  )

  // =========================================================
  // REGISTAR VISUALIZAÇÃO
  // POST /publicacoes/:id/visualizacao
  // =========================================================
  .post(
    "/:id/visualizacao",
    async ({ params, set }) => {
      const publication = await db
        .select({
          id: publicacoes.id,
        })
        .from(publicacoes)
        .where(
          eq(publicacoes.id, params.id),
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

      await db
        .insert(estatisticasPublicacoes)
        .values({
          publicacaoId: params.id,
          visualizacoes: 1,
        })
        .onConflictDoUpdate({
          target:
            estatisticasPublicacoes.publicacaoId,
          set: {
            visualizacoes: sql`
              ${estatisticasPublicacoes.visualizacoes} + 1
            `,
            updatedAt: new Date(),
          },
        });

      return {
        success: true,
        message:
          "Visualização registada.",
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  );
