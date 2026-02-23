"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import TokenCard from "@/components/TokenCard";
import { getTokens, type LaunchedToken } from "@/lib/token-store";

type SortKey = "newest" | "price" | "supply";

export default function Home() {
  const [tokens, setTokens] = useState<LaunchedToken[]>([]);
  const [sort, setSort] = useState<SortKey>("newest");

  useEffect(() => {
    setTokens(getTokens());
  }, []);

  const sorted = [...tokens].sort((a, b) => {
    switch (sort) {
      case "newest":
        return b.createdAt - a.createdAt;
      case "price":
        return (b.basePrice + b.slope * b.totalSupply) - (a.basePrice + a.slope * a.totalSupply);
      case "supply":
        return b.totalSupply - a.totalSupply;
      default:
        return 0;
    }
  });

  return (
    <div>
      {/* Hero */}
      <div className="text-center py-16 sm:py-20 relative">
        {/* Subtle glow behind logo */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-64 h-64 bg-brand/5 rounded-full blur-3xl pointer-events-none" />

        <Image
          src="/logo.png"
          alt="CashLaunch"
          width={72}
          height={72}
          className="mx-auto mb-6 rounded-full"
        />

        <h1 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight">
          Launch your{" "}
          <span className="text-brand">CashToken</span>
        </h1>
        <p className="text-text-secondary text-base sm:text-lg max-w-lg mx-auto mb-8 leading-relaxed">
          Create a token with instant bonding curve liquidity on Bitcoin Cash.
          No DEX listing needed.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/launch"
            className="bg-brand text-surface-0 px-7 py-3 rounded-xl font-semibold text-sm hover:bg-brand-light transition-all duration-200 hover:shadow-[0_0_24px_rgba(18,200,159,0.25)]"
          >
            Create Token
          </Link>
          <a
            href="#tokens"
            className="bg-surface-2 text-text-secondary px-7 py-3 rounded-xl font-semibold text-sm border border-border hover:border-border-hover hover:text-text-primary transition-all duration-200"
          >
            Explore
          </a>
        </div>

        {/* Stats */}
        <div className="flex gap-8 justify-center mt-12">
          <div>
            <p className="text-xl font-bold text-text-primary">{tokens.length}</p>
            <p className="text-xs text-text-muted mt-0.5">Tokens</p>
          </div>
          <div className="w-px bg-border" />
          <div>
            <p className="text-xl font-bold text-text-primary">Chipnet</p>
            <p className="text-xs text-text-muted mt-0.5">Network</p>
          </div>
          <div className="w-px bg-border" />
          <div>
            <p className="text-xl font-bold text-brand">CashScript</p>
            <p className="text-xs text-text-muted mt-0.5">Covenants</p>
          </div>
        </div>
      </div>

      {/* Token grid */}
      <div id="tokens" className="scroll-mt-20">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-text-primary">Trending Tokens</h2>
          <div className="flex bg-surface-2 rounded-xl p-1 gap-0.5">
            {(["newest", "price", "supply"] as const).map((key) => (
              <button
                key={key}
                onClick={() => setSort(key)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                  sort === key
                    ? "bg-surface-3 text-text-primary"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sorted.map((token) => (
            <TokenCard key={token.categoryId} token={token} />
          ))}
        </div>

        {tokens.length === 0 && (
          <div className="text-center py-16">
            <p className="text-text-muted text-sm">No tokens launched yet.</p>
            <Link
              href="/launch"
              className="text-brand hover:text-brand-light mt-2 inline-block text-sm"
            >
              Be the first to launch
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
