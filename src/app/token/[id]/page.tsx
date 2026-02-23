"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import BondingCurveChart from "@/components/BondingCurveChart";
import BuyPanel from "@/components/BuyPanel";
import SellPanel from "@/components/SellPanel";
import { getTokenById, type LaunchedToken } from "@/lib/token-store";

export default function TokenPage() {
  const params = useParams();
  const id = params.id as string;
  const [token, setToken] = useState<LaunchedToken | null>(null);
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
      // For demo tokens, show simulated state
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

        // We need the wallet context to know the pubkey hash used for this contract
        // For now, try to reconstruct from localStorage
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
        <p className="text-gray-500 text-lg">Token not found</p>
        <Link href="/" className="text-bch-green hover:underline mt-4 inline-block">
          Back to home
        </Link>
      </div>
    );
  }

  const currentSupply = contractState?.supply ?? token.totalSupply;
  const tokensSold = contractState?.tokensSold ?? 0;
  const currentPrice = token.basePrice + token.slope * currentSupply;
  const progress = (tokensSold / token.totalSupply) * 100;

  // Generate a deterministic color from symbol
  const hue = token.symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;

  return (
    <div className="py-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-gray-300 transition-colors">
          Home
        </Link>
        <span>/</span>
        <span className="text-gray-300">{token.name}</span>
      </div>

      {/* Token header */}
      <div className="flex items-center gap-4 mb-8">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg"
          style={{
            backgroundColor: `hsl(${hue}, 60%, 30%)`,
            color: `hsl(${hue}, 60%, 80%)`,
          }}
        >
          {token.symbol.slice(0, 2)}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{token.name}</h1>
          <p className="text-gray-500 font-mono">${token.symbol}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-2xl font-bold font-mono text-bch-green">
            {currentPrice} <span className="text-sm text-gray-500">sats</span>
          </p>
          <p className="text-xs text-gray-500">current price</p>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Chart + Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bonding curve chart */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-400">
                Bonding Curve
              </h2>
              <button
                onClick={() => setRefreshKey((k) => k + 1)}
                className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
              >
                Refresh
              </button>
            </div>
            <div className="h-72">
              <BondingCurveChart
                basePrice={token.basePrice}
                slope={token.slope}
                totalSupply={token.totalSupply}
                currentSold={tokensSold}
              />
            </div>
          </div>

          {/* Progress */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Bonding Curve Progress</span>
              <span className="text-bch-green font-mono">
                {progress.toFixed(1)}%
              </span>
            </div>
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-bch-green to-bch-green-light rounded-full transition-all duration-500"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <p className="text-xs text-gray-600">Tokens Sold</p>
                <p className="text-sm font-mono text-gray-300">
                  {tokensSold.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Remaining</p>
                <p className="text-sm font-mono text-gray-300">
                  {currentSupply.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Contract BCH</p>
                <p className="text-sm font-mono text-gray-300">
                  {(contractState?.bchBalance ?? 0).toFixed(8)}
                </p>
              </div>
            </div>
          </div>

          {/* Token info */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-400 mb-4">
              Token Info
            </h2>
            <div className="space-y-3">
              {token.description && (
                <p className="text-gray-300 text-sm">{token.description}</p>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-600">Total Supply</p>
                  <p className="font-mono text-gray-300">
                    {token.totalSupply.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Base Price</p>
                  <p className="font-mono text-gray-300">
                    {token.basePrice} sats
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Slope</p>
                  <p className="font-mono text-gray-300">
                    {token.slope} sats/token
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Category ID</p>
                  <p className="font-mono text-gray-300 text-xs truncate">
                    {token.categoryId}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Creator</p>
                  <p className="font-mono text-gray-300 text-xs truncate">
                    {token.creatorAddress}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Created</p>
                  <p className="font-mono text-gray-300 text-xs">
                    {new Date(token.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Buy/Sell panels */}
        <div className="space-y-6">
          <BuyPanel
            basePrice={token.basePrice}
            slope={token.slope}
            currentSupply={currentSupply}
            categoryId={token.categoryId}
            onBuy={() => setRefreshKey((k) => k + 1)}
          />
          <SellPanel
            basePrice={token.basePrice}
            slope={token.slope}
            currentSupply={currentSupply}
            categoryId={token.categoryId}
            onSell={() => setRefreshKey((k) => k + 1)}
          />
        </div>
      </div>
    </div>
  );
}
