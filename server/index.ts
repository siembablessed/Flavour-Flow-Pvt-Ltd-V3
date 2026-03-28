import "dotenv/config";
import { env } from "./env";
import { createPaynowApiApp } from "./app";

const app = createPaynowApiApp();

const server = app.listen(env.PORT, () => {
  console.log(`Paynow API listening on port ${env.PORT}`);
});

server.on("error", (error) => {
  console.error("Server failed to start", error);
  process.exit(1);
});

process.on("SIGINT", () => {
  server.close(() => process.exit(0));
});
