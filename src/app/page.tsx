"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
      <div className="text-center py-12 sm:py-16">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">
          Launch your{" "}
          <span className="text-bch-green">CashToken</span>{" "}
          <br className="hidden sm:block" />
          in 30 seconds
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-8">
          Create a CashToken with instant bonding curve liquidity on Bitcoin Cash.
          No DEX listing needed. All trades on-chain.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/launch"
            className="bg-bch-green text-gray-950 px-8 py-3 rounded-lg font-bold text-lg hover:bg-bch-green-light transition-colors"
          >
            Launch Token
          </Link>
          <a
            href="#tokens"
            className="bg-gray-800 text-gray-300 px-8 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
          >
            Explore
          </a>
        </div>

        {/* Stats ribbon */}
        <div className="flex gap-8 justify-center mt-10 text-sm">
          <div>
            <p className="text-2xl font-bold text-gray-100">{tokens.length}</p>
            <p className="text-gray-500">Tokens</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-100">Chipnet</p>
            <p className="text-gray-500">Network</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-bch-green">CashScript</p>
            <p className="text-gray-500">Covenants</p>
          </div>
        </div>
      </div>

      {/* Token grid */}
      <div id="tokens" className="scroll-mt-20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Token Discovery</h2>
          <div className="flex gap-2">
            {(["newest", "price", "supply"] as const).map((key) => (
              <button
                key={key}
                onClick={() => setSort(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  sort === key
                    ? "bg-bch-green/20 text-bch-green"
                    : "bg-gray-800 text-gray-500 hover:text-gray-300"
                }`}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((token) => (
            <TokenCard key={token.categoryId} token={token} />
          ))}
        </div>

        {tokens.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No tokens launched yet.</p>
            <Link
              href="/launch"
              className="text-bch-green hover:underline mt-2 inline-block"
            >
              Be the first to launch
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
