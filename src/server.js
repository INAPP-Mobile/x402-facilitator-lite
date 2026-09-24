import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { x402Facilitator } from "@oviato/x402-facilitator-hono";

const app = new Hono();

// A facilitator needs an EVM signer to verify/settle. When the key is missing
// (fresh template install before the user sets secrets), boot in degraded
// "unconfigured" mode: health passes, /supported advertises nothing, and
// verify/settle return 503 with a clear reason instead of crash-looping.
const EVM_PRIVATE_KEY = process.env.EVM_PRIVATE_KEY || "";
const configured =
  EVM_PRIVATE_KEY.startsWith("0x") && EVM_PRIVATE_KEY.length === 66;

if (configured) {
  app.route(
    "/",
    await x402Facilitator({
      evm: {
        privateKey: EVM_PRIVATE_KEY,
        rpcUrls: {
          "eip155:8453": process.env.RPC_URL || "https://mainnet.base.org",
          "eip155:84532": process.env.RPC_URL_SEPOLIA || "https://sepolia.base.org",
        },
      },
    })
  );
  console.log("x402 facilitator: EVM configured (Base mainnet + Base Sepolia)");
} else {
  console.warn(
    "x402 facilitator: EVM_PRIVATE_KEY not set — running UNCONFIGURED. " +
      "Set it in Railway variables to enable /verify and /settle."
  );
  app.get("/supported", (c) => c.json({ kinds: [], extensions: [], signers: {} }));
  const notConfigured = (c) =>
    c.json(
      {
        error: "facilitator_not_configured",
        reason:
          "EVM_PRIVATE_KEY is not set. Add it in Railway → Variables, then redeploy.",
      },
      503
    );
  app.post("/verify", notConfigured);
  app.post("/settle", notConfigured);
}

// Health check endpoint for Railway
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    service: "x402-facilitator-lite",
    configured,
    timestamp: new Date().toISOString(),
  });
});

const port = parseInt(process.env.PORT || "8080", 10);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`x402-facilitator-lite listening on port ${info.port}`);
  console.log(`Health check: http://localhost:${info.port}/health`);
  console.log(`Facilitator:  http://localhost:${info.port}/verify /settle /supported`);
});
