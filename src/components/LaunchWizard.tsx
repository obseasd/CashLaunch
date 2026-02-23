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

      const { Contract, ElectrumNetworkProvider } = await import("cashscript");
      const artifact = (await import("@/lib/bch/artifacts/BondingCurve.json"))
        .default;

      const provider = new ElectrumNetworkProvider("chipnet");
      const contract = new Contract(
        artifact,
        [wallet.pubkeyHash, BigInt(basePrice), BigInt(slopeVal)],
        { provider }
      );

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

  const inputClass =
    "w-full bg-surface-1 border border-border rounded-xl px-4 py-3 text-text-primary placeholder:text-text-muted focus:border-brand transition-colors duration-200";

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress steps */}
      <div className="flex items-center gap-2 mb-8">
        {[
          { n: 1, label: "Info" },
          { n: 2, label: "Tokenomics" },
          { n: 3, label: "Review" },
          { n: 4, label: "Live" },
        ].map(({ n, label }) => (
          <div key={n} className="flex items-center gap-2 flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                step >= n
                  ? "bg-brand text-surface-0"
                  : "bg-surface-2 text-text-muted"
              }`}
            >
              {step > n ? "\u2713" : n}
            </div>
            <span
              className={`text-xs hidden sm:block transition-colors ${
                step >= n ? "text-text-secondary" : "text-text-muted"
              }`}
            >
              {label}
            </span>
            {n < 4 && (
              <div
                className={`flex-1 h-px transition-colors ${
                  step > n ? "bg-brand" : "bg-border"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Token Info */}
      {step === 1 && (
        <div className="glass-card p-6 sm:p-8">
          <h2 className="text-lg font-bold mb-1">Token Information</h2>
          <p className="text-sm text-text-muted mb-6">Give your token an identity</p>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-text-secondary mb-1.5 block font-medium">
                Token Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g. CashCat"
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-xs text-text-secondary mb-1.5 block font-medium">
                Symbol (2-8 chars)
              </label>
              <input
                type="text"
                value={form.symbol}
                onChange={(e) =>
                  update("symbol", e.target.value.toUpperCase().slice(0, 8))
                }
                placeholder="e.g. CCAT"
                className={`${inputClass} font-mono`}
              />
            </div>

            <div>
              <label className="text-xs text-text-secondary mb-1.5 block font-medium">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="What makes this token special?"
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={() => setStep(2)}
              disabled={!canProceedStep1}
              className="bg-brand text-surface-0 px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-brand-light transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Tokenomics */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="glass-card p-6 sm:p-8">
            <h2 className="text-lg font-bold mb-1">Tokenomics</h2>
            <p className="text-sm text-text-muted mb-6">Configure your bonding curve</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-text-secondary mb-1.5 block font-medium">
                  Total Supply
                </label>
                <input
                  type="number"
                  value={form.totalSupply}
                  onChange={(e) => update("totalSupply", e.target.value)}
                  placeholder="1000000"
                  min="1"
                  className={`${inputClass} font-mono`}
                />
              </div>

              <div>
                <label className="text-xs text-text-secondary mb-1.5 block font-medium">
                  Base Price (sats)
                </label>
                <input
                  type="number"
                  value={form.basePrice}
                  onChange={(e) => update("basePrice", e.target.value)}
                  placeholder="10"
                  min="1"
                  className={`${inputClass} font-mono`}
                />
              </div>

              <div>
                <label className="text-xs text-text-secondary mb-1.5 block font-medium">
                  Slope
                </label>
                <input
                  type="number"
                  value={form.slope}
                  onChange={(e) => update("slope", e.target.value)}
                  placeholder="1"
                  min="0"
                  className={`${inputClass} font-mono`}
                />
              </div>
            </div>

            {/* Curve stats */}
            <div className="grid grid-cols-3 gap-3 mt-6">
              <div className="bg-surface-1 rounded-xl p-3 text-center">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Start</p>
                <p className="text-sm font-mono text-brand mt-1">
                  {basePrice + slopeVal * totalSupply}
                </p>
                <p className="text-[10px] text-text-muted">sats</p>
              </div>
              <div className="bg-surface-1 rounded-xl p-3 text-center">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">End</p>
                <p className="text-sm font-mono text-amber-400 mt-1">
                  {maxPrice}
                </p>
                <p className="text-[10px] text-text-muted">sats</p>
              </div>
              <div className="bg-surface-1 rounded-xl p-3 text-center">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">FDV</p>
                <p className="text-sm font-mono text-text-primary mt-1">
                  {totalCostEstimate.toFixed(4)}
                </p>
                <p className="text-[10px] text-text-muted">BCH</p>
              </div>
            </div>
          </div>

          {/* Chart preview */}
          <div className="glass-card p-6">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">
              Curve Preview
            </h3>
            <div className="h-56">
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
              className="text-text-muted hover:text-text-secondary transition-colors px-4 py-2 text-sm"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!canProceedStep2}
              className="bg-brand text-surface-0 px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-brand-light transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="glass-card p-6 sm:p-8">
          <h2 className="text-lg font-bold mb-1">Review & Launch</h2>
          <p className="text-sm text-text-muted mb-6">Confirm your token parameters</p>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-1 rounded-xl p-4">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Name</p>
                <p className="text-text-primary font-semibold mt-1">{form.name}</p>
              </div>
              <div className="bg-surface-1 rounded-xl p-4">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Symbol</p>
                <p className="text-text-primary font-mono mt-1">${form.symbol}</p>
              </div>
            </div>

            {form.description && (
              <div className="bg-surface-1 rounded-xl p-4">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Description</p>
                <p className="text-text-secondary text-sm mt-1">{form.description}</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-surface-1 rounded-xl p-4">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Supply</p>
                <p className="text-text-primary font-mono text-sm mt-1">
                  {totalSupply.toLocaleString()}
                </p>
              </div>
              <div className="bg-surface-1 rounded-xl p-4">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Base Price</p>
                <p className="text-text-primary font-mono text-sm mt-1">{basePrice} sats</p>
              </div>
              <div className="bg-surface-1 rounded-xl p-4">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Slope</p>
                <p className="text-text-primary font-mono text-sm mt-1">{slopeVal}</p>
              </div>
            </div>

            <div className="bg-surface-1 rounded-xl p-4">
              <p className="text-[10px] text-text-muted uppercase tracking-wider">Network</p>
              <p className="text-text-primary text-sm mt-1">BCH Chipnet (Testnet)</p>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-red-400 text-sm break-all">{error}</p>
            </div>
          )}

          <div className="flex justify-between mt-6">
            <button
              onClick={() => setStep(2)}
              className="text-text-muted hover:text-text-secondary transition-colors px-4 py-2 text-sm"
            >
              Back
            </button>
            {!isConnected ? (
              <p className="text-text-muted text-sm self-center">
                Connect wallet to launch
              </p>
            ) : (
              <button
                onClick={handleLaunch}
                disabled={loading}
                className="bg-brand text-surface-0 px-8 py-3 rounded-xl font-bold text-sm hover:bg-brand-light transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_24px_rgba(18,200,159,0.25)]"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-surface-0/30 border-t-surface-0 rounded-full animate-spin" />
                    Deploying...
                  </span>
                ) : (
                  "Launch Token"
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 4: Success */}
      {step === 4 && result && (
        <div className="glass-card p-8 sm:p-10 text-center border-brand/20">
          <div className="w-16 h-16 rounded-full bg-brand/15 flex items-center justify-center mx-auto mb-5">
            <span className="text-3xl text-brand">&#10003;</span>
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">
            Token Launched!
          </h2>
          <p className="text-text-secondary text-sm mb-6">
            {form.name} (${form.symbol}) is now live on chipnet
          </p>

          <div className="bg-surface-1 rounded-xl p-4 mb-6 text-left">
            <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">
              Category ID
            </p>
            <p className="text-xs font-mono text-brand break-all">
              {result.categoryId}
            </p>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push(`/token/${result.categoryId}`)}
              className="bg-brand text-surface-0 px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-brand-light transition-all duration-200"
            >
              View Token
            </button>
            <button
              onClick={() => router.push("/")}
              className="bg-surface-2 text-text-secondary px-6 py-2.5 rounded-xl font-semibold text-sm border border-border hover:border-border-hover transition-all duration-200"
            >
              Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
