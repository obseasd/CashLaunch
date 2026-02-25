"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useWallet } from "@/context/WalletContext";
import BondingCurveChart from "./BondingCurveChart";
import { saveToken, CURVE } from "@/lib/token-store";

export default function LaunchWizard() {
  const router = useRouter();
  const { wallet, isConnected } = useWallet();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [logoPreview, setLogoPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ categoryId: string; txId: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const canProceedStep1 = name.length >= 2 && symbol.length >= 2 && symbol.length <= 8;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500_000) {
      setError("Image must be under 500KB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setLogoPreview(ev.target?.result as string);
      setError("");
    };
    reader.readAsDataURL(file);
  };

  // Deterministic color for symbol preview
  const hue = symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const hue2 = (hue + 40) % 360;

  const handleLaunch = async () => {
    if (!wallet) return;
    setLoading(true);
    setError("");

    try {
      // Compute contract address client-side first (no network needed)
      const { Contract, ElectrumNetworkProvider } = await import("cashscript");
      const artifact = (await import("@/lib/bch/artifacts/BondingCurve.json")).default;

      const provider = new ElectrumNetworkProvider("chipnet");
      const contract = new Contract(
        artifact,
        [wallet.pubkeyHash, BigInt(CURVE.basePrice), BigInt(CURVE.slope), BigInt(CURVE.totalSupply)],
        { provider }
      );

      // Single API call: genesis + wait + fund contract
      // Retry up to 2 times if chipnet is slow
      let launchRes: Response | null = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 120000); // 2 min timeout

        try {
          launchRes = await fetch("/api/token/launch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mnemonic: wallet.mnemonic,
              supply: CURVE.totalSupply,
              contractTokenAddress: contract.tokenAddress,
            }),
            signal: controller.signal,
          });
          clearTimeout(timeout);
          break; // success, exit retry loop
        } catch (fetchErr) {
          clearTimeout(timeout);
          if (attempt === 1) throw fetchErr; // last attempt, rethrow
          // First attempt failed, wait and retry
          await new Promise((r) => setTimeout(r, 3000));
        }
      }

      if (!launchRes) throw new Error("Network error");

      const responseText = await launchRes.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        throw new Error(`Server error: ${responseText.slice(0, 100)}`);
      }

      if (!launchRes.ok) {
        throw new Error(responseData.error || "Token launch failed");
      }

      const { categoryId, genesisTxId } = responseData;

      saveToken({
        categoryId,
        name,
        symbol,
        description,
        ...CURVE,
        contractAddress: contract.address,
        tokenAddress: contract.tokenAddress,
        creatorAddress: wallet.address,
        createdAt: Date.now(),
        logoUrl: logoPreview || undefined,
      });

      setResult({ categoryId, txId: genesisTxId });
      setStep(3);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("Request timed out — chipnet servers are slow. Click Launch Token to retry.");
      } else {
        setError(err instanceof Error ? err.message : "Launch failed");
      }
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
          { n: 1, label: "Token" },
          { n: 2, label: "Launch" },
          { n: 3, label: "Live" },
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
            {n < 3 && (
              <div
                className={`flex-1 h-px transition-colors ${
                  step > n ? "bg-brand" : "bg-border"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Token Identity */}
      {step === 1 && (
        <div className="glass-card p-6 sm:p-8">
          <h2 className="text-lg font-bold mb-1">Create your token</h2>
          <p className="text-sm text-text-muted mb-6">
            Pick a name, symbol and logo. The bonding curve is automatic.
          </p>

          <div className="space-y-5">
            {/* Logo upload */}
            <div>
              <label className="text-xs text-text-secondary mb-2 block font-medium">
                Logo
              </label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="relative w-20 h-20 rounded-2xl border-2 border-dashed border-border hover:border-brand/50 transition-colors flex items-center justify-center overflow-hidden group shrink-0"
                >
                  {logoPreview ? (
                    <Image
                      src={logoPreview}
                      alt="Logo"
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  ) : symbol.length >= 2 ? (
                    <div
                      className="w-full h-full flex items-center justify-center font-bold text-lg"
                      style={{
                        background: `linear-gradient(135deg, hsl(${hue}, 50%, 35%), hsl(${hue2}, 50%, 25%))`,
                        color: `hsl(${hue}, 60%, 80%)`,
                      }}
                    >
                      {symbol.slice(0, 2)}
                    </div>
                  ) : (
                    <svg className="w-6 h-6 text-text-muted group-hover:text-brand transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                    </svg>
                  )}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <div className="text-xs text-text-muted leading-relaxed">
                  <p>Upload a logo for your token</p>
                  <p className="mt-0.5">PNG, JPG or SVG. Max 500KB.</p>
                  {logoPreview && (
                    <button
                      onClick={() => setLogoPreview("")}
                      className="text-red-400 hover:text-red-300 mt-1"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Name + Symbol side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-text-secondary mb-1.5 block font-medium">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase().slice(0, 8))}
                  placeholder="e.g. CCAT"
                  className={`${inputClass} font-mono`}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs text-text-secondary mb-1.5 block font-medium">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell the community about your token..."
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-xs mt-3">{error}</p>}

          <div className="flex justify-end mt-6">
            <button
              onClick={() => { setError(""); setStep(2); }}
              disabled={!canProceedStep1}
              className="bg-brand text-surface-0 px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-brand-light transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Preview & Launch */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Token preview card */}
          <div className="glass-card p-6 sm:p-8">
            <h2 className="text-lg font-bold mb-1">Review & Launch</h2>
            <p className="text-sm text-text-muted mb-6">
              Your token will launch with a fixed bonding curve — just like pump.fun
            </p>

            {/* Token identity */}
            <div className="bg-surface-1 rounded-xl p-4 flex items-center gap-4 mb-5">
              {logoPreview ? (
                <Image src={logoPreview} alt="Logo" width={48} height={48} className="w-12 h-12 rounded-xl object-cover" />
              ) : (
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base"
                  style={{
                    background: `linear-gradient(135deg, hsl(${hue}, 50%, 35%), hsl(${hue2}, 50%, 25%))`,
                    color: `hsl(${hue}, 60%, 80%)`,
                  }}
                >
                  {symbol.slice(0, 2)}
                </div>
              )}
              <div>
                <p className="text-text-primary font-semibold">{name}</p>
                <p className="text-xs text-text-muted font-mono">${symbol}</p>
              </div>
            </div>

            {description && (
              <p className="text-sm text-text-secondary mb-5 leading-relaxed">{description}</p>
            )}

            {/* Fixed curve parameters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <div className="bg-surface-1 rounded-xl p-3 text-center">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Supply</p>
                <p className="text-sm font-mono text-text-primary mt-1">
                  {CURVE.totalSupply.toLocaleString()}
                </p>
              </div>
              <div className="bg-surface-1 rounded-xl p-3 text-center">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Start Price</p>
                <p className="text-sm font-mono text-brand mt-1">
                  {CURVE.basePrice}
                </p>
                <p className="text-[10px] text-text-muted">sats</p>
              </div>
              <div className="bg-surface-1 rounded-xl p-3 text-center">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">End Price</p>
                <p className="text-sm font-mono text-amber-400 mt-1">
                  {(CURVE.basePrice + CURVE.slope * CURVE.totalSupply).toLocaleString()}
                </p>
                <p className="text-[10px] text-text-muted">sats</p>
              </div>
              <div className="bg-surface-1 rounded-xl p-3 text-center">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Network</p>
                <p className="text-sm font-mono text-text-primary mt-1">Chipnet</p>
              </div>
            </div>
          </div>

          {/* Bonding curve chart */}
          <div className="glass-card p-6">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
              Bonding Curve
            </h3>
            <p className="text-[11px] text-text-muted mb-4">
              Price increases automatically as more tokens are bought
            </p>
            <div className="h-56">
              <BondingCurveChart
                basePrice={CURVE.basePrice}
                slope={CURVE.slope}
                totalSupply={CURVE.totalSupply}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-red-400 text-sm break-all">{error}</p>
            </div>
          )}

          {/* Funding hint */}
          {isConnected && wallet && (
            <div className="p-3 bg-surface-1 rounded-xl">
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Your chipnet address</p>
              <p className="text-xs font-mono text-text-secondary break-all">{wallet.address}</p>
              <p className="text-[11px] text-text-muted mt-2">
                Need tBCH? Get some from{" "}
                <a
                  href="https://tbch.googol.cash/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand hover:text-brand-light"
                >
                  tbch.googol.cash
                </a>
              </p>
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
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

      {/* Step 3: Success */}
      {step === 3 && result && (
        <div className="glass-card p-8 sm:p-10 text-center border-brand/20">
          <div className="w-16 h-16 rounded-full bg-brand/15 flex items-center justify-center mx-auto mb-5">
            <span className="text-3xl text-brand">&#10003;</span>
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">
            Token Launched!
          </h2>
          <p className="text-text-secondary text-sm mb-6">
            {name} (${symbol}) is now live on chipnet
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
