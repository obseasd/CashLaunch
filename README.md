# CashLaunch

**CashTokens Launchpad on Bitcoin Cash** — Create a CashToken with instant bonding curve liquidity. No DEX listing needed. All trades on-chain.

Built for the **BCH-1 Hackcelerator Hackathon** — Cashtokens Systems track.

## How It Works

```
Creator fills form ──► Token minted (CashTokens) ──► Deposited into CashScript covenant
                                                          │
Buyer sends BCH ──► Contract enforces bonding curve ──► Buyer receives tokens
                         price = basePrice + slope × supply
```

1. **Launch** — Creator sets name, symbol, supply, and curve parameters. Token is minted via `mainnet-js` and deposited into a CashScript bonding curve covenant.
2. **Buy** — Anyone sends BCH to the contract. The covenant enforces the pricing formula and sends tokens to the buyer. Price increases as supply decreases.
3. **Sell** — Reverse the process. Send tokens back, receive BCH at the current curve price.

All trades happen on-chain via Bitcoin Script — no backend, no orderbook, no centralized exchange.

## Architecture

```
┌─────────────────────────────────────────────┐
│                  Frontend                    │
│  Next.js 14 + TypeScript + TailwindCSS      │
│                                              │
│  /           Token Discovery (grid + sort)   │
│  /launch     4-step Launch Wizard            │
│  /token/[id] Trading Page (chart + buy/sell) │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │    BCH SDK Layer    │
        │                     │
        │  wallet.ts    ← libauth (BIP39/BIP44 key derivation)
        │  tokens.ts    ← mainnet-js (CashToken genesis)
        │  bonding-curve.ts ← CashScript SDK (TransactionBuilder)
        │  provider.ts  ← ElectrumNetworkProvider (chipnet)
        └──────────┬──────────┘
                   │
        ┌──────────┴──────────┐
        │  CashScript Contracts │
        │                       │
        │  BondingCurve.cash  ← Linear bonding curve covenant
        │  TokenSale.cash     ← Fixed-price fallback
        └───────────────────────┘
                   │
            BCH Chipnet (testnet)
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Smart Contracts | CashScript ^0.12 (Bitcoin Script covenants) |
| Compiler | `cashc` CLI |
| Contract SDK | `cashscript` (TransactionBuilder) |
| Token Creation | `mainnet-js` (CashToken genesis) |
| Key Derivation | `@bitauth/libauth` (BIP39 + BIP44) |
| Frontend | Next.js 14 + TypeScript + TailwindCSS |
| Charts | Recharts (AreaChart for bonding curves) |
| Network | BCH Chipnet via ElectrumNetworkProvider |

## Features

- **Bonding Curve Covenant** — On-chain pricing enforced by Bitcoin Script. `price(n) = basePrice + slope × supply`. Integer math only, no floating point.
- **CashTokens Native** — Uses BCH's native token system (CHIP-2022-02-CashTokens). No wrapped tokens or bridges.
- **Launch Wizard** — 4-step flow: Token Info → Tokenomics (live curve preview) → Review → Deploy
- **Trading Page** — Real-time bonding curve chart, buy/sell panels with cost estimation, on-chain transaction execution
- **Wallet Connect** — BIP39 mnemonic-based wallet with libauth key derivation. Stored in localStorage (demo mode).
- **Dark Theme** — Professional dark UI with BCH green (#0AC18E) accent

## Run Locally

```bash
# Install
npm install

# Create .env with your chipnet wallet mnemonic
cp .env.example .env
# Edit .env and add your 12-word mnemonic

# Fund wallet with chipnet BCH
# Faucet: https://tbch4.googol.cash/

# Dev server
npm run dev

# Build
npm run build

# Test on-chain (requires funded chipnet wallet)
npm run test:chipnet
```

## Project Structure

```
cashlaunch/
├── contracts/
│   ├── BondingCurve.cash          # Bonding curve covenant (compiled OK)
│   └── TokenSale.cash             # Fixed-price fallback
├── src/
│   ├── app/
│   │   ├── page.tsx               # Home — token discovery
│   │   ├── launch/page.tsx        # Launch wizard
│   │   ├── token/[id]/page.tsx    # Token trading page
│   │   └── api/token/             # API routes (genesis, fund)
│   ├── components/
│   │   ├── Header.tsx             # Nav + wallet connect
│   │   ├── TokenCard.tsx          # Token grid card
│   │   ├── BondingCurveChart.tsx  # Recharts AreaChart
│   │   ├── BuyPanel.tsx           # Buy tokens (on-chain tx)
│   │   ├── SellPanel.tsx          # Sell tokens
│   │   └── LaunchWizard.tsx       # 4-step launch flow
│   ├── context/
│   │   └── WalletContext.tsx      # Wallet state + libauth
│   └── lib/
│       ├── bch/                   # BCH SDK layer
│       │   ├── wallet.ts          # Key derivation
│       │   ├── tokens.ts          # Token genesis
│       │   ├── bonding-curve.ts   # Contract interaction
│       │   ├── provider.ts        # Electrum provider
│       │   └── artifacts/         # Pre-compiled contract JSON
│       └── token-store.ts         # localStorage token registry
├── scripts/
│   └── test-chipnet.ts            # Integration test script
└── .env.example
```

## Smart Contract

The bonding curve contract (`BondingCurve.cash`) is a **covenant** — it preserves itself across transactions. The contract holds CashTokens and BCH, enforcing a linear pricing formula:

```
cost = tokensBought × basePrice + slope × tokensBought × (2 × currentSupply - tokensBought) / 2
```

The `withdraw()` function allows the creator to reclaim funds using their signature.

## Network

All operations run on **BCH Chipnet** (testnet). No real funds are used.

- Electrum: `ElectrumNetworkProvider('chipnet')`
- Faucet: https://tbch4.googol.cash/

---

Built for **BCH-1 Hackcelerator** — Cashtokens Systems track
