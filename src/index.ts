import { createApp } from "./server";

const port = Number(process.env.PORT) || 3000;

try {
  const app = createApp();

  app.listen({
    hostname: "0.0.0.0",
    port,
  });

  console.log("");
  console.log("========================================");
  console.log("   LeitoresSociais API");
  console.log("========================================");
  console.log(`Ambiente: ${process.env.NODE_ENV ?? "development"}`);
  console.log(`Porta: ${port}`);
  console.log(`URL: http://localhost:${port}`);
  console.log(`Health: http://localhost:${port}/health`);
  console.log("========================================");
  console.log("");
} catch (error) {
  console.error("Erro ao iniciar a API:");
  console.error(error);

  process.exit(1);
}
