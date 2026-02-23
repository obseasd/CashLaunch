"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import BondingCurveChart from "@/components/BondingCurveChart";
import BuyPanel from "@/components/BuyPanel";
import SellPanel from "@/components/SellPanel";
import { getTokenById, type LaunchedToken } from "@/lib/token-store";

type TradeTab = "buy" | "sell";

export default function TokenPage() {
  const params = useParams();
  const id = params.id as string;
  const [token, setToken] = useState<LaunchedToken | null>(null);
  const [tab, setTab] = useState<TradeTab>("buy");
  const [contractState, setContractState] = useState<{
    supply: number;
    bchBalance: number;
    tokensSold: number;
  } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const t = getTokenById(id);
    if (t) setToken(t);
  }, [id]);

  // Fetch live contract state
  useEffect(() => {
    if (!token || token.categoryId.startsWith("demo-")) {
      if (token) {
        const sold = Math.floor(token.totalSupply * 0.15);
        setContractState({
          supply: token.totalSupply - sold,
          bchBalance: 0,
          tokensSold: sold,
        });
      }
      return;
    }

    let cancelled = false;

    async function fetchState() {
      try {
        const { ElectrumNetworkProvider, Contract } = await import("cashscript");
        const artifact = (
          await import("@/lib/bch/artifacts/BondingCurve.json")
        ).default;

        const provider = new ElectrumNetworkProvider("chipnet");

        const mnemonic = localStorage.getItem("cashlaunch_mnemonic");
        if (!mnemonic) return;

        const {
          deriveHdPrivateNodeFromSeed,
          deriveHdPath,
          deriveSeedFromBip39Mnemonic,
          secp256k1,
          hash160,
        } = await import("@bitauth/libauth");

        const seedBytes = deriveSeedFromBip39Mnemonic(mnemonic);
        if (typeof seedBytes === "string") return;
        const rootNode = deriveHdPrivateNodeFromSeed(seedBytes);
        const node = deriveHdPath(rootNode, "m/44'/0'/0'/0/0");
        if (typeof node === "string") return;
        const publicKey = secp256k1.derivePublicKeyCompressed(node.privateKey);
        if (typeof publicKey === "string") return;
        const pkh = hash160(publicKey);

        const contract = new Contract(
          artifact,
          [pkh, BigInt(token!.basePrice), BigInt(token!.slope)],
          { provider }
        );

        const utxos = await contract.getUtxos();
        const tokenUtxo = utxos.find((u) => u.token);

        if (!cancelled && tokenUtxo?.token) {
          const supply = Number(tokenUtxo.token.amount);
          setContractState({
            supply,
            bchBalance: Number(tokenUtxo.satoshis) / 1e8,
            tokensSold: token!.totalSupply - supply,
          });
        }
      } catch (err) {
        console.error("Failed to fetch contract state:", err);
      }
    }

    fetchState();
    return () => { cancelled = true; };
  }, [token, refreshKey]);

  if (!token) {
    return (
      <div className="text-center py-20">
        <p className="text-text-muted text-sm">Token not found</p>
        <Link href="/" className="text-brand hover:text-brand-light mt-4 inline-block text-sm">
          Back to home
        </Link>
      </div>
    );
  }

  const currentSupply = contractState?.supply ?? token.totalSupply;
  const tokensSold = contractState?.tokensSold ?? 0;
  const currentPrice = token.basePrice + token.slope * currentSupply;
  const progress = (tokensSold / token.totalSupply) * 100;

  const hue = token.symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const hue2 = (hue + 40) % 360;

  return (
    <div className="py-2">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-text-muted mb-6">
        <Link href="/" className="hover:text-text-secondary transition-colors">
          Home
        </Link>
        <span className="text-text-muted/50">/</span>
        <span className="text-text-secondary">{token.name}</span>
      </div>

      {/* Token header */}
      <div className="flex items-center gap-4 mb-6">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base shrink-0"
          style={{
            background: `linear-gradient(135deg, hsl(${hue}, 50%, 35%), hsl(${hue2}, 50%, 25%))`,
            color: `hsl(${hue}, 60%, 80%)`,
          }}
        >
          {token.symbol.slice(0, 2)}
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-primary">{token.name}</h1>
          <p className="text-xs text-text-muted font-mono">${token.symbol}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xl font-bold font-mono text-brand">
            {currentPrice.toLocaleString()} <span className="text-xs text-text-muted font-normal">sats</span>
          </p>
          <p className="text-[11px] text-text-muted">current price</p>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left: Chart + Info (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Chart */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Bonding Curve
              </h2>
              <button
                onClick={() => setRefreshKey((k) => k + 1)}
                className="text-[11px] text-text-muted hover:text-text-secondary transition-colors"
              >
                Refresh
              </button>
            </div>
            <div className="h-64">
              <BondingCurveChart
                basePrice={token.basePrice}
                slope={token.slope}
                totalSupply={token.totalSupply}
                currentSold={tokensSold}
              />
            </div>
          </div>

          {/* Progress */}
          <div className="glass-card p-5">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-text-muted">Bonding Curve Progress</span>
              <span className="text-brand font-mono font-medium">
                {progress.toFixed(1)}%
              </span>
            </div>
            <div className="h-2 bg-surface-1 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(progress, 100)}%`,
                  background: "linear-gradient(90deg, #12c89f, #15dfb2)",
                }}
              />
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Sold</p>
                <p className="text-sm font-mono text-text-primary mt-0.5">
                  {tokensSold.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Remaining</p>
                <p className="text-sm font-mono text-text-primary mt-0.5">
                  {currentSupply.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Contract</p>
                <p className="text-sm font-mono text-text-primary mt-0.5">
                  {(contractState?.bchBalance ?? 0).toFixed(8)} BCH
                </p>
              </div>
            </div>
          </div>

          {/* Token info */}
          <div className="glass-card p-5">
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">
              Token Info
            </h2>
            {token.description && (
              <p className="text-text-secondary text-sm mb-4 leading-relaxed">
                {token.description}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-surface-1 rounded-lg p-3">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Supply</p>
                <p className="font-mono text-text-primary text-xs mt-1">
                  {token.totalSupply.toLocaleString()}
                </p>
              </div>
              <div className="bg-surface-1 rounded-lg p-3">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Base Price</p>
                <p className="font-mono text-text-primary text-xs mt-1">
                  {token.basePrice} sats
                </p>
              </div>
              <div className="bg-surface-1 rounded-lg p-3">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Slope</p>
                <p className="font-mono text-text-primary text-xs mt-1">
                  {token.slope} sats/token
                </p>
              </div>
              <div className="bg-surface-1 rounded-lg p-3">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Created</p>
                <p className="font-mono text-text-primary text-xs mt-1">
                  {new Date(token.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="bg-surface-1 rounded-lg p-3 col-span-2">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Category ID</p>
                <p className="font-mono text-text-primary text-xs mt-1 truncate">
                  {token.categoryId}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Swap card (2 cols) — Uniswap-style */}
        <div className="lg:col-span-2">
          <div className="glass-card p-5 lg:sticky lg:top-24">
            {/* Buy/Sell tabs */}
            <div className="flex bg-surface-1 rounded-xl p-1 mb-5 gap-0.5">
              <button
                onClick={() => setTab("buy")}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  tab === "buy"
                    ? "bg-brand/15 text-brand"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                Buy
              </button>
              <button
                onClick={() => setTab("sell")}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  tab === "sell"
                    ? "bg-red-500/15 text-red-400"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                Sell
              </button>
            </div>

            {tab === "buy" ? (
              <BuyPanel
                basePrice={token.basePrice}
                slope={token.slope}
                currentSupply={currentSupply}
                categoryId={token.categoryId}
                onBuy={() => setRefreshKey((k) => k + 1)}
              />
            ) : (
              <SellPanel
                basePrice={token.basePrice}
                slope={token.slope}
                currentSupply={currentSupply}
                categoryId={token.categoryId}
                onSell={() => setRefreshKey((k) => k + 1)}
              />
            )}

            {/* Price info below swap */}
            <div className="mt-5 pt-4 border-t border-border">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-text-muted">Current Price</span>
                <span className="text-text-primary font-mono">{currentPrice.toLocaleString()} sats</span>
              </div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-text-muted">Base Price</span>
                <span className="text-text-primary font-mono">{token.basePrice} sats</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-text-muted">Slope</span>
                <span className="text-text-primary font-mono">{token.slope} sats/token</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
