import { Elysia, t } from "elysia";
import {
  and,
  desc,
  eq,
  sql,
} from "drizzle-orm";

import { db } from "../db";
import {
  curtidas,
  publicacoes,
  usuarios,
} from "../db/schema";
import { requireUser } from "../auth/require-user";

export const curtidasRoutes = new Elysia({
  prefix: "/curtidas",
})

  // =========================================================
  // LISTAR REAÇÕES DA PUBLICAÇÃO
  // GET /curtidas/publicacao/:publicacaoId
  // =========================================================
  .get(
    "/publicacao/:publicacaoId",
    async ({ params }) => {
      const result = await db
        .select({
          id: curtidas.id,
          usuarioId: curtidas.usuarioId,
          publicacaoId:
            curtidas.publicacaoId,
          tipo: curtidas.tipo,
          createdAt: curtidas.createdAt,

          usuario: {
            id: usuarios.id,
            nome: usuarios.nome,
            fotoPerfil:
              usuarios.fotoPerfil,
          },
        })
        .from(curtidas)
        .innerJoin(
          usuarios,
          eq(
            curtidas.usuarioId,
            usuarios.id,
          ),
        )
        .where(
          eq(
            curtidas.publicacaoId,
            params.publicacaoId,
          ),
        )
        .orderBy(desc(curtidas.createdAt));

      return {
        success: true,
        data: result,
        total: result.length,
      };
    },
    {
      params: t.Object({
        publicacaoId: t.String(),
      }),
    },
  )

  // =========================================================
  // CONTAGEM DE REAÇÕES
  // GET /curtidas/publicacao/:publicacaoId/resumo
  // =========================================================
  .get(
    "/publicacao/:publicacaoId/resumo",
    async ({ params }) => {
      const result = await db
        .select({
          tipo: curtidas.tipo,
          total: sql<number>`count(*)`,
        })
        .from(curtidas)
        .where(
          eq(
            curtidas.publicacaoId,
            params.publicacaoId,
          ),
        )
        .groupBy(curtidas.tipo);

      const resumo = {
        gosto: 0,
        adoro: 0,
        riso: 0,
        tristeza: 0,
        coragem: 0,
        total: 0,
      };

      for (const item of result) {
        resumo[item.tipo] = Number(
          item.total,
        );
        resumo.total += Number(
          item.total,
        );
      }

      return {
        success: true,
        data: resumo,
      };
    },
    {
      params: t.Object({
        publicacaoId: t.String(),
      }),
    },
  )

  // =========================================================
  // MINHA REAÇÃO
  // GET /curtidas/publicacao/:publicacaoId/minha
  // =========================================================
  .get(
    "/publicacao/:publicacaoId/minha",
    async ({ request, params, set }) => {
      try {
        const usuarioId =
          await requireUser(request);

        const result = await db
          .select()
          .from(curtidas)
          .where(
            and(
              eq(
                curtidas.publicacaoId,
                params.publicacaoId,
              ),
              eq(
                curtidas.usuarioId,
                usuarioId,
              ),
            ),
          )
          .limit(1);

        return {
          success: true,
          data: result[0] ?? null,
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
        publicacaoId: t.String(),
      }),
    },
  )

  // =========================================================
  // CRIAR / ALTERAR REAÇÃO
  // POST /curtidas
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

        const existing = await db
          .select()
          .from(curtidas)
          .where(
            and(
              eq(
                curtidas.usuarioId,
                usuarioId,
              ),
              eq(
                curtidas.publicacaoId,
                body.publicacaoId,
              ),
            ),
          )
          .limit(1);

        let result;

        if (existing[0]) {
          result = await db
            .update(curtidas)
            .set({
              tipo: body.tipo,
            })
            .where(
              eq(
                curtidas.id,
                existing[0].id,
              ),
            )
            .returning();
        } else {
          result = await db
            .insert(curtidas)
            .values({
              usuarioId,
              publicacaoId:
                body.publicacaoId,
              tipo: body.tipo ?? "gosto",
            })
            .returning();
        }

        return {
          success: true,
          message:
            "Reação registada com sucesso.",
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
        tipo: t.Optional(
          t.Union([
            t.Literal("gosto"),
            t.Literal("adoro"),
            t.Literal("riso"),
            t.Literal("tristeza"),
            t.Literal("coragem"),
          ]),
        ),
      }),
    },
  )

  // =========================================================
  // REMOVER REAÇÃO
  // DELETE /curtidas/publicacao/:publicacaoId
  // =========================================================
  .delete(
    "/publicacao/:publicacaoId",
    async ({ request, params, set }) => {
      try {
        const usuarioId =
          await requireUser(request);

        await db
          .delete(curtidas)
          .where(
            and(
              eq(
                curtidas.publicacaoId,
                params.publicacaoId,
              ),
              eq(
                curtidas.usuarioId,
                usuarioId,
              ),
            ),
          );

        return {
          success: true,
          message: "Reação removida.",
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
        publicacaoId: t.String(),
      }),
    },
  );
