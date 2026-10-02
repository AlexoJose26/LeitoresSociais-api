import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import type {
  AnyPgColumn,
} from "drizzle-orm/pg-core";

import { sql } from "drizzle-orm";

/* =========================================================
   ENUMS
   ========================================================= */

export const estanteStatusEnum = pgEnum("estante_status", [
  "quero_ler",
  "lendo",
  "lido",
]);

export const publicacaoTipoEnum = pgEnum("publicacao_tipo", [
  "texto",
  "livro",
  "leitura",
  "critica",
]);

export const curtidaTipoEnum = pgEnum("curtida_tipo", [
  "gosto",
  "adoro",
  "riso",
  "tristeza",
  "coragem",
]);

/* =========================================================
   USUÁRIOS
   ========================================================= */

export const usuarios = pgTable(
  "usuarios",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    nome: varchar("nome", {
      length: 120,
    }).notNull(),

    email: varchar("email", {
      length: 255,
    }).notNull(),

    senhaHash: text("senha_hash").notNull(),

    fotoPerfil: text("foto_perfil"),

    bio: text("bio"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    emailUnique: unique(
      "usuarios_email_unique",
    ).on(table.email),

    emailIndex: index(
      "usuarios_email_idx",
    ).on(table.email),

    nomeIndex: index(
      "usuarios_nome_idx",
    ).on(table.nome),
  }),
);

/* =========================================================
   LIVROS
   ========================================================= */

export const livros = pgTable(
  "livros",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    googleBooksId: varchar("google_books_id", {
      length: 255,
    }),

    titulo: varchar("titulo", {
      length: 500,
    }).notNull(),

    autor: varchar("autor", {
      length: 500,
    }),

    descricao: text("descricao"),

    capa: text("capa"),

    isbn: varchar("isbn", {
      length: 50,
    }),

    categoria: varchar("categoria", {
      length: 150,
    }),

    paginas: integer("paginas"),

    publicadoEm: timestamp("publicado_em", {
      withTimezone: true,
    }),

    pdfUrl: text("pdf_url"),

    pdfNome: varchar("pdf_nome", {
      length: 500,
    }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    googleBooksIdUnique: unique(
      "livros_google_books_id_unique",
    ).on(table.googleBooksId),

    googleBooksIndex: index(
      "livros_google_books_id_idx",
    ).on(table.googleBooksId),

    tituloIndex: index(
      "livros_titulo_idx",
    ).on(table.titulo),

    autorIndex: index(
      "livros_autor_idx",
    ).on(table.autor),

    categoriaIndex: index(
      "livros_categoria_idx",
    ).on(table.categoria),

    isbnIndex: index(
      "livros_isbn_idx",
    ).on(table.isbn),

    paginasCheck: check(
      "livros_paginas_check",
      sql`${table.paginas} IS NULL OR ${table.paginas} > 0`,
    ),
  }),
);

/* =========================================================
   ESTANTES
   ========================================================= */

export const estantes = pgTable(
  "estantes",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuarios.id, {
        onDelete: "cascade",
      }),

    livroId: uuid("livro_id")
      .notNull()
      .references(() => livros.id, {
        onDelete: "cascade",
      }),

    status: estanteStatusEnum("status")
      .default("quero_ler")
      .notNull(),

    progresso: integer("progresso")
      .default(0)
      .notNull(),

    nota: integer("nota"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    usuarioLivroUnique: unique(
      "estantes_usuario_livro_unique",
    ).on(
      table.usuarioId,
      table.livroId,
    ),

    usuarioIndex: index(
      "estantes_usuario_idx",
    ).on(table.usuarioId),

    livroIndex: index(
      "estantes_livro_idx",
    ).on(table.livroId),

    statusIndex: index(
      "estantes_status_idx",
    ).on(table.status),

    usuarioStatusIndex: index(
      "estantes_usuario_status_idx",
    ).on(
      table.usuarioId,
      table.status,
    ),

    progressoCheck: check(
      "estantes_progresso_check",
      sql`${table.progresso} >= 0 AND ${table.progresso} <= 100`,
    ),

    notaCheck: check(
      "estantes_nota_check",
      sql`
        ${table.nota} IS NULL
        OR (
          ${table.nota} >= 0
          AND ${table.nota} <= 5
        )
      `,
    ),
  }),
);

/* =========================================================
   PUBLICAÇÕES
   ========================================================= */

export const publicacoes = pgTable(
  "publicacoes",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuarios.id, {
        onDelete: "cascade",
      }),

    livroId: uuid("livro_id").references(
      () => livros.id,
      {
        onDelete: "set null",
      },
    ),

    conteudo: text("conteudo"),

    tipo: publicacaoTipoEnum("tipo")
      .default("texto")
      .notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    createdAtIndex: index(
      "publicacoes_created_at_idx",
    ).on(table.createdAt),

    usuarioIndex: index(
      "publicacoes_usuario_idx",
    ).on(table.usuarioId),

    livroIndex: index(
      "publicacoes_livro_idx",
    ).on(table.livroId),

    tipoIndex: index(
      "publicacoes_tipo_idx",
    ).on(table.tipo),
  }),
);

/* =========================================================
   CRÍTICAS
   ========================================================= */

export const criticas = pgTable(
  "criticas",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuarios.id, {
        onDelete: "cascade",
      }),

    livroId: uuid("livro_id")
      .notNull()
      .references(() => livros.id, {
        onDelete: "cascade",
      }),

    titulo: varchar("titulo", {
      length: 255,
    }),

    conteudo: text("conteudo")
      .notNull(),

    avaliacao: integer("avaliacao")
      .notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    usuarioIndex: index(
      "criticas_usuario_idx",
    ).on(table.usuarioId),

    livroIndex: index(
      "criticas_livro_idx",
    ).on(table.livroId),

    avaliacaoIndex: index(
      "criticas_avaliacao_idx",
    ).on(table.avaliacao),

    createdAtIndex: index(
      "criticas_created_at_idx",
    ).on(table.createdAt),

    avaliacaoCheck: check(
      "criticas_avaliacao_check",
      sql`
        ${table.avaliacao} >= 0
        AND ${table.avaliacao} <= 5
      `,
    ),
  }),
);

/* =========================================================
   CURTIDAS / REAÇÕES
   ========================================================= */

export const curtidas = pgTable(
  "curtidas",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuarios.id, {
        onDelete: "cascade",
      }),

    publicacaoId: uuid("publicacao_id")
      .notNull()
      .references(() => publicacoes.id, {
        onDelete: "cascade",
      }),

    tipo: curtidaTipoEnum("tipo")
      .default("gosto")
      .notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    usuarioPublicacaoUnique: unique(
      "curtidas_usuario_publicacao_unique",
    ).on(
      table.usuarioId,
      table.publicacaoId,
    ),

    publicacaoIndex: index(
      "curtidas_publicacao_idx",
    ).on(table.publicacaoId),

    usuarioIndex: index(
      "curtidas_usuario_idx",
    ).on(table.usuarioId),

    tipoIndex: index(
      "curtidas_tipo_idx",
    ).on(table.tipo),

    publicacaoTipoIndex: index(
      "curtidas_publicacao_tipo_idx",
    ).on(
      table.publicacaoId,
      table.tipo,
    ),

    createdAtIndex: index(
      "curtidas_created_at_idx",
    ).on(table.createdAt),
  }),
);

/* =========================================================
   COMENTÁRIOS
   ========================================================= */

export const comentarios = pgTable(
  "comentarios",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuarios.id, {
        onDelete: "cascade",
      }),

    publicacaoId: uuid("publicacao_id")
      .notNull()
      .references(() => publicacoes.id, {
        onDelete: "cascade",
      }),

    /*
     * Comentário pai.
     *
     * Esta é uma referência recursiva à própria tabela.
     * O retorno precisa ser explicitamente tipado como
     * AnyPgColumn para evitar o erro de inferência circular
     * do TypeScript/Drizzle.
     */
    parentId: uuid("parent_id").references(
      (): AnyPgColumn => comentarios.id,
      {
        onDelete: "set null",
      },
    ),

    conteudo: text("conteudo")
      .notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    publicacaoIndex: index(
      "comentarios_publicacao_idx",
    ).on(table.publicacaoId),

    usuarioIndex: index(
      "comentarios_usuario_idx",
    ).on(table.usuarioId),

    parentIndex: index(
      "comentarios_parent_idx",
    ).on(table.parentId),

    createdAtIndex: index(
      "comentarios_created_at_idx",
    ).on(table.createdAt),
  }),
);

/* =========================================================
   PARTILHAS
   ========================================================= */

export const partilhas = pgTable(
  "partilhas",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuarios.id, {
        onDelete: "cascade",
      }),

    publicacaoId: uuid("publicacao_id")
      .notNull()
      .references(() => publicacoes.id, {
        onDelete: "cascade",
      }),

    comentario: text("comentario"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    publicacaoIndex: index(
      "partilhas_publicacao_idx",
    ).on(table.publicacaoId),

    usuarioIndex: index(
      "partilhas_usuario_idx",
    ).on(table.usuarioId),

    createdAtIndex: index(
      "partilhas_created_at_idx",
    ).on(table.createdAt),
  }),
);

/* =========================================================
   ESTATÍSTICAS DAS PUBLICAÇÕES
   ========================================================= */

export const estatisticasPublicacoes = pgTable(
  "estatisticas_publicacoes",
  {
    publicacaoId: uuid("publicacao_id")
      .primaryKey()
      .references(() => publicacoes.id, {
        onDelete: "cascade",
      }),

    visualizacoes: integer("visualizacoes")
      .default(0)
      .notNull(),

    curtidas: integer("curtidas")
      .default(0)
      .notNull(),

    comentarios: integer("comentarios")
      .default(0)
      .notNull(),

    partilhas: integer("partilhas")
      .default(0)
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    visualizacoesCheck: check(
      "estatisticas_visualizacoes_check",
      sql`${table.visualizacoes} >= 0`,
    ),

    curtidasCheck: check(
      "estatisticas_curtidas_check",
      sql`${table.curtidas} >= 0`,
    ),

    comentariosCheck: check(
      "estatisticas_comentarios_check",
      sql`${table.comentarios} >= 0`,
    ),

    partilhasCheck: check(
      "estatisticas_partilhas_check",
      sql`${table.partilhas} >= 0`,
    ),
  }),
);

/* =========================================================
   SESSÕES
   ========================================================= */

export const sessoes = pgTable(
  "sessoes",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuarios.id, {
        onDelete: "cascade",
      }),

    tokenHash: text("token_hash")
      .notNull(),

    expiresAt: timestamp("expires_at", {
      withTimezone: true,
    }).notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    revoked: boolean("revoked")
      .default(false)
      .notNull(),
  },
  (table) => ({
    tokenHashUnique: unique(
      "sessoes_token_hash_unique",
    ).on(table.tokenHash),

    usuarioIndex: index(
      "sessoes_usuario_idx",
    ).on(table.usuarioId),

    expiresAtIndex: index(
      "sessoes_expires_at_idx",
    ).on(table.expiresAt),

    revokedIndex: index(
      "sessoes_revoked_idx",
    ).on(table.revoked),

    usuarioRevokedIndex: index(
      "sessoes_usuario_revoked_idx",
    ).on(
      table.usuarioId,
      table.revoked,
    ),
  }),
);
