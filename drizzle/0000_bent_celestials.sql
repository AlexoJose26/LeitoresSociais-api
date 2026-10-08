CREATE TYPE "public"."curtida_tipo" AS ENUM('gosto', 'adoro', 'riso', 'tristeza', 'coragem');--> statement-breakpoint
CREATE TYPE "public"."estante_status" AS ENUM('quero_ler', 'lendo', 'lido');--> statement-breakpoint
CREATE TYPE "public"."publicacao_tipo" AS ENUM('texto', 'livro', 'leitura', 'critica');--> statement-breakpoint
CREATE TABLE "comentarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"publicacao_id" uuid NOT NULL,
	"parent_id" uuid,
	"conteudo" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "criticas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"livro_id" uuid NOT NULL,
	"titulo" varchar(255),
	"conteudo" text NOT NULL,
	"avaliacao" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "criticas_avaliacao_check" CHECK (
        "criticas"."avaliacao" >= 0
        AND "criticas"."avaliacao" <= 5
      )
);
--> statement-breakpoint
CREATE TABLE "curtidas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"publicacao_id" uuid NOT NULL,
	"tipo" "curtida_tipo" DEFAULT 'gosto' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "curtidas_usuario_publicacao_unique" UNIQUE("usuario_id","publicacao_id")
);
--> statement-breakpoint
CREATE TABLE "estantes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"livro_id" uuid NOT NULL,
	"status" "estante_status" DEFAULT 'quero_ler' NOT NULL,
	"progresso" integer DEFAULT 0 NOT NULL,
	"nota" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "estantes_usuario_livro_unique" UNIQUE("usuario_id","livro_id"),
	CONSTRAINT "estantes_progresso_check" CHECK ("estantes"."progresso" >= 0 AND "estantes"."progresso" <= 100),
	CONSTRAINT "estantes_nota_check" CHECK (
        "estantes"."nota" IS NULL
        OR (
          "estantes"."nota" >= 0
          AND "estantes"."nota" <= 5
        )
      )
);
--> statement-breakpoint
CREATE TABLE "estatisticas_publicacoes" (
	"publicacao_id" uuid PRIMARY KEY NOT NULL,
	"visualizacoes" integer DEFAULT 0 NOT NULL,
	"curtidas" integer DEFAULT 0 NOT NULL,
	"comentarios" integer DEFAULT 0 NOT NULL,
	"partilhas" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "estatisticas_visualizacoes_check" CHECK ("estatisticas_publicacoes"."visualizacoes" >= 0),
	CONSTRAINT "estatisticas_curtidas_check" CHECK ("estatisticas_publicacoes"."curtidas" >= 0),
	CONSTRAINT "estatisticas_comentarios_check" CHECK ("estatisticas_publicacoes"."comentarios" >= 0),
	CONSTRAINT "estatisticas_partilhas_check" CHECK ("estatisticas_publicacoes"."partilhas" >= 0)
);
--> statement-breakpoint
CREATE TABLE "livros" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"google_books_id" varchar(255),
	"titulo" varchar(500) NOT NULL,
	"autor" varchar(500),
	"descricao" text,
	"capa" text,
	"isbn" varchar(50),
	"categoria" varchar(150),
	"paginas" integer,
	"publicado_em" timestamp with time zone,
	"pdf_url" text,
	"pdf_nome" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "livros_google_books_id_unique" UNIQUE("google_books_id"),
	CONSTRAINT "livros_paginas_check" CHECK ("livros"."paginas" IS NULL OR "livros"."paginas" > 0)
);
--> statement-breakpoint
CREATE TABLE "partilhas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"publicacao_id" uuid NOT NULL,
	"comentario" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publicacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"livro_id" uuid,
	"conteudo" text,
	"tipo" "publicacao_tipo" DEFAULT 'texto' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked" boolean DEFAULT false NOT NULL,
	CONSTRAINT "sessoes_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" varchar(120) NOT NULL,
	"email" varchar(255) NOT NULL,
	"senha_hash" text NOT NULL,
	"foto_perfil" text,
	"bio" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_publicacao_id_publicacoes_id_fk" FOREIGN KEY ("publicacao_id") REFERENCES "public"."publicacoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_parent_id_comentarios_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."comentarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "criticas" ADD CONSTRAINT "criticas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "criticas" ADD CONSTRAINT "criticas_livro_id_livros_id_fk" FOREIGN KEY ("livro_id") REFERENCES "public"."livros"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curtidas" ADD CONSTRAINT "curtidas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curtidas" ADD CONSTRAINT "curtidas_publicacao_id_publicacoes_id_fk" FOREIGN KEY ("publicacao_id") REFERENCES "public"."publicacoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estantes" ADD CONSTRAINT "estantes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estantes" ADD CONSTRAINT "estantes_livro_id_livros_id_fk" FOREIGN KEY ("livro_id") REFERENCES "public"."livros"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estatisticas_publicacoes" ADD CONSTRAINT "estatisticas_publicacoes_publicacao_id_publicacoes_id_fk" FOREIGN KEY ("publicacao_id") REFERENCES "public"."publicacoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partilhas" ADD CONSTRAINT "partilhas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partilhas" ADD CONSTRAINT "partilhas_publicacao_id_publicacoes_id_fk" FOREIGN KEY ("publicacao_id") REFERENCES "public"."publicacoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publicacoes" ADD CONSTRAINT "publicacoes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publicacoes" ADD CONSTRAINT "publicacoes_livro_id_livros_id_fk" FOREIGN KEY ("livro_id") REFERENCES "public"."livros"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comentarios_publicacao_idx" ON "comentarios" USING btree ("publicacao_id");--> statement-breakpoint
CREATE INDEX "comentarios_usuario_idx" ON "comentarios" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "comentarios_parent_idx" ON "comentarios" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "comentarios_created_at_idx" ON "comentarios" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "criticas_usuario_idx" ON "criticas" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "criticas_livro_idx" ON "criticas" USING btree ("livro_id");--> statement-breakpoint
CREATE INDEX "criticas_avaliacao_idx" ON "criticas" USING btree ("avaliacao");--> statement-breakpoint
CREATE INDEX "criticas_created_at_idx" ON "criticas" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "curtidas_publicacao_idx" ON "curtidas" USING btree ("publicacao_id");--> statement-breakpoint
CREATE INDEX "curtidas_usuario_idx" ON "curtidas" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "curtidas_tipo_idx" ON "curtidas" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX "curtidas_publicacao_tipo_idx" ON "curtidas" USING btree ("publicacao_id","tipo");--> statement-breakpoint
CREATE INDEX "curtidas_created_at_idx" ON "curtidas" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "estantes_usuario_idx" ON "estantes" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "estantes_livro_idx" ON "estantes" USING btree ("livro_id");--> statement-breakpoint
CREATE INDEX "estantes_status_idx" ON "estantes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "estantes_usuario_status_idx" ON "estantes" USING btree ("usuario_id","status");--> statement-breakpoint
CREATE INDEX "livros_google_books_id_idx" ON "livros" USING btree ("google_books_id");--> statement-breakpoint
CREATE INDEX "livros_titulo_idx" ON "livros" USING btree ("titulo");--> statement-breakpoint
CREATE INDEX "livros_autor_idx" ON "livros" USING btree ("autor");--> statement-breakpoint
CREATE INDEX "livros_categoria_idx" ON "livros" USING btree ("categoria");--> statement-breakpoint
CREATE INDEX "livros_isbn_idx" ON "livros" USING btree ("isbn");--> statement-breakpoint
CREATE INDEX "partilhas_publicacao_idx" ON "partilhas" USING btree ("publicacao_id");--> statement-breakpoint
CREATE INDEX "partilhas_usuario_idx" ON "partilhas" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "partilhas_created_at_idx" ON "partilhas" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "publicacoes_created_at_idx" ON "publicacoes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "publicacoes_usuario_idx" ON "publicacoes" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "publicacoes_livro_idx" ON "publicacoes" USING btree ("livro_id");--> statement-breakpoint
CREATE INDEX "publicacoes_tipo_idx" ON "publicacoes" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX "sessoes_usuario_idx" ON "sessoes" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "sessoes_expires_at_idx" ON "sessoes" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "sessoes_revoked_idx" ON "sessoes" USING btree ("revoked");--> statement-breakpoint
CREATE INDEX "sessoes_usuario_revoked_idx" ON "sessoes" USING btree ("usuario_id","revoked");--> statement-breakpoint
CREATE INDEX "usuarios_email_idx" ON "usuarios" USING btree ("email");--> statement-breakpoint
CREATE INDEX "usuarios_nome_idx" ON "usuarios" USING btree ("nome");