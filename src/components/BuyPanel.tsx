"use client";

import { useState } from "react";
import { useWallet } from "@/context/WalletContext";

interface Props {
  basePrice: number;
  slope: number;
  currentSupply: number;
  categoryId: string;
  onBuy?: (amount: number, txId: string) => void;
}

export default function BuyPanel({
  basePrice,
  slope,
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

  const tokenAmount = parseInt(amount) || 0;

  const cost =
    tokenAmount > 0
      ? tokenAmount * basePrice +
        (slope * tokenAmount * (2 * currentSupply - tokenAmount)) / 2
      : 0;
  const costBch = cost / 1e8;

  const handleBuy = async () => {
    if (!wallet || tokenAmount <= 0) return;
    setLoading(true);
    setError("");
    setTxId("");

    try {
      const { ElectrumNetworkProvider, Contract, TransactionBuilder } =
        await import("cashscript");
      const artifact = (await import("@/lib/bch/artifacts/BondingCurve.json"))
        .default;

      const provider = new ElectrumNetworkProvider("chipnet");
      const contract = new Contract(
        artifact,
        [wallet.pubkeyHash, BigInt(basePrice), BigInt(slope)],
        { provider }
      );

      const utxos = await contract.getUtxos();
      const tokenUtxo = utxos.find((u) => u.token);
      if (!tokenUtxo?.token)
        throw new Error("No tokens in contract");

      const buyAmount = BigInt(tokenAmount);
      const remaining = tokenUtxo.token.amount - buyAmount;
      const buyCost =
        buyAmount * BigInt(basePrice) +
        (BigInt(slope) *
          buyAmount *
          (2n * tokenUtxo.token.amount - buyAmount)) /
          2n;

      const tx = new TransactionBuilder({ provider })
        .addInput(tokenUtxo, contract.unlock.buy())
        .addOutput({
          to: contract.tokenAddress,
          amount: tokenUtxo.satoshis + buyCost,
          token: {
            amount: remaining,
            category: tokenUtxo.token.category,
          },
        })
        .addOutput({
          to: wallet.tokenAddress,
          amount: 1000n,
          token: {
            amount: buyAmount,
            category: tokenUtxo.token.category,
          },
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
            Available: {currentSupply.toLocaleString()}
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
          {[100, 1000, 10000].map((q) => (
            <button
              key={q}
              onClick={() => setAmount(String(Math.min(q, currentSupply)))}
              className="bg-surface-2 border border-border rounded-lg px-2.5 py-1 text-[11px] text-text-muted hover:text-text-secondary hover:border-border-hover transition-all duration-200"
            >
              {q.toLocaleString()}
            </button>
          ))}
          <button
            onClick={() => setAmount(String(currentSupply))}
            className="bg-brand/10 border border-brand/20 rounded-lg px-2.5 py-1 text-[11px] text-brand hover:bg-brand/15 transition-all duration-200"
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
