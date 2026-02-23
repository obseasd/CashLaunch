"use client";

import { useState } from "react";
import { useWallet } from "@/context/WalletContext";

interface Props {
  basePrice: number;
  slope: number;
  currentSupply: number;
  categoryId: string;
  onSell?: (amount: number, txId: string) => void;
}

export default function SellPanel({
  basePrice,
  slope,
  currentSupply,
  categoryId: _categoryId,
  onSell: _onSell,
}: Props) {
  const { isConnected } = useWallet();
  const [amount, setAmount] = useState("");
  const [loading] = useState(false);

  const tokenAmount = parseInt(amount) || 0;

  const newSupply = currentSupply + tokenAmount;
  const revenue =
    tokenAmount > 0
      ? tokenAmount * basePrice +
        (slope * tokenAmount * (2 * newSupply - tokenAmount)) / 2
      : 0;
  const revenueBch = revenue / 1e8;

  return (
    <div>
      {/* Amount input */}
      <div className="bg-surface-1 rounded-xl p-4 mb-2">
        <span className="text-xs text-text-muted">Amount to sell</span>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          min="1"
          className="w-full bg-transparent text-2xl font-mono text-text-primary placeholder:text-text-muted/40 focus:outline-none mt-1"
        />
      </div>

      {/* Revenue display */}
      <div className="bg-surface-1 rounded-xl p-4 mb-4">
        <span className="text-xs text-text-muted">You receive</span>
        <div className="flex items-baseline justify-between mt-1">
          <p className="text-2xl font-mono text-text-primary">
            {tokenAmount > 0 ? revenueBch.toFixed(8) : "0"}
          </p>
          <span className="text-sm text-text-muted font-medium">BCH</span>
        </div>
        {tokenAmount > 0 && (
          <p className="text-[11px] text-text-muted mt-1">
            {revenue.toLocaleString()} sats &middot; {(revenue / tokenAmount).toFixed(1)} sats/token avg
          </p>
        )}
      </div>

      {/* Sell button */}
      {!isConnected ? (
        <button
          disabled
          className="w-full bg-surface-2 text-text-muted font-semibold py-3.5 rounded-xl cursor-not-allowed text-sm"
        >
          Connect wallet
        </button>
      ) : (
        <button
          disabled={loading || tokenAmount <= 0}
          className="w-full bg-red-500/80 text-white font-semibold py-3.5 rounded-xl hover:bg-red-500 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Sending...
            </span>
          ) : tokenAmount > 0 ? (
            `Sell ${tokenAmount.toLocaleString()} tokens`
          ) : (
            "Enter amount"
          )}
        </button>
      )}
    </div>
  );
}
