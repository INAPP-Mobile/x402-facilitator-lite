# x402 Facilitator Lite - Self-hosted payment facilitator

Your own x402 payment facilitator. Verify and settle USDC payments on Base.
Deploys to Railway in one click.

## Quick Start

1. **Deploy** - Click the button below
2. **Set secrets** - Add your EVM_PRIVATE_KEY in Railway dashboard
3. **Use** - Point your apps to `https://your-facilitator.up.railway.app/verify`

## What it does

AI agents pay USDC → Your APIs return data.

```
Agent → GET /api/generate (your server)
      ← 402 Payment Required
Agent signs USDC tx → retry with X-PAYMENT header
Your server → POST /verify (this facilitator)
Facilitator checks chain → valid? → settle → USDC to your wallet
Your server → returns data to agent
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/supported` | GET | Networks and schemes |
| `/verify` | POST | Verify payment signature |
| `/settle` | POST | Settle payment on-chain |

## Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `EVM_PRIVATE_KEY` | 0x-prefixed private key (gas wallet) | Yes |
| `EVM_PAY_TO_ADDRESS` | Your USDC receiver (different from signer) | No* |
| `RPC_URL` | Base RPC (defaults to public) | No |
| `PORT` | Server port (default 8080) | No |

*Required for settlement. If not set, settlement will fail but verification still works.

## Integration

Use with `x402-express` or any x402 client:

```js
import { paymentMiddleware } from "x402-express";

app.use(paymentMiddleware(
  process.env.EVM_PAY_TO_ADDRESS,
  { "/api/generate": { price: "$0.01", network: "base" } },
  { url: "https://your-facilitator.up.railway.app" }
));
```

## Self-hosted vs Coinbase CDP

- **CDP**: `https://x402.org/facilitator` + API key, Coinbase sees all payments
- **Self-host**: Your Node.js binary on Railway, 5ms latency, 0% fee, you control Base + Solana + EVM

## Cost

- Railway Hobby: ~$3/month for 50MB RAM
- Pays for itself after 300 paid requests at $0.01 each

## License

MIT
