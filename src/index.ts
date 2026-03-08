import { createServer } from "./server.js";

const server = createServer();

server.run().catch((err) => {
  console.error("Server error:", err);
  process.exit(1);
});
