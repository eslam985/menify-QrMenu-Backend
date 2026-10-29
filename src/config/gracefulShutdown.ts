import type { Server } from "node:http";
import type { Pool } from "pg";

const gracefulShutdown = (server: Server, pool: Pool): void => {
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n${signal} received...`);

    server.close(async () => {
      await pool.end();
      console.log("DB pool closed, bye!");
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
};

export default gracefulShutdown;