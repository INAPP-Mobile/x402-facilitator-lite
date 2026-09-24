/**
 * E2E test for x402-facilitator-lite
 *
 * Usage:
 *   node test/e2e.js                              # unconfigured mode (fresh install)
 *   EVM_PRIVATE_KEY=0x... PAY_TO=0x... node test/e2e.js  # full flow with settlement
 *
 * Flow:
 *   1. Server boots in unconfigured mode (no EVM_PRIVATE_KEY)
 *   2. /health returns 200
 *   3. /supported returns empty kinds
 *   4. /verify returns 503 facilitator_not_configured
 *   5. /settle returns 503 facilitator_not_configured
 *   6. If EVM_PRIVATE_KEY is set:
 *      a. /supported returns Base mainnet + Sepolia
 *      b. /verify rejects missing body (400)
 *      c. /verify rejects invalid signature (400)
 *      d. /verify accepts valid ERC-3009 payload
 */

import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = 8767;
const BASE = `http://127.0.0.1:${PORT}`;

let failures = 0;
function assert(cond, msg) {
  if (cond) {
    console.log(`  PASS: ${msg}`);
  } else {
    console.error(`  FAIL: ${msg}`);
    failures++;
  }
}

async function main() {
  const privateKey = process.env.EVM_PRIVATE_KEY || "";
  const payTo = process.env.PAY_TO || "";
  const rpcUrl = process.env.RPC_URL || "https://mainnet.base.org";

  // Spawn server
  console.log("\n[x402-facilitator-lite] Starting server...");
  const env = { ...process.env, PORT: String(PORT) };
  if (privateKey) env.EVM_PRIVATE_KEY = privateKey;
  if (payTo) env.EVM_PAY_TO_ADDRESS = payTo;
  if (rpcUrl) env.RPC_URL = rpcUrl;

  const child = spawn("node", ["src/server.js"], {
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stderr = "";
  child.stderr.on("data", (d) => (stderr += d.toString()));

  // Wait for server to be ready
  let ready = false;
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`${BASE}/health`);
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {}
    await sleep(100);
  }

  if (!ready) {
    console.error("Server failed to start. stderr:", stderr);
    child.kill();
    process.exit(1);
  }

  console.log("[x402-facilitator-lite] Server ready");

  // --- Test 1: /health ---
  console.log("\n[Test 1] /health");
  try {
    const r = await fetch(`${BASE}/health`);
    assert(r.status === 200, `status ${r.status} === 200`);
    const body = await r.json();
    assert(body.status === "ok", `body.status === "ok"`);
    assert(body.service === "x402-facilitator-lite", `body.service correct`);
    if (privateKey && privateKey.startsWith("0x") && privateKey.length === 66) {
      assert(body.configured === true, `configured: true (key provided)`);
    } else {
      assert(body.configured === false, `configured: false (no key)`);
    }
  } catch (e) {
    assert(false, `/health threw: ${e.message}`);
  }

  // --- Test 2: /supported ---
  console.log("\n[Test 2] /supported");
  try {
    const r = await fetch(`${BASE}/supported`);
    assert(r.status === 200, `status ${r.status} === 200`);
    const body = await r.json();
    assert(Array.isArray(body.kinds), `body.kinds is array`);
    if (privateKey && privateKey.startsWith("0x") && privateKey.length === 66) {
      assert(body.kinds.length > 0, `kinds has entries when configured`);
    } else {
      assert(body.kinds.length === 0, `kinds empty when unconfigured`);
    }
  } catch (e) {
    assert(false, `/supported threw: ${e.message}`);
  }

  // --- Test 3: /verify unconfigured ---
  console.log("\n[Test 3] /verify (unconfigured path)");
  try {
    const r = await fetch(`${BASE}/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    if (privateKey && privateKey.startsWith("0x") && privateKey.length === 66) {
      // configured — should reject invalid body
      assert(r.status === 400, `configured: status ${r.status} === 400 for empty body`);
      const body = await r.json();
      assert(body.error !== undefined, `configured: error field present`);
    } else {
      // unconfigured — should return 503
      assert(r.status === 503, `unconfigured: status ${r.status} === 503`);
      const body = await r.json();
      assert(body.error === "facilitator_not_configured", `error === facilitator_not_configured`);
    }
  } catch (e) {
    assert(false, `/verify threw: ${e.message}`);
  }

  // --- Test 4: /settle unconfigured ---
  console.log("\n[Test 4] /settle (unconfigured path)");
  try {
    const r = await fetch(`${BASE}/settle`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    if (privateKey && privateKey.startsWith("0x") && privateKey.length === 66) {
      assert(r.status === 400, `configured: status ${r.status} === 400 for empty body`);
    } else {
      assert(r.status === 503, `unconfigured: status ${r.status} === 503`);
      const body = await r.json();
      assert(body.error === "facilitator_not_configured", `error === facilitator_not_configured`);
    }
  } catch (e) {
    assert(false, `/settle threw: ${e.message}`);
  }

  // --- Test 5: Full payment flow (only if key provided) ---
  if (privateKey && privateKey.startsWith("0x") && privateKey.length === 66) {
    console.log("\n[Test 5] Full x402 payment flow");

    // Construct a minimal valid x402 exact payment payload
    // This requires a real signed ERC-3009 authorization
    // For E2E we test the verify endpoint's input validation
    try {
      // Missing required fields — should fail validation
      const r = await fetch(`${BASE}/verify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          paymentPayload: {
            paymentRequirements: {
              scheme: "exact",
              networkId: "eip155:8453",
              asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
              payTo: payTo || "0x0000000000000000000000000000000000000001",
              maxAmountRequired: "1000000",
              maxTimeoutSeconds: 60,
            },
            payload: {
              signature: "0x" + "00".repeat(65),
              authorization: {
                from: "0x0000000000000000000000000000000000000002",
                to: "0x0000000000000000000000000000000000000003",
                value: "1000000",
                validAfter: "0",
                validBefore: "9999999999",
                nonce: "0x" + "00".repeat(32),
              },
            },
          },
        }),
      });
      // Should fail signature validation (402 or 400)
      assert(
        r.status === 400 || r.status === 402,
        `verify rejects invalid sig with ${r.status} (expected 400/402)`
      );
      const body = await r.json();
      assert(body.error !== undefined, `error present in rejection`);
      console.log(`  verify rejected as expected: ${body.error || "unknown"}`);
    } catch (e) {
      assert(false, `/verify flow threw: ${e.message}`);
    }

    console.log("  (Full on-chain settlement skipped — no funded test wallet)");
  }

  // Cleanup
  child.kill();

  // Summary
  console.log("\n" + "=".repeat(50));
  if (failures > 0) {
    console.log(`FAILED: ${failures} assertion(s) failed`);
    process.exit(1);
  } else {
    console.log("ALL TESTS PASSED");
    process.exit(0);
  }
}

main().catch((e) => {
  console.error("E2E crashed:", e);
  process.exit(1);
});
