import { Elysia, t } from "elysia";
import {
  and,
  desc,
  eq,
} from "drizzle-orm";

import { db } from "../db";
import {
  partilhas,
  publicacoes,
  usuarios,
} from "../db/schema";
import { requireUser } from "../auth/require-user";

export const partilhasRoutes = new Elysia({
  prefix: "/partilhas",
})

  // =========================================================
  // LISTAR PARTILHAS
  // GET /partilhas/publicacao/:publicacaoId
  // =========================================================
  .get(
    "/publicacao/:publicacaoId",
    async ({ params }) => {
      const result = await db
        .select({
          id: partilhas.id,
          usuarioId: partilhas.usuarioId,
          publicacaoId:
            partilhas.publicacaoId,
          comentario:
            partilhas.comentario,
          createdAt: partilhas.createdAt,

          usuario: {
            id: usuarios.id,
            nome: usuarios.nome,
            fotoPerfil:
              usuarios.fotoPerfil,
          },
        })
        .from(partilhas)
        .innerJoin(
          usuarios,
          eq(
            partilhas.usuarioId,
            usuarios.id,
          ),
        )
        .where(
          eq(
            partilhas.publicacaoId,
            params.publicacaoId,
          ),
        )
        .orderBy(desc(partilhas.createdAt));

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
  // CRIAR PARTILHA
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

        const result = await db
          .insert(partilhas)
          .values({
            usuarioId,
            publicacaoId:
              body.publicacaoId,
            comentario:
              body.comentario ?? null,
          })
          .returning();

        return {
          success: true,
          message:
            "Publicação partilhada com sucesso.",
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
        comentario: t.Optional(
          t.Nullable(t.String()),
        ),
      }),
    },
  )

  // =========================================================
  // ELIMINAR PARTILHA
  // =========================================================
  .delete(
    "/:id",
    async ({ request, params, set }) => {
      try {
        const usuarioId =
          await requireUser(request);

        const result = await db
          .delete(partilhas)
          .where(
            and(
              eq(partilhas.id, params.id),
              eq(
                partilhas.usuarioId,
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
              "Partilha não encontrada.",
          };
        }

        return {
          success: true,
          message:
            "Partilha eliminada.",
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
