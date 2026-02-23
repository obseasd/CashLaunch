# SECURITY — CRITICAL RULES

- NEVER hardcode private keys, mnemonics, or secrets in ANY file (scripts, configs, .env, source code)
- ALWAYS use environment variables: `process.env.PRIVATE_KEY`, `process.env.MNEMONIC`
- The `.env` file must ALWAYS be in `.gitignore` BEFORE any secrets are added
- Create a `.env.example` with placeholder values only

# TECH STACK

| Component | Tech |
|-----------|------|
| Smart Contracts | CashScript ^0.12 (compiles to Bitcoin Script) |
| Compiler | `cashc` CLI (npm) |
| SDK | CashScript SDK (`cashscript` npm) |
| BCH Interaction | `mainnet-js` ^3.0 (token genesis, wallet) |
| Crypto | `@bitauth/libauth` ^3.0 (key derivation, signing) |
| Frontend | Next.js 14 + TypeScript + TailwindCSS |
| Charts | Recharts |
| Network | BCH Chipnet (testnet) via ElectrumNetworkProvider |

# RULES

- This is a 3-day speed build for the BCH-1 Hackcelerator hackathon ($40K prize, 10 winners)
- Track: Cashtokens Systems (3 winner slots)
- Working demo > ambitious concept. Ship something complete and functional.
- Use CashTokens (native BCH tokens) — this is a bonus criterion for judges
- Use CashScript covenants — advanced scripting is a bonus criterion
- If the bonding curve math is too complex for CashScript opcodes, fallback to FIXED PRICE sale contract
- If stuck 15min on anything, simplify — don't waste time
- Judging criteria: Execution, Clarity, Impact, Originality, CashTokens usage, Advanced scripting, Live prototype
- Code quality matters — keep it clean and readable
- Deploy everything on chipnet (BCH testnet), NOT mainnet

# ARCHITECTURE

## Concept

CashLaunch is a CashTokens Launchpad on Bitcoin Cash. Anyone can create a CashToken and launch it with instant liquidity through a bonding curve — no DEX listing needed.

**Flow:**
1. Creator fills a form (name, symbol, supply, curve params)
2. Token is minted via mainnet-js `tokenGenesis()`
3. Tokens + BCH deposited into a CashScript bonding curve covenant contract
4. Buyers send BCH to the contract → receive tokens (price increases along curve)
5. Sellers send tokens back → receive BCH (price decreases)
6. All trades are on-chain, verifiable on chipnet explorer

## CashScript Contracts

### `contracts/BondingCurve.cash` — Core bonding curve covenant

The contract holds CashTokens and BCH. It's a **covenant** — it preserves itself on outputs (same lockingBytecode + same tokenCategory). The bonding curve enforces pricing:

```
price(n) = basePrice + n * slope    (linear curve, integer math)
```

Key pattern from CashScript docs (covenant):
```cashscript
pragma cashscript ^0.12.0;

contract BondingCurve(bytes20 creatorPkh, int basePrice, int slope) {
    function buy() {
        // COVENANT: preserve contract on output
        require(tx.outputs[this.activeInputIndex].lockingBytecode ==
                tx.inputs[this.activeInputIndex].lockingBytecode);
        // Same token category preserved
        require(tx.outputs[this.activeInputIndex].tokenCategory ==
                tx.inputs[this.activeInputIndex].tokenCategory);
        // Calculate tokens bought (input tokens - output tokens)
        int tokensBought = tx.inputs[this.activeInputIndex].tokenAmount
                         - tx.outputs[this.activeInputIndex].tokenAmount;
        require(tokensBought > 0);
        // Verify BCH added covers bonding curve price
        int bchAdded = tx.outputs[this.activeInputIndex].value
                     - tx.inputs[this.activeInputIndex].value;
        int currentSupply = tx.inputs[this.activeInputIndex].tokenAmount;
        int cost = tokensBought * (basePrice + slope * (currentSupply - tokensBought / 2) / 1000);
        require(bchAdded >= cost / 1000);
    }

    function withdraw(pubkey pk, sig s) {
        require(hash160(pk) == creatorPkh);
        require(checkSig(s, pk));
    }
}
```

**IMPORTANT:** The bonding curve math MUST use integer arithmetic only. Bitcoin Script has no floating point. If the math above is too complex or exceeds opcode limits, SIMPLIFY to a fixed-price contract:

### `contracts/TokenSale.cash` — Fallback (fixed price)

```cashscript
pragma cashscript ^0.12.0;

contract TokenSale(bytes20 creatorPkh, int pricePerToken) {
    function buy() {
        require(tx.outputs[this.activeInputIndex].lockingBytecode ==
                tx.inputs[this.activeInputIndex].lockingBytecode);
        require(tx.outputs[this.activeInputIndex].tokenCategory ==
                tx.inputs[this.activeInputIndex].tokenCategory);
        int tokensBought = tx.inputs[this.activeInputIndex].tokenAmount
                         - tx.outputs[this.activeInputIndex].tokenAmount;
        require(tokensBought > 0);
        int bchAdded = tx.outputs[this.activeInputIndex].value
                     - tx.inputs[this.activeInputIndex].value;
        require(bchAdded >= tokensBought * pricePerToken);
    }

    function withdraw(pubkey pk, sig s) {
        require(hash160(pk) == creatorPkh);
        require(checkSig(s, pk));
    }
}
```

## TypeScript SDK Layer

| File | Purpose |
|------|---------|
| `src/lib/bch/wallet.ts` | Wallet creation using libauth BIP39 + BIP44 key derivation. Pattern from CashScript examples common.ts |
| `src/lib/bch/tokens.ts` | Token genesis using mainnet-js `tokenGenesis()`. Handles CashToken creation + BCMR metadata |
| `src/lib/bch/bonding-curve.ts` | Contract compilation, instantiation, buy/sell transaction building using CashScript SDK `TransactionBuilder` |
| `src/lib/bch/provider.ts` | `new ElectrumNetworkProvider('chipnet')` setup |
| `src/lib/bch/utils.ts` | Address encoding, byte conversion helpers |

## Frontend Pages

### Home `/` — Token Discovery
- Grid of token cards (name, symbol, current price, market cap, bonding curve progress bar)
- Hero: "Launch your CashToken in 30 seconds"
- Sort by newest/volume/market cap

### Launch `/launch` — Token Creation Wizard
- Step 1: Token name, symbol, description, image
- Step 2: Tokenomics (total supply, base price, curve slope) with live bonding curve preview chart
- Step 3: Review + Confirm
- Step 4: Deploy (signs genesis tx + funds contract)

### Token `/token/[categoryId]` — Trading Page
- Large bonding curve chart (Recharts AreaChart) with current position
- Buy panel: input BCH → estimated tokens
- Sell panel: input tokens → estimated BCH
- Token info: creator, creation date, supply stats
- Recent trades list

## Project Structure

```
cashlaunch/
├── contracts/
│   ├── BondingCurve.cash        # Core covenant
│   └── TokenSale.cash           # Fixed-price fallback
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx             # Home
│   │   ├── launch/page.tsx      # Launch wizard
│   │   └── token/[id]/page.tsx  # Token trading
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── TokenCard.tsx
│   │   ├── BondingCurveChart.tsx
│   │   ├── BuyPanel.tsx
│   │   ├── SellPanel.tsx
│   │   └── LaunchWizard.tsx
│   └── lib/bch/
│       ├── wallet.ts
│       ├── tokens.ts
│       ├── bonding-curve.ts
│       ├── provider.ts
│       └── utils.ts
├── .env.example                 # MNEMONIC=your twelve word seed phrase here
├── .gitignore
├── package.json
└── README.md
```

# KEY INFRA

| Item | Value |
|------|-------|
| Network | BCH Chipnet (testnet) |
| Electrum Provider | `new ElectrumNetworkProvider('chipnet')` |
| Faucet | https://tbch4.googol.cash/ |
| Explorer | chipnet.chaingraph.cash |
| CashScript Playground | playground.cashscript.org |
| CashScript Covenant docs | cashscript.org/docs/guides/covenants |
| CashScript CashTokens docs | cashscript.org/docs/guides/cashtokens |
| DexContract example | cashscript.org/docs/language/examples (closest ref for bonding curve) |
| CashScript SDK Transaction Builder | cashscript.org/docs/sdk/transactions |
| mainnet-js tutorial | mainnet.cash/tutorial/ |

# CASHSCRIPT SDK REFERENCE

## Compiling contracts:
```typescript
import { compileFile } from 'cashc';
const artifact = compileFile(new URL('../contracts/BondingCurve.cash', import.meta.url));
```

## Instantiating contracts:
```typescript
import { Contract, ElectrumNetworkProvider } from 'cashscript';
const provider = new ElectrumNetworkProvider('chipnet');
const contract = new Contract(artifact, [creatorPkh, basePrice, slope], { provider });
console.log('Contract address:', contract.address);
console.log('Token address:', contract.tokenAddress);
```

## Building transactions (buy example):
```typescript
const contractUtxos = await contract.getUtxos();
const tokenUtxo = contractUtxos.find(u => u.token);

const tx = contract.functions
    .buy()
    .from(tokenUtxo)
    .withoutChange()
    .to(contract.tokenAddress, bchToContract, { token: { amount: remainingTokens, category: tokenUtxo.token.category } })
    .to(buyerAddress, 1000n, { token: { amount: tokensToBuy, category: tokenUtxo.token.category } });

const result = await tx.send();
```

## Wallet key derivation (libauth pattern from CashScript examples):
```typescript
import {
    deriveHdPrivateNodeFromSeed,
    deriveHdPath,
    deriveSeedFromBip39Mnemonic,
    secp256k1,
    generateBip39Mnemonic,
    encodeCashAddress,
    hash160,
    CashAddressType,
} from '@bitauth/libauth';

const mnemonic = process.env.MNEMONIC || generateBip39Mnemonic();
const seed = deriveSeedFromBip39Mnemonic(mnemonic);
const rootNode = deriveHdPrivateNodeFromSeed(seed, true);
const node = deriveHdPath(rootNode, "m/44'/145'/0'/0/0");
const privateKey = node.privateKey;
const publicKey = secp256k1.derivePublicKeyCompressed(privateKey);
const pkh = hash160(publicKey);
const address = encodeCashAddress({ prefix: 'bchtest', type: CashAddressType.p2pkh, payload: pkh });
```

## Token genesis (mainnet-js):
```typescript
import { Wallet } from 'mainnet-js';
const wallet = await Wallet.fromSeed(mnemonic, 'chipnet');
const genesisResult = await wallet.tokenGenesis({
    cashaddr: wallet.cashaddr!,
    amount: 1000000n,         // fungible token supply
    commitment: undefined,     // no NFT commitment
    capability: undefined,     // no NFT capability
});
console.log('Token category:', genesisResult.txId); // category = genesis txId
```

# RISKS & FALLBACKS

| If this happens | Do this |
|----------------|---------|
| Bonding curve math too complex for opcodes | Use TokenSale.cash (fixed price). Rebrand as "Fair Launch" |
| Contract size > 1650 bytes | Remove fee logic, simplify math |
| Chipnet faucet down | Try multiple: tbch4.googol.cash, bch.info. Worst case: MockNetworkProvider |
| mainnet-js tokenGenesis fails | Use libauth raw tx construction, or pre-create tokens |
| Not enough time for Sell function | Ship buy-only. Unidirectional bonding curve is still valid |
| Wallet integration too complex | Hardcoded demo wallet in env. Note in README "production would use WalletConnect" |
| No time for Portfolio page | Cut it. Home + Launch + Token = enough |

---

# CURRENT INSTRUCTION

Initialize the project and start with the CashScript contract:

1. `npx create-next-app@latest . --typescript --tailwind --app --src-dir` (or init in current directory)
2. Install deps: `npm install cashscript cashc mainnet-js @bitauth/libauth recharts`
3. Create `contracts/BondingCurve.cash` — start from the covenant pattern in the docs. Try to compile with `npx cashc contracts/BondingCurve.cash`. If the bonding curve math fails, create `contracts/TokenSale.cash` (fixed price fallback) instead.
4. Create `src/lib/bch/provider.ts` — setup ElectrumNetworkProvider('chipnet')
5. Create `src/lib/bch/wallet.ts` — libauth key derivation (see SDK reference above)
6. Create `src/lib/bch/tokens.ts` — token genesis using mainnet-js
7. Create `src/lib/bch/bonding-curve.ts` — compile contract, instantiate, build buy tx
8. Test: create a token on chipnet and execute 1 buy transaction

Focus on getting the contract working first. Frontend comes after.
