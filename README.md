# x402 Facilitator Lite

Self-hosted x402 payment facilitator for USDC on Base. Verify and settle payments in one click.

# Deploy and Host

Deploy and run your own facilitator. After deploy, set `EVM_PRIVATE_KEY` in the service variables.

[![Deploy to Railway](https://railway.app/button.svg)](https://railway.com/deploy/x402-facilitator-l-1)

## About Hosting

Your own facilitator means 0% platform fees, sub-5ms latency, and full control over your payment rail. Once your APIs point to it, it stays — payment infrastructure should never be a single point of failure you don't control.

## Why Deploy

- **Self-host** — Your Node.js binary on Railway, you control the keys, 0% fee
- **Coinbase CDP** — `x402.org/facilitator` + API key, Coinbase sees all payments

## Common Use Cases

- Paywalled AI APIs — charge per request in USDC
- Agent-to-agent payments — your own settlement rail
- Micropayments — $0.01 per API call, no platform cut
- Multi-template monetization — shared payment backend for all your Railway templates

## Dependencies for

- Base mainnet (eip155:8453) + Base Sepolia (eip155:84532)
- USDC on Base (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
- x402 v2 exact scheme

### Deployment Dependencies

- Railway Hobby plan (~$3/month for 50MB RAM)
- Node.js 20+ (included in container)
- No external database required

## Integration

Use with `x402-express` or any x402 v2 client:

```js
import { paymentMiddleware } from "x402-express";

app.use(paymentMiddleware(
  process.env.EVM_PAY_TO_ADDRESS,
  { "/api/generate": { price: "$0.01", network: "base" } },
  { url: "https://your-facilitator.up.railway.app" }
));
```

## Cost

- Railway Hobby: ~$3/month for 50MB RAM
- Pays for itself after 300 paid requests at $0.01 each

## Quick Start

```bash
# After deploy, set your burner key (used for gas only):
railway variables set EVM_PRIVATE_KEY=0x...

# Check health:
curl https://your-facilitator.up.railway.app/health
# {"status":"ok","configured":true}

# Check supported networks:
curl https://your-facilitator.up.railway.app/supported
# {"kinds":[{"x402Version":2,"scheme":"exact","network":"eip155:8453"}, ...]}
```

## How It Works

```
AI Agent → GET /api/generate (your paywalled server)
         ← 402 Payment Required + {price: $0.01, network: base}
Agent signs USDC tx → X-PAYMENT header → retry
Your server → POST /verify (this facilitator)
Facilitator checks chain → valid?
         → 200 OK + settle tx on-chain → USDC to your wallet
         → Agent gets data
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check (200 = ok) |
| `/supported` | GET | Networks and schemes |
| `/verify` | POST | Verify payment signature |
| `/settle` | POST | Settle payment on-chain |

## Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `EVM_PRIVATE_KEY` | 0x-prefixed private key (gas wallet) | Yes |
| `RPC_URL` | Base mainnet RPC | No (default: public) |
| `PORT` | Server port | No (default: 8080) |

## Integration

Use with `x402-express` or any x402 v2 client:

```js
import { paymentMiddleware } from "x402-express";

app.use(paymentMiddleware(
  process.env.EVM_PAY_TO_ADDRESS,
  { "/api/generate": { price: "$0.01", network: "base" } },
  { url: "https://your-facilitator.up.railway.app" }
));
```

## Cost

- Railway Hobby: ~$3/month for 50MB RAM
- Pays for itself after 300 paid requests at $0.01 each

## License

MIT
