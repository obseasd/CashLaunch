"use client";

import { useState } from "react";
import { useWallet } from "@/context/WalletContext";

interface Props {
  basePrice: number;
  slope: number;
  currentSupply: number; // tokens in contract
  categoryId: string;
  onBuy?: (amount: number, txId: string) => void;
}

export default function BuyPanel({
  basePrice,
  slope,
  currentSupply,
  categoryId: _categoryId,
  onBuy,
}: Props) {
  const { wallet, isConnected } = useWallet();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [txId, setTxId] = useState("");

  const tokenAmount = parseInt(amount) || 0;

  // Calculate cost using the bonding curve formula
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
      // Dynamic import to avoid SSR issues with CashScript
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
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h3 className="font-semibold text-gray-100 mb-4">Buy Tokens</h3>

      {/* Amount input */}
      <div className="mb-4">
        <label className="text-xs text-gray-500 mb-1 block">
          Amount to buy
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          min="1"
          max={currentSupply}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-lg font-mono focus:outline-none focus:border-bch-green transition-colors"
        />
        <p className="text-xs text-gray-600 mt-1">
          Available: {currentSupply.toLocaleString()} tokens
        </p>
      </div>

      {/* Quick amounts */}
      <div className="flex gap-2 mb-4">
        {[10, 100, 1000].map((q) => (
          <button
            key={q}
            onClick={() => setAmount(String(Math.min(q, currentSupply)))}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg py-1.5 text-xs text-gray-400 hover:border-gray-600 hover:text-gray-200 transition-colors"
          >
            {q.toLocaleString()}
          </button>
        ))}
        <button
          onClick={() => setAmount(String(currentSupply))}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg py-1.5 text-xs text-gray-400 hover:border-gray-600 hover:text-gray-200 transition-colors"
        >
          MAX
        </button>
      </div>

      {/* Cost preview */}
      {tokenAmount > 0 && (
        <div className="bg-gray-800/50 rounded-lg p-3 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Cost</span>
            <span className="text-gray-200 font-mono">{cost.toLocaleString()} sats</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-400">BCH</span>
            <span className="text-gray-200 font-mono">{costBch.toFixed(8)} BCH</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-400">Avg price</span>
            <span className="text-gray-200 font-mono">
              {(cost / tokenAmount).toFixed(1)} sats/token
            </span>
          </div>
        </div>
      )}

      {/* Buy button */}
      {!isConnected ? (
        <p className="text-center text-sm text-gray-500 py-3">
          Connect wallet to buy
        </p>
      ) : (
        <button
          onClick={handleBuy}
          disabled={loading || tokenAmount <= 0}
          className="w-full bg-bch-green text-gray-950 font-semibold py-3 rounded-lg hover:bg-bch-green-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Sending transaction..." : `Buy ${tokenAmount || 0} tokens`}
        </button>
      )}

      {/* Status */}
      {error && (
        <p className="text-red-400 text-xs mt-3 break-all">{error}</p>
      )}
      {txId && (
        <div className="mt-3 p-3 bg-green-900/20 border border-green-800/30 rounded-lg">
          <p className="text-green-400 text-xs">Transaction sent!</p>
          <p className="text-green-300 text-xs font-mono mt-1 break-all">
            {txId}
          </p>
        </div>
      )}
    </div>
  );
}
