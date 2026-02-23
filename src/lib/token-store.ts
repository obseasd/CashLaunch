/**
 * Simple client-side token store using localStorage.
 * For the hackathon demo — production would use a database.
 */

export interface LaunchedToken {
  categoryId: string;
  name: string;
  symbol: string;
  description: string;
  totalSupply: number;
  basePrice: number;      // sats
  slope: number;           // sats per token
  contractAddress: string;
  tokenAddress: string;
  creatorAddress: string;
  createdAt: number;       // timestamp
  logoUrl?: string;        // base64 data URL or external URL
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

/** Pre-seeded demo tokens for the discovery page */
function getSeededTokens(): LaunchedToken[] {
  return [
    {
      categoryId: "demo-cashcat",
      name: "CashCat",
      symbol: "CCAT",
      description: "The first meme token on CashLaunch. Cats love BCH.",
      totalSupply: 1000000,
      basePrice: 10,
      slope: 1,
      contractAddress: "bchtest:p...",
      tokenAddress: "bchtest:r...",
      creatorAddress: "bchtest:q...",
      createdAt: Date.now() - 3600000 * 24,
    },
    {
      categoryId: "demo-greenbch",
      name: "GreenBCH",
      symbol: "GBCH",
      description: "Eco-friendly token for the Bitcoin Cash ecosystem.",
      totalSupply: 500000,
      basePrice: 50,
      slope: 2,
      contractAddress: "bchtest:p...",
      tokenAddress: "bchtest:r...",
      creatorAddress: "bchtest:q...",
      createdAt: Date.now() - 3600000 * 12,
    },
    {
      categoryId: "demo-chipnet",
      name: "ChipNet OG",
      symbol: "CHIP",
      description: "For the OG testnet degens. Built different.",
      totalSupply: 2100000,
      basePrice: 21,
      slope: 1,
      contractAddress: "bchtest:p...",
      tokenAddress: "bchtest:r...",
      creatorAddress: "bchtest:q...",
      createdAt: Date.now() - 3600000 * 6,
    },
    {
      categoryId: "demo-bchbuilder",
      name: "BCH Builder",
      symbol: "BLDR",
      description: "Supporting builders in the Bitcoin Cash community.",
      totalSupply: 100000,
      basePrice: 100,
      slope: 5,
      contractAddress: "bchtest:p...",
      tokenAddress: "bchtest:r...",
      creatorAddress: "bchtest:q...",
      createdAt: Date.now() - 3600000 * 2,
    },
    {
      categoryId: "demo-satoshi",
      name: "Satoshi Vision",
      symbol: "SATO",
      description: "Peer-to-peer electronic cash. The original vision.",
      totalSupply: 21000000,
      basePrice: 1,
      slope: 1,
      contractAddress: "bchtest:p...",
      tokenAddress: "bchtest:r...",
      creatorAddress: "bchtest:q...",
      createdAt: Date.now() - 3600000,
    },
  ];
}
