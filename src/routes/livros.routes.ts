import { Elysia, t } from "elysia";
import {
  asc,
  desc,
  eq,
  ilike,
  or,
} from "drizzle-orm";

import { db } from "../db";
import { livros } from "../db/schema";

export const livrosRoutes = new Elysia({
  prefix: "/livros",
})


  .get(
    "/",
    async ({ query }) => {
      const busca = query.busca?.trim();

      const result = busca
        ? await db
            .select()
            .from(livros)
            .where(
              or(
                ilike(
                  livros.titulo,
                  `%${busca}%`,
                ),
                ilike(
                  livros.autor,
                  `%${busca}%`,
                ),
                ilike(
                  livros.categoria,
                  `%${busca}%`,
                ),
                ilike(
                  livros.isbn,
                  `%${busca}%`,
                ),
              ),
            )
            .orderBy(asc(livros.titulo))
            .limit(50)
        : await db
            .select()
            .from(livros)
            .orderBy(desc(livros.createdAt))
            .limit(50);

      return {
        success: true,
        data: result,
        total: result.length,
      };
    },
    {
      query: t.Object({
        busca: t.Optional(t.String()),
      }),
    },
  )

  // =========================================================
  // BUSCAR LIVRO POR ID
  // GET /livros/:id
  // =========================================================
  .get(
    "/:id",
    async ({ params, set }) => {
      const result = await db
        .select()
        .from(livros)
        .where(eq(livros.id, params.id))
        .limit(1);

      const livro = result[0];

      if (!livro) {
        set.status = 404;

        return {
          success: false,
          message: "Livro não encontrado.",
        };
      }

      return {
        success: true,
        data: livro,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )

  // =========================================================
  // BUSCAR POR GOOGLE BOOKS ID
  // GET /livros/google/:googleBooksId
  // =========================================================
  .get(
    "/google/:googleBooksId",
    async ({ params }) => {
      const result = await db
        .select()
        .from(livros)
        .where(
          eq(
            livros.googleBooksId,
            params.googleBooksId,
          ),
        )
        .limit(1);

      return {
        success: true,
        data: result[0] ?? null,
        exists: result.length > 0,
      };
    },
    {
      params: t.Object({
        googleBooksId: t.String(),
      }),
    },
  )

  // =========================================================
  // CRIAR LIVRO
  // POST /livros
  // =========================================================
  .post(
    "/",
    async ({ body, set }) => {
      if (!body.titulo.trim()) {
        set.status = 400;

        return {
          success: false,
          message: "O título é obrigatório.",
        };
      }
if (
  body.paginas !== undefined &&
  body.paginas !== null &&
  body.paginas <= 0
) {
        set.status = 400;

        return {
          success: false,
          message:
            "O número de páginas deve ser maior que zero.",
        };
      }

      if (body.googleBooksId) {
        const existing = await db
          .select()
          .from(livros)
          .where(
            eq(
              livros.googleBooksId,
              body.googleBooksId,
            ),
          )
          .limit(1);

        if (existing[0]) {
          return {
            success: true,
            message: "Livro já existente.",
            data: existing[0],
            alreadyExists: true,
          };
        }
      }

      const result = await db
        .insert(livros)
        .values({
          googleBooksId:
            body.googleBooksId ?? null,
          titulo: body.titulo.trim(),
          autor: body.autor ?? null,
          descricao: body.descricao ?? null,
          capa: body.capa ?? null,
          isbn: body.isbn ?? null,
          categoria: body.categoria ?? null,
          paginas: body.paginas ?? null,
          publicadoEm: body.publicadoEm
            ? new Date(body.publicadoEm)
            : null,
          pdfUrl: body.pdfUrl ?? null,
          pdfNome: body.pdfNome ?? null,
        })
        .returning();

      return {
        success: true,
        message: "Livro criado com sucesso.",
        data: result[0],
      };
    },
    {
      body: t.Object({
        googleBooksId: t.Optional(
          t.Nullable(t.String()),
        ),
        titulo: t.String({
          minLength: 1,
          maxLength: 500,
        }),
        autor: t.Optional(
          t.Nullable(t.String()),
        ),
        descricao: t.Optional(
          t.Nullable(t.String()),
        ),
        capa: t.Optional(
          t.Nullable(t.String()),
        ),
        isbn: t.Optional(
          t.Nullable(t.String()),
        ),
        categoria: t.Optional(
          t.Nullable(t.String()),
        ),
        paginas: t.Optional(
          t.Nullable(t.Integer()),
        ),
        publicadoEm: t.Optional(
          t.Nullable(t.String()),
        ),
        pdfUrl: t.Optional(
          t.Nullable(t.String()),
        ),
        pdfNome: t.Optional(
          t.Nullable(t.String()),
        ),
      }),
    },
  )

  // =========================================================
  // ATUALIZAR LIVRO
  // PATCH /livros/:id
  // =========================================================
  .patch(
    "/:id",
    async ({ params, body, set }) => {
      const existing = await db
        .select()
        .from(livros)
        .where(eq(livros.id, params.id))
        .limit(1);

      if (!existing[0]) {
        set.status = 404;

        return {
          success: false,
          message: "Livro não encontrado.",
        };
      }

      const result = await db
        .update(livros)
        .set({
          ...(body.titulo !== undefined && {
            titulo: body.titulo.trim(),
          }),
          ...(body.autor !== undefined && {
            autor: body.autor,
          }),
          ...(body.descricao !== undefined && {
            descricao: body.descricao,
          }),
          ...(body.capa !== undefined && {
            capa: body.capa,
          }),
          ...(body.isbn !== undefined && {
            isbn: body.isbn,
          }),
          ...(body.categoria !== undefined && {
            categoria: body.categoria,
          }),
          ...(body.paginas !== undefined && {
            paginas: body.paginas,
          }),
          ...(body.publicadoEm !== undefined && {
            publicadoEm: body.publicadoEm
              ? new Date(body.publicadoEm)
              : null,
          }),
          ...(body.pdfUrl !== undefined && {
            pdfUrl: body.pdfUrl,
          }),
          ...(body.pdfNome !== undefined && {
            pdfNome: body.pdfNome,
          }),
          updatedAt: new Date(),
        })
        .where(eq(livros.id, params.id))
        .returning();

      return {
        success: true,
        message: "Livro atualizado com sucesso.",
        data: result[0],
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        titulo: t.Optional(t.String()),
        autor: t.Optional(
          t.Nullable(t.String()),
        ),
        descricao: t.Optional(
          t.Nullable(t.String()),
        ),
        capa: t.Optional(
          t.Nullable(t.String()),
        ),
        isbn: t.Optional(
          t.Nullable(t.String()),
        ),
        categoria: t.Optional(
          t.Nullable(t.String()),
        ),
        paginas: t.Optional(
          t.Nullable(t.Integer()),
        ),
        publicadoEm: t.Optional(
          t.Nullable(t.String()),
        ),
        pdfUrl: t.Optional(
          t.Nullable(t.String()),
        ),
        pdfNome: t.Optional(
          t.Nullable(t.String()),
        ),
      }),
    },
  )

  // =========================================================
  // ELIMINAR LIVRO
  // DELETE /livros/:id
  // =========================================================
  .delete(
    "/:id",
    async ({ params, set }) => {
      const result = await db
        .delete(livros)
        .where(eq(livros.id, params.id))
        .returning();

      if (!result[0]) {
        set.status = 404;

        return {
          success: false,
          message: "Livro não encontrado.",
        };
      }

      return {
        success: true,
        message: "Livro eliminado com sucesso.",
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  );
