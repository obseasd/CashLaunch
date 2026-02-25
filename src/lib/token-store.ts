/**
 * Simple client-side token store using localStorage.
 * For the hackathon demo — production would use a database.
 */

// ── Fixed bonding curve parameters (pump.fun style — not customizable) ──
export const CURVE = {
  totalSupply: 10_000,        // 10K tokens
  basePrice: 100,             // 100 sats starting price
  slope: 1,                   // +1 sat per token sold
  // Start price: 100 sats
  // End price:   10,100 sats
  // Total to bond: ~51M sats (~0.51 BCH)
} as const;

export interface LaunchedToken {
  categoryId: string;
  name: string;
  symbol: string;
  description: string;
  totalSupply: number;
  basePrice: number;
  slope: number;
  contractAddress: string;
  tokenAddress: string;
  creatorAddress: string;
  createdAt: number;
  logoUrl?: string;
}

const STORAGE_KEY = "cashlaunch_tokens";

export function getTokens(): LaunchedToken[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return getSeededTokens();
  try {
    return JSON.parse(raw);
  } catch {
    return getSeededTokens();
  }
}

export function saveToken(token: LaunchedToken): void {
  const tokens = getTokens();
  const existing = tokens.findIndex((t) => t.categoryId === token.categoryId);
  if (existing >= 0) {
    tokens[existing] = token;
  } else {
    tokens.unshift(token);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

export function getTokenById(categoryId: string): LaunchedToken | undefined {
  return getTokens().find((t) => t.categoryId === categoryId);
}

/** Generate a deterministic SVG logo data URL */
function makeLogo(initials: string, hue: number): string {
  const h2 = (hue + 40) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="hsl(${hue},65%,50%)"/><stop offset="100%" stop-color="hsl(${h2},65%,35%)"/></linearGradient></defs><rect width="100" height="100" rx="22" fill="url(#g)"/><text x="50" y="56" text-anchor="middle" fill="white" font-size="38" font-weight="bold" font-family="Arial,sans-serif">${initials}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Pre-seeded demo tokens — all use fixed CURVE params */
function getSeededTokens(): LaunchedToken[] {
  return [
    {
      categoryId: "demo-cashcat",
      name: "CashCat",
      symbol: "CCAT",
      description: "The first meme token on CashLaunch. Cats love BCH.",
      ...CURVE,
      contractAddress: "bchtest:p...",
      tokenAddress: "bchtest:r...",
      creatorAddress: "bchtest:q...",
      createdAt: Date.now() - 3600000 * 24,
      logoUrl: makeLogo("CC", 15),
    },
    {
      categoryId: "demo-greenbch",
      name: "GreenBCH",
      symbol: "GBCH",
      description: "Eco-friendly token for the Bitcoin Cash ecosystem.",
      ...CURVE,
      contractAddress: "bchtest:p...",
      tokenAddress: "bchtest:r...",
      creatorAddress: "bchtest:q...",
      createdAt: Date.now() - 3600000 * 12,
      logoUrl: makeLogo("GB", 140),
    },
    {
      categoryId: "demo-chipnet",
      name: "ChipNet OG",
      symbol: "CHIP",
      description: "For the OG testnet degens. Built different.",
      ...CURVE,
      contractAddress: "bchtest:p...",
      tokenAddress: "bchtest:r...",
      creatorAddress: "bchtest:q...",
      createdAt: Date.now() - 3600000 * 6,
      logoUrl: makeLogo("CH", 260),
    },
    {
      categoryId: "demo-bchbuilder",
      name: "BCH Builder",
      symbol: "BLDR",
      description: "Supporting builders in the Bitcoin Cash community.",
      ...CURVE,
      contractAddress: "bchtest:p...",
      tokenAddress: "bchtest:r...",
      creatorAddress: "bchtest:q...",
      createdAt: Date.now() - 3600000 * 2,
      logoUrl: makeLogo("BL", 30),
    },
    {
      categoryId: "demo-satoshi",
      name: "Satoshi Vision",
      symbol: "SATO",
      description: "Peer-to-peer electronic cash. The original vision.",
      ...CURVE,
      contractAddress: "bchtest:p...",
      tokenAddress: "bchtest:r...",
      creatorAddress: "bchtest:q...",
      createdAt: Date.now() - 3600000,
      logoUrl: makeLogo("SV", 200),
    },
  ];
}
