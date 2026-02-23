"use client";

import Link from "next/link";
import Image from "next/image";
import type { LaunchedToken } from "@/lib/token-store";

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function TokenCard({ token }: { token: LaunchedToken }) {
  // Deterministic progress from categoryId hash
  const hashCode = token.categoryId
    .split("")
    .reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
  const progress = Math.abs(hashCode % 50) + 5; // 5-54% range, deterministic per token

  // Ascending bonding curve: price = basePrice + slope * tokensSold
  const estimatedSold = Math.floor(token.totalSupply * (progress / 100));
  const currentPrice = token.basePrice + token.slope * estimatedSold;
  const marketCapSats = currentPrice * token.totalSupply;

  // Deterministic gradient from symbol
  const hue = token.symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const hue2 = (hue + 40) % 360;

  return (
    <Link href={`/token/${token.categoryId}`}>
      <div className="glass-card-hover p-4 cursor-pointer group">
        <div className="flex items-start gap-3">
          {/* Token avatar / logo */}
          {token.logoUrl ? (
            <Image
              src={token.logoUrl}
              alt={token.symbol}
              width={44}
              height={44}
              className="w-11 h-11 rounded-xl object-cover shrink-0"
            />
          ) : (
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
              style={{
                background: `linear-gradient(135deg, hsl(${hue}, 50%, 35%), hsl(${hue2}, 50%, 25%))`,
                color: `hsl(${hue}, 60%, 80%)`,
              }}
            >
              {token.symbol.slice(0, 2)}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-text-primary text-sm truncate group-hover:text-brand transition-colors">
                {token.name}
              </h3>
              <span className="text-[11px] text-text-muted shrink-0">
                {timeAgo(token.createdAt)}
              </span>
            </div>
            <p className="text-xs text-text-muted font-mono">${token.symbol}</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-text-secondary mt-3 line-clamp-2 leading-relaxed">
          {token.description}
        </p>

        {/* Stats row */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
          <div className="flex-1">
            <p className="text-[10px] text-text-muted uppercase tracking-wider">Price</p>
            <p className="text-xs font-mono text-text-primary mt-0.5">
              {formatNumber(currentPrice)} <span className="text-text-muted">sats</span>
            </p>
          </div>
          <div className="flex-1">
            <p className="text-[10px] text-text-muted uppercase tracking-wider">MCap</p>
            <p className="text-xs font-mono text-text-primary mt-0.5">
              {formatNumber(marketCapSats)} <span className="text-text-muted">sats</span>
            </p>
          </div>
          <div className="flex-1">
            <p className="text-[10px] text-text-muted uppercase tracking-wider">Supply</p>
            <p className="text-xs font-mono text-text-primary mt-0.5">
              {formatNumber(token.totalSupply)}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-text-muted">Bonding Curve</span>
            <span className="text-brand font-mono">{progress.toFixed(0)}%</span>
          </div>
          <div className="h-1 bg-surface-1 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, #12c89f, #15dfb2)",
              }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
