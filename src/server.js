import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { x402Facilitator } from "@oviato/x402-facilitator-hono";

const app = new Hono();

// Health check endpoint for Railway
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    service: "x402-facilitator-lite",
    timestamp: new Date().toISOString(),
  });
});

// x402 facilitator endpoints
// This creates /verify, /settle, and /supported
app.route(
  "/",
  await x402Facilitator({
    evm: process.env.EVM_PRIVATE_KEY
      ? {
          privateKey: process.env.EVM_PRIVATE_KEY,
          rpcUrls: {
            "eip155:8453": process.env.RPC_URL || "https://mainnet.base.org",
            "eip155:84532":
              process.env.RPC_URL_SEPOLIA ||
              "https://sepolia.base.org",
          },
        }
      : undefined,
  })
);

const port = parseInt(process.env.PORT || "8080", 10);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`x402-facilitator-lite listening on port ${info.port}`);
  console.log(`Health check: http://localhost:${info.port}/health`);
  console.log(`Facilitator:  http://localhost:${info.port}/verify /settle /supported`);
});
