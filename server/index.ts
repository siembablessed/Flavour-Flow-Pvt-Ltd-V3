import "dotenv/config";
import { AddressInfo } from "node:net";
import { env } from "./env";
import { createPaynowApiApp } from "./app";

const app = createPaynowApiApp();
let activeServer: ReturnType<typeof app.listen> | null = null;

const startServer = (port: number) => {
  const server = app.listen(port, () => {
    activeServer = server;
    const address = server.address() as AddressInfo | null;
    const listeningPort = address?.port ?? port;
    console.log(`Paynow API listening on port ${listeningPort}`);
  });

  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE" && env.NODE_ENV === "development") {
      console.warn(`Port ${port} is in use, trying ${port + 1}...`);
      startServer(port + 1);
      return;
    }

    console.error("Server failed to start", error);
    process.exit(1);
  });
};

startServer(env.PORT);

process.on("SIGINT", () => {
  activeServer?.close(() => process.exit(0));
  if (!activeServer) {
    process.exit(0);
  }
});
