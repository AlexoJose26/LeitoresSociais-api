import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";

import { authRoutes } from "./routes/auth.routes";
import { comentariosRoutes } from "./routes/comentarios.routes";
import { criticasRoutes } from "./routes/criticas.routes";
import { curtidasRoutes } from "./routes/curtidas.routes";
import { dashboardRoutes } from "./routes/dashboard.routes";
import { estantesRoutes } from "./routes/estantes.routes";
import { estatisticasRoutes } from "./routes/estatisticas.routes";
import { livrosRoutes } from "./routes/livros.routes";
import { partilhasRoutes } from "./routes/partilhas.routes";
import { publicacoesRoutes } from "./routes/publicacoes.routes";
import { usuariosRoutes } from "./routes/usuarios.routes";

export function createApp() {
  const frontendUrl = process.env.FRONTEND_URL;

  const app = new Elysia({
    name: "leitores-sociais-api",
  })
    .use(
      cors({
        origin: frontendUrl || true,
        credentials: true,
        methods: [
          "GET",
          "POST",
          "PUT",
          "PATCH",
          "DELETE",
          "OPTIONS",
        ],
        allowedHeaders: [
          "Content-Type",
          "Authorization",
        ],
      }),
    )

    // Rotas públicas da API
    .get("/", () => ({
      success: true,
      name: "LeitoresSociais API",
      version: "1.0.0",
      status: "online",
    }))

    .get("/health", () => ({
      success: true,
      status: "ok",
      service: "LeitoresSociais API",
      environment: process.env.NODE_ENV ?? "development",
      timestamp: new Date().toISOString(),
    }))

    // Rotas da aplicação
    .use(authRoutes)
    .use(usuariosRoutes)
    .use(livrosRoutes)
    .use(estantesRoutes)
    .use(publicacoesRoutes)
    .use(curtidasRoutes)
    .use(comentariosRoutes)
    .use(partilhasRoutes)
    .use(criticasRoutes)
    .use(estatisticasRoutes)
    .use(dashboardRoutes);

  return app;
}
