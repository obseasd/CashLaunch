"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/context/WalletContext";

interface Props {
  basePrice: number;
  slope: number;
  totalSupply: number;
  currentSupply: number;
  categoryId: string;
  onBuy?: (amount: number, txId: string) => void;
}

export default function BuyPanel({
  basePrice,
  slope,
  totalSupply,
  currentSupply,
  categoryId,
  onBuy,
}: Props) {
  const isDemo = categoryId.startsWith("demo-");
  const { wallet, isConnected } = useWallet();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [txId, setTxId] = useState("");
  const [userBalance, setUserBalance] = useState<number | null>(null);

  // Fetch user's BCH balance
  useEffect(() => {
    if (!wallet) { setUserBalance(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const { ElectrumNetworkProvider } = await import("cashscript");
        const provider = new ElectrumNetworkProvider("chipnet");
        const utxos = await provider.getUtxos(wallet.address);
        const total = utxos
          .filter((u) => !u.token)
          .reduce((sum, u) => sum + Number(u.satoshis), 0);
        if (!cancelled) setUserBalance(total);
      } catch {
        if (!cancelled) setUserBalance(null);
      }
    })();
    return () => { cancelled = true; };
  }, [wallet, txId]); // re-fetch after a successful buy

  const tokenAmount = parseInt(amount) || 0;

  // sold = tokens outside the contract
  const sold = totalSupply - currentSupply;
  const cost =
    tokenAmount > 0
      ? tokenAmount * basePrice +
        (slope * tokenAmount * (2 * sold + tokenAmount)) / 2
      : 0;
  const costBch = cost / 1e8;

  // Calculate max tokens affordable with user's balance
  // Quadratic: slope/2 * n² + (basePrice + slope*sold) * n = budget
  // n = (-b + sqrt(b² + 2*slope*budget)) / slope
  const maxAffordable = (() => {
    if (userBalance === null || userBalance <= 2000) return 0;
    const budget = userBalance - 2000; // reserve for fees + dust
    if (slope === 0) {
      return basePrice > 0 ? Math.floor(budget / basePrice) : currentSupply;
    }
    const b = basePrice + slope * sold;
    const disc = b * b + 2 * slope * budget;
    const n = Math.floor((-b + Math.sqrt(disc)) / slope);
    return Math.max(0, Math.min(n, currentSupply));
  })();

  const handleBuy = async () => {
    if (!wallet || tokenAmount <= 0) return;
    setLoading(true);
    setError("");
    setTxId("");

    try {
      const { ElectrumNetworkProvider, Contract, TransactionBuilder, SignatureTemplate } =
        await import("cashscript");
      const artifact = (await import("@/lib/bch/artifacts/BondingCurve.json"))
        .default;

      const provider = new ElectrumNetworkProvider("chipnet");
      const contract = new Contract(
        artifact,
        [wallet.pubkeyHash, BigInt(basePrice), BigInt(slope), BigInt(totalSupply)],
        { provider }
      );

      // Get contract's token UTXO
      const utxos = await contract.getUtxos();
      const tokenUtxo = utxos.find((u) => u.token);
      if (!tokenUtxo?.token)
        throw new Error("No tokens in contract");

      // Get user's BCH UTXO to fund the purchase
      const userUtxos = await provider.getUtxos(wallet.address);
      const userUtxo = userUtxos
        .filter((u) => !u.token)
        .sort((a, b) => Number(b.satoshis - a.satoshis))[0];
      if (!userUtxo)
        throw new Error("No BCH in your wallet to fund the purchase");

      const buyAmount = BigInt(tokenAmount);
      const remaining = tokenUtxo.token.amount - buyAmount;
      const soldBefore = BigInt(totalSupply) - tokenUtxo.token.amount;
      const buyCost =
        buyAmount * BigInt(basePrice) +
        (BigInt(slope) *
          buyAmount *
          (2n * soldBefore + buyAmount)) /
          2n;

      // Check user has enough BCH
      const minNeeded = buyCost + 2000n; // cost + dust + fee
      if (userUtxo.satoshis < minNeeded)
        throw new Error(`Not enough BCH. Need ${Number(minNeeded)} sats, have ${Number(userUtxo.satoshis)}`);

      const signer = new SignatureTemplate(wallet.privateKey);
      const txFee = 1000n;

      const tx = new TransactionBuilder({ provider })
        .addInput(tokenUtxo, contract.unlock.buy())
        .addInput(userUtxo, signer.unlockP2PKH())
        // Contract output: fewer tokens, more BCH
        .addOutput({
          to: contract.tokenAddress,
          amount: tokenUtxo.satoshis + buyCost,
          token: {
            amount: remaining,
            category: tokenUtxo.token.category,
          },
        })
        // User receives bought tokens
        .addOutput({
          to: wallet.tokenAddress,
          amount: 1000n,
          token: {
            amount: buyAmount,
            category: tokenUtxo.token.category,
          },
        })
        // User's change (remaining BCH)
        .addOutput({
          to: wallet.address,
          amount: userUtxo.satoshis - buyCost - txFee - 1000n,
        });

      const result = await tx.send();
      setTxId(result.txid);
      onBuy?.(tokenAmount, result.txid);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Amount input — Uniswap style */}
      <div className="bg-surface-1 rounded-xl p-4 mb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-text-muted">Amount</span>
          <span className="text-[11px] text-text-muted">
            {userBalance !== null
              ? `You can buy: ~${maxAffordable.toLocaleString()}`
              : `In contract: ${currentSupply.toLocaleString()}`}
          </span>
        </div>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          min="1"
          max={currentSupply}
          className="w-full bg-transparent text-2xl font-mono text-text-primary placeholder:text-text-muted/40 focus:outline-none"
        />
        <div className="flex gap-1.5 mt-3">
          {[100, 1000, 10000].map((q) => {
            const cap = userBalance !== null ? Math.min(q, maxAffordable) : Math.min(q, currentSupply);
            return (
              <button
                key={q}
                onClick={() => setAmount(String(cap))}
                disabled={cap <= 0}
                className="bg-surface-2 border border-border rounded-lg px-2.5 py-1 text-[11px] text-text-muted hover:text-text-secondary hover:border-border-hover transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {q.toLocaleString()}
              </button>
            );
          })}
          <button
            onClick={() => setAmount(String(userBalance !== null ? maxAffordable : currentSupply))}
            disabled={userBalance !== null && maxAffordable <= 0}
            className="bg-brand/10 border border-brand/20 rounded-lg px-2.5 py-1 text-[11px] text-brand hover:bg-brand/15 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            MAX
          </button>
        </div>
      </div>

      {/* Cost display */}
      <div className="bg-surface-1 rounded-xl p-4 mb-4">
        <span className="text-xs text-text-muted">You pay</span>
        <div className="flex items-baseline justify-between mt-1">
          <p className="text-2xl font-mono text-text-primary">
            {tokenAmount > 0 ? costBch.toFixed(8) : "0"}
          </p>
          <span className="text-sm text-text-muted font-medium">BCH</span>
        </div>
        {tokenAmount > 0 && (
          <p className="text-[11px] text-text-muted mt-1">
            {cost.toLocaleString()} sats &middot; {(cost / tokenAmount).toFixed(1)} sats/token avg
          </p>
        )}
        {userBalance !== null && (
          <p className="text-[11px] text-text-muted mt-1">
            Balance: {userBalance.toLocaleString()} sats
          </p>
        )}
      </div>

      {/* Buy button */}
      {isDemo ? (
        <div className="text-center">
          <button
            disabled
            className="w-full bg-surface-2 text-text-muted font-semibold py-3.5 rounded-xl cursor-not-allowed text-sm"
          >
            Demo token
          </button>
          <p className="text-[11px] text-text-muted mt-2">
            Launch your own token to trade on-chain
          </p>
        </div>
      ) : !isConnected ? (
        <button
          disabled
          className="w-full bg-surface-2 text-text-muted font-semibold py-3.5 rounded-xl cursor-not-allowed text-sm"
        >
          Connect wallet
        </button>
      ) : (
        <button
          onClick={handleBuy}
          disabled={loading || tokenAmount <= 0}
          className="w-full bg-brand text-surface-0 font-semibold py-3.5 rounded-xl hover:bg-brand-light transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed text-sm hover:shadow-[0_0_20px_rgba(18,200,159,0.2)]"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-surface-0/30 border-t-surface-0 rounded-full animate-spin" />
              Sending...
            </span>
          ) : tokenAmount > 0 ? (
            `Buy ${tokenAmount.toLocaleString()} tokens`
          ) : (
            "Enter amount"
          )}
        </button>
      )}

      {error && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-red-400 text-xs break-all">{error}</p>
        </div>
      )}
      {txId && (
        <div className="mt-3 p-3 bg-brand/10 border border-brand/20 rounded-xl">
          <p className="text-brand text-xs font-medium">Transaction sent!</p>
          <p className="text-brand/70 text-[11px] font-mono mt-1 break-all">{txId}</p>
        </div>
      )}
    </div>
  );
}
