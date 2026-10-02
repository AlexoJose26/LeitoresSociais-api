import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";

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
    }));

  return app;
}
