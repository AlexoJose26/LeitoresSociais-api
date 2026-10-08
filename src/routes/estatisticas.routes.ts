import { Elysia, t } from "elysia";
import {
  and,
  count,
  desc,
  eq,
  sql,
} from "drizzle-orm";

import { db } from "../db";
import {
  comentarios,
  curtidas,
  estatisticasPublicacoes,
  partilhas,
  publicacoes,
} from "../db/schema";
import { requireUser } from "../auth/require-user";

export const estatisticasRoutes = new Elysia({
  prefix: "/estatisticas",
  name: "estatisticas-routes",
})
  // =========================================================
  // ESTATÍSTICAS DE UMA PUBLICAÇÃO
  // =========================================================
  .get(
    "/publicacao/:publicacaoId",
    async ({ request, params, set }) => {
      try {
        const usuario = await requireUser(request);

        const [publicacao] = await db
          .select({
            id: publicacoes.id,
          })
          .from(publicacoes)
          .where(eq(publicacoes.id, params.publicacaoId))
          .limit(1);

        if (!publicacao) {
          set.status = 404;

          return {
            success: false,
            message: "Publicação não encontrada.",
          };
        }

        // -----------------------------------------------------
        // Visualizações
        // -----------------------------------------------------
        const [visualizacoesRow] = await db
          .select({
            visualizacoes:
              estatisticasPublicacoes.visualizacoes,
          })
          .from(estatisticasPublicacoes)
          .where(
            eq(
              estatisticasPublicacoes.publicacaoId,
              params.publicacaoId,
            ),
          )
          .limit(1);

        // -----------------------------------------------------
        // Total de curtidas
        // -----------------------------------------------------
        const [curtidasRow] = await db
          .select({
            total: count(curtidas.id),
          })
          .from(curtidas)
          .where(
            eq(
              curtidas.publicacaoId,
              params.publicacaoId,
            ),
          );

        // -----------------------------------------------------
        // Total de comentários
        // -----------------------------------------------------
        const [comentariosRow] = await db
          .select({
            total: count(comentarios.id),
          })
          .from(comentarios)
          .where(
            eq(
              comentarios.publicacaoId,
              params.publicacaoId,
            ),
          );

        // -----------------------------------------------------
        // Total de partilhas
        // -----------------------------------------------------
        const [partilhasRow] = await db
          .select({
            total: count(partilhas.id),
          })
          .from(partilhas)
          .where(
            eq(
              partilhas.publicacaoId,
              params.publicacaoId,
            ),
          );

        // -----------------------------------------------------
        // Distribuição das reações
        // -----------------------------------------------------
        const reacoes = await db
          .select({
            tipo: curtidas.tipo,
            total: count(curtidas.id),
          })
          .from(curtidas)
          .where(
            eq(
              curtidas.publicacaoId,
              params.publicacaoId,
            ),
          )
          .groupBy(curtidas.tipo)
          .orderBy(desc(count(curtidas.id)));

        // -----------------------------------------------------
        // Reação do utilizador autenticado
        // -----------------------------------------------------
        const [minhaReacao] = await db
          .select({
            tipo: curtidas.tipo,
          })
          .from(curtidas)
          .where(
            and(
              eq(
                curtidas.publicacaoId,
                params.publicacaoId,
              ),
              eq(curtidas.usuarioId, usuario),
            ),
          )
          .limit(1);

        const visualizacoes = Number(
          visualizacoesRow?.visualizacoes ?? 0,
        );

        const totalCurtidas = Number(
          curtidasRow?.total ?? 0,
        );

        const totalComentarios = Number(
          comentariosRow?.total ?? 0,
        );

        const totalPartilhas = Number(
          partilhasRow?.total ?? 0,
        );

        // -----------------------------------------------------
        // Sincronizar tabela de estatísticas
        // -----------------------------------------------------
        await db
          .insert(estatisticasPublicacoes)
          .values({
            publicacaoId: params.publicacaoId,
            visualizacoes,
            curtidas: totalCurtidas,
            comentarios: totalComentarios,
            partilhas: totalPartilhas,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target:
              estatisticasPublicacoes.publicacaoId,
            set: {
              curtidas: totalCurtidas,
              comentarios: totalComentarios,
              partilhas: totalPartilhas,
              updatedAt: new Date(),
            },
          });

        return {
          success: true,
          data: {
            publicacaoId: params.publicacaoId,

            visualizacoes,

            curtidas: totalCurtidas,

            comentarios: totalComentarios,

            partilhas: totalPartilhas,

            minhaReacao:
              minhaReacao?.tipo ?? null,

            reacoes: reacoes.map((item) => ({
              tipo: item.tipo,
              total: Number(item.total),
            })),
          },
        };
      } catch (error) {
        console.error(
          "Erro ao obter estatísticas:",
          error,
        );

        set.status = 500;

        return {
          success: false,
          message:
            "Não foi possível carregar as estatísticas.",
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
  // REGISTRAR VISUALIZAÇÃO
  // =========================================================
  .post(
    "/publicacao/:publicacaoId/visualizacao",
    async ({ params, set }) => {
      try {
        const [publicacao] = await db
          .select({
            id: publicacoes.id,
          })
          .from(publicacoes)
          .where(eq(publicacoes.id, params.publicacaoId))
          .limit(1);

        if (!publicacao) {
          set.status = 404;

          return {
            success: false,
            message: "Publicação não encontrada.",
          };
        }

        await db
          .insert(estatisticasPublicacoes)
          .values({
            publicacaoId: params.publicacaoId,
            visualizacoes: 1,
            curtidas: 0,
            comentarios: 0,
            partilhas: 0,
            updatedAt: new Date(),
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
          message: "Visualização registrada.",
        };
      } catch (error) {
        console.error(
          "Erro ao registrar visualização:",
          error,
        );

        set.status = 500;

        return {
          success: false,
          message:
            "Não foi possível registrar a visualização.",
        };
      }
    },
    {
      params: t.Object({
        publicacaoId: t.String(),
      }),
    },
  );
