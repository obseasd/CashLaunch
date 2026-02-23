"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/context/WalletContext";
import BondingCurveChart from "./BondingCurveChart";
import { saveToken } from "@/lib/token-store";

interface TokenForm {
  name: string;
  symbol: string;
  description: string;
  totalSupply: string;
  basePrice: string;
  slope: string;
}

const DEFAULTS: TokenForm = {
  name: "",
  symbol: "",
  description: "",
  totalSupply: "1000000",
  basePrice: "10",
  slope: "1",
};

export default function LaunchWizard() {
  const router = useRouter();
  const { wallet, isConnected } = useWallet();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<TokenForm>(DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ categoryId: string; txId: string } | null>(null);

  const update = (field: keyof TokenForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const totalSupply = parseInt(form.totalSupply) || 0;
  const basePrice = parseInt(form.basePrice) || 0;
  const slopeVal = parseInt(form.slope) || 0;

  const maxPrice = basePrice + slopeVal * totalSupply;
  const totalCostEstimate =
    totalSupply > 0
      ? (totalSupply * basePrice + (slopeVal * totalSupply * totalSupply) / 2) / 1e8
      : 0;

  const canProceedStep1 =
    form.name.length >= 2 && form.symbol.length >= 2 && form.symbol.length <= 8;
  const canProceedStep2 = totalSupply > 0 && basePrice > 0;

  const handleLaunch = async () => {
    if (!wallet) return;
    setLoading(true);
    setError("");

    try {
      // Step 1: Create token via API route (mainnet-js needs Node.js)
      const genesisRes = await fetch("/api/token/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mnemonic: wallet.mnemonic,
          supply: totalSupply,
        }),
      });

      if (!genesisRes.ok) {
        const errData = await genesisRes.json();
        throw new Error(errData.error || "Token genesis failed");
      }

      const { categoryId, txId } = await genesisRes.json();

      // Step 2: Fund contract — send tokens to bonding curve contract address
      const { Contract, ElectrumNetworkProvider } = await import("cashscript");
      const artifact = (await import("@/lib/bch/artifacts/BondingCurve.json"))
        .default;

      const provider = new ElectrumNetworkProvider("chipnet");
      const contract = new Contract(
        artifact,
        [wallet.pubkeyHash, BigInt(basePrice), BigInt(slopeVal)],
        { provider }
      );

      // Send tokens to contract via API route
      const fundRes = await fetch("/api/token/fund-contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mnemonic: wallet.mnemonic,
          categoryId,
          contractTokenAddress: contract.tokenAddress,
          amount: totalSupply,
        }),
      });

      if (!fundRes.ok) {
        const errData = await fundRes.json();
        throw new Error(errData.error || "Failed to fund contract");
      }

      // Save to local store
      saveToken({
        categoryId,
        name: form.name,
        symbol: form.symbol,
        description: form.description,
        totalSupply,
        basePrice,
        slope: slopeVal,
        contractAddress: contract.address,
        tokenAddress: contract.tokenAddress,
        creatorAddress: wallet.address,
        createdAt: Date.now(),
      });

      setResult({ categoryId, txId });
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Launch failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress steps */}
      <div className="flex items-center gap-2 mb-8">
        {[
          { n: 1, label: "Token Info" },
          { n: 2, label: "Tokenomics" },
          { n: 3, label: "Review" },
          { n: 4, label: "Deployed" },
        ].map(({ n, label }) => (
          <div key={n} className="flex items-center gap-2 flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                step >= n
                  ? "bg-bch-green text-gray-950"
                  : "bg-gray-800 text-gray-500"
              }`}
            >
              {step > n ? "\u2713" : n}
            </div>
            <span
              className={`text-xs hidden sm:block ${
                step >= n ? "text-gray-300" : "text-gray-600"
              }`}
            >
              {label}
            </span>
            {n < 4 && (
              <div
                className={`flex-1 h-px ${
                  step > n ? "bg-bch-green" : "bg-gray-800"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Token Info */}
      {step === 1 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-6">Token Information</h2>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">
                Token Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g. CashCat"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-bch-green transition-colors"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">
                Symbol (2-8 chars)
              </label>
              <input
                type="text"
                value={form.symbol}
                onChange={(e) =>
                  update("symbol", e.target.value.toUpperCase().slice(0, 8))
                }
                placeholder="e.g. CCAT"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 font-mono focus:outline-none focus:border-bch-green transition-colors"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="What makes this token special?"
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-bch-green transition-colors resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={() => setStep(2)}
              disabled={!canProceedStep1}
              className="bg-bch-green text-gray-950 px-6 py-2.5 rounded-lg font-semibold hover:bg-bch-green-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next: Tokenomics
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Tokenomics */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-6">Tokenomics</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">
                  Total Supply
                </label>
                <input
                  type="number"
                  value={form.totalSupply}
                  onChange={(e) => update("totalSupply", e.target.value)}
                  placeholder="1000000"
                  min="1"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 font-mono focus:outline-none focus:border-bch-green transition-colors"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">
                  Base Price (sats)
                </label>
                <input
                  type="number"
                  value={form.basePrice}
                  onChange={(e) => update("basePrice", e.target.value)}
                  placeholder="10"
                  min="1"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 font-mono focus:outline-none focus:border-bch-green transition-colors"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">
                  Slope (sats/token)
                </label>
                <input
                  type="number"
                  value={form.slope}
                  onChange={(e) => update("slope", e.target.value)}
                  placeholder="1"
                  min="0"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 font-mono focus:outline-none focus:border-bch-green transition-colors"
                />
              </div>
            </div>

            {/* Stats preview */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">Start Price</p>
                <p className="text-lg font-mono text-bch-green">
                  {basePrice + slopeVal * totalSupply} sats
                </p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">End Price</p>
                <p className="text-lg font-mono text-yellow-400">
                  {maxPrice} sats
                </p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">Fully Diluted</p>
                <p className="text-lg font-mono text-gray-300">
                  {totalCostEstimate.toFixed(4)} BCH
                </p>
              </div>
            </div>
          </div>

          {/* Live chart preview */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-gray-400 mb-4">
              Bonding Curve Preview
            </h3>
            <div className="h-64">
              <BondingCurveChart
                basePrice={basePrice}
                slope={slopeVal}
                totalSupply={totalSupply}
              />
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="text-gray-400 hover:text-gray-200 transition-colors px-4 py-2"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!canProceedStep2}
              className="bg-bch-green text-gray-950 px-6 py-2.5 rounded-lg font-semibold hover:bg-bch-green-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next: Review
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Confirm */}
      {step === 3 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-6">Review & Launch</h2>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-xs text-gray-500">Name</p>
                <p className="text-gray-100 font-semibold">{form.name}</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-xs text-gray-500">Symbol</p>
                <p className="text-gray-100 font-mono">${form.symbol}</p>
              </div>
            </div>

            {form.description && (
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-xs text-gray-500">Description</p>
                <p className="text-gray-300 text-sm">{form.description}</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-xs text-gray-500">Supply</p>
                <p className="text-gray-100 font-mono">
                  {totalSupply.toLocaleString()}
                </p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-xs text-gray-500">Base Price</p>
                <p className="text-gray-100 font-mono">{basePrice} sats</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-xs text-gray-500">Slope</p>
                <p className="text-gray-100 font-mono">{slopeVal} sats/token</p>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-xs text-gray-500">Network</p>
              <p className="text-gray-100">BCH Chipnet (Testnet)</p>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm mt-4 break-all">{error}</p>
          )}

          <div className="flex justify-between mt-6">
            <button
              onClick={() => setStep(2)}
              className="text-gray-400 hover:text-gray-200 transition-colors px-4 py-2"
            >
              Back
            </button>
            {!isConnected ? (
              <p className="text-gray-500 text-sm self-center">
                Connect wallet to launch
              </p>
            ) : (
              <button
                onClick={handleLaunch}
                disabled={loading}
                className="bg-bch-green text-gray-950 px-8 py-3 rounded-lg font-bold text-lg hover:bg-bch-green-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Deploying..." : "Launch Token"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 4: Success */}
      {step === 4 && result && (
        <div className="bg-gray-900 border border-green-800/30 rounded-xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-bch-green/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl text-bch-green">&#10003;</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-100 mb-2">
            Token Launched!
          </h2>
          <p className="text-gray-400 mb-6">
            {form.name} (${form.symbol}) is now live on chipnet
          </p>

          <div className="bg-gray-800/50 rounded-lg p-4 mb-6 text-left">
            <p className="text-xs text-gray-500 mb-1">Category ID</p>
            <p className="text-sm font-mono text-bch-green break-all">
              {result.categoryId}
            </p>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => router.push(`/token/${result.categoryId}`)}
              className="bg-bch-green text-gray-950 px-6 py-2.5 rounded-lg font-semibold hover:bg-bch-green-light transition-colors"
            >
              View Token
            </button>
            <button
              onClick={() => router.push("/")}
              className="bg-gray-800 text-gray-300 px-6 py-2.5 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
