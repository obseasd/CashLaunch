# CashLaunch

**The CashTokens Launchpad for Bitcoin Cash** — Anyone can create a CashToken and launch it with instant liquidity through an automated bonding curve. No DEX listing required, no seed capital needed. All trades are trustless, non-custodial, and verifiable on-chain.

Built for the **BCH-1 Hackcelerator Hackathon** — Cashtokens Systems track.

## The Problem

CashTokens lack easy liquidity bootstrapping. Creators must manually list on DEXs, find market makers, and bootstrap trading — a slow, fragmented process that discourages new token launches on Bitcoin Cash.

## The Solution

CashLaunch solves this by letting anyone launch a CashToken with **instant bonding curve liquidity** in a single click. No DEX listing, no market maker, no seed capital. The bonding curve contract — a CashScript covenant deployed on-chain — automatically handles pricing, buys, and sells.

## How It Works

```
Creator fills form ──► Token minted (CashTokens) ──► Deposited into CashScript covenant
                                                          │
Buyer sends BCH ──► Contract enforces bonding curve ──► Buyer receives tokens
                         price = basePrice + slope × tokensSold
```

1. **Launch** — Creator configures token parameters (name, symbol, logo) and launches with one click. Tokens are minted via CashToken genesis and deposited into a CashScript bonding curve covenant.
2. **Buy** — Anyone sends BCH to the covenant contract. The contract enforces the pricing formula on-chain and sends tokens to the buyer. Price increases as more tokens are sold.
3. **Sell** — Holders send tokens back to the contract and receive BCH at the current curve price. Price decreases accordingly.
4. **Bond** — When the bonding curve reaches 100% (~1 BCH total volume), the token is fully bonded. The creator can withdraw accumulated BCH.

All trades happen on-chain via Bitcoin Script — no backend, no orderbook, no centralized exchange.

## Status & Roadmap

CashLaunch is a **working prototype** deployed on BCH Chipnet (testnet). We are actively working on:

- **User experience** — Smoother onboarding, wallet integration (Cashonize, Paytaca), and mobile-friendly UI
- **Reliability** — Faster transaction confirmation, better error handling, multi-server Electrum failover
- **Features** — Trade history, token metadata (BCMR), social sharing, creator dashboard, portfolio tracking
- **Mainnet readiness** — Security audit of the bonding curve covenant, gas optimization, production wallet connect
- **DEX graduation** — Automatic liquidity migration to a BCH DEX when bonding curve reaches 100%

The goal is to make CashLaunch the easiest way to launch and trade tokens on Bitcoin Cash — ready for real users and real BCH.

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

## Live Demo

**Chipnet (testnet):** [cashlaunch.vercel.app](https://cashlaunch.vercel.app)

To test: Connect Wallet → Fund from [faucet](https://tbch.googol.cash/) → Launch a Token → Buy & Sell

---

Built with care for **BCH-1 Hackcelerator** — Cashtokens Systems track
