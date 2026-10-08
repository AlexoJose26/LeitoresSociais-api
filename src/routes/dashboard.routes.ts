import { Elysia } from "elysia";
import {
  count,
  desc,
  eq,
} from "drizzle-orm";

import { db } from "../db";
import {
  criticas,
  curtidas,
  estantes,
  livros,
  publicacoes,
  usuarios,
} from "../db/schema";

export const dashboardRoutes = new Elysia({
  prefix: "/dashboard",
  name: "dashboard-routes",
})

  // =========================================================
  // DASHBOARD GERAL
  // GET /dashboard
  // =========================================================
  .get("/", async ({ set }) => {
    try {
      const [
        usersResult,
        booksResult,
        publicationsResult,
        reviewsResult,
        likesResult,
        readingResult,
        completedResult,
      ] = await Promise.all([
        db
          .select({
            total: count(usuarios.id),
          })
          .from(usuarios),

        db
          .select({
            total: count(livros.id),
          })
          .from(livros),

        db
          .select({
            total: count(publicacoes.id),
          })
          .from(publicacoes),

        db
          .select({
            total: count(criticas.id),
          })
          .from(criticas),

        db
          .select({
            total: count(curtidas.id),
          })
          .from(curtidas),

        db
          .select({
            total: count(estantes.id),
          })
          .from(estantes)
          .where(
            eq(estantes.status, "lendo"),
          ),

        db
          .select({
            total: count(estantes.id),
          })
          .from(estantes)
          .where(
            eq(estantes.status, "lido"),
          ),
      ]);

      const recentBooks = await db
        .select()
        .from(livros)
        .orderBy(desc(livros.createdAt))
        .limit(10);

      const recentPublications = await db
        .select({
          id: publicacoes.id,
          conteudo: publicacoes.conteudo,
          tipo: publicacoes.tipo,
          createdAt: publicacoes.createdAt,
          usuario: {
            id: usuarios.id,
            nome: usuarios.nome,
            fotoPerfil: usuarios.fotoPerfil,
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
        .orderBy(
          desc(publicacoes.createdAt),
        )
        .limit(10);

      return {
        success: true,
        data: {
          totais: {
            utilizadores: Number(
              usersResult[0]?.total ?? 0,
            ),

            livros: Number(
              booksResult[0]?.total ?? 0,
            ),

            publicacoes: Number(
              publicationsResult[0]?.total ?? 0,
            ),

            criticas: Number(
              reviewsResult[0]?.total ?? 0,
            ),

            curtidas: Number(
              likesResult[0]?.total ?? 0,
            ),

            lendo: Number(
              readingResult[0]?.total ?? 0,
            ),

            lidos: Number(
              completedResult[0]?.total ?? 0,
            ),
          },

          livrosRecentes: recentBooks,

          publicacoesRecentes:
            recentPublications,
        },
      };
    } catch (error) {
      console.error(
        "Erro ao carregar dashboard:",
        error,
      );

      set.status = 500;

      return {
        success: false,
        message:
          "Não foi possível carregar o dashboard.",
      };
    }
  });
