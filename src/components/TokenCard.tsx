"use client";

import Link from "next/link";
import type { LaunchedToken } from "@/lib/token-store";

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function TokenCard({ token }: { token: LaunchedToken }) {
  // Calculate current price based on how many tokens have been "sold"
  // For demo purposes, estimate progress
  const currentPrice = token.basePrice + token.slope * (token.totalSupply * 0.1);
  const marketCap = currentPrice * token.totalSupply;
  const progress = Math.min(Math.random() * 60 + 10, 100); // demo randomized

  // Generate a deterministic color from symbol
  const hue = token.symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;

  return (
    <Link href={`/token/${token.categoryId}`}>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 hover:bg-gray-900/80 transition-all cursor-pointer group">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
            style={{
              backgroundColor: `hsl(${hue}, 60%, 30%)`,
              color: `hsl(${hue}, 60%, 80%)`,
            }}
          >
            {token.symbol.slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-100 truncate group-hover:text-bch-green transition-colors">
              {token.name}
            </h3>
            <p className="text-xs text-gray-500 font-mono">${token.symbol}</p>
          </div>
          <span className="text-xs text-gray-600">{timeAgo(token.createdAt)}</span>
        </div>

        {/* Description */}
        <p className="text-xs text-gray-500 mb-4 line-clamp-2">
          {token.description}
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <p className="text-xs text-gray-600">Price</p>
            <p className="text-sm font-mono text-gray-300">
              {currentPrice.toFixed(0)} sats
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Market Cap</p>
            <p className="text-sm font-mono text-gray-300">
              {formatNumber(Math.round(marketCap / 1e8))} BCH
            </p>
          </div>
        </div>

        {/* Bonding curve progress */}
        <div>
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Bonding Curve</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-bch-green rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Supply */}
        <div className="mt-3 flex justify-between text-xs text-gray-600">
          <span>Supply: {formatNumber(token.totalSupply)}</span>
          <span>
            Base: {token.basePrice} · Slope: {token.slope}
          </span>
        </div>
      </div>
    </Link>
  );
}
