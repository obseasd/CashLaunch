"use client";

import { useState } from "react";
import { useWallet } from "@/context/WalletContext";

interface Props {
  basePrice: number;
  slope: number;
  currentSupply: number; // tokens in contract
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

  // Sell returns BCH: reverse of buy cost
  // After selling, contract supply increases by tokenAmount
  const newSupply = currentSupply + tokenAmount;
  const revenue =
    tokenAmount > 0
      ? tokenAmount * basePrice +
        (slope * tokenAmount * (2 * newSupply - tokenAmount)) / 2
      : 0;
  const revenueBch = revenue / 1e8;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h3 className="font-semibold text-gray-100 mb-4">Sell Tokens</h3>

      {/* Amount input */}
      <div className="mb-4">
        <label className="text-xs text-gray-500 mb-1 block">
          Amount to sell
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          min="1"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-lg font-mono focus:outline-none focus:border-red-400 transition-colors"
        />
      </div>

      {/* Revenue preview */}
      {tokenAmount > 0 && (
        <div className="bg-gray-800/50 rounded-lg p-3 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">You receive</span>
            <span className="text-gray-200 font-mono">{revenue.toLocaleString()} sats</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-400">BCH</span>
            <span className="text-gray-200 font-mono">{revenueBch.toFixed(8)} BCH</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-400">Avg price</span>
            <span className="text-gray-200 font-mono">
              {(revenue / tokenAmount).toFixed(1)} sats/token
            </span>
          </div>
        </div>
      )}

      {/* Sell button */}
      {!isConnected ? (
        <p className="text-center text-sm text-gray-500 py-3">
          Connect wallet to sell
        </p>
      ) : (
        <button
          disabled={loading || tokenAmount <= 0}
          className="w-full bg-red-500/80 text-white font-semibold py-3 rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Sell function coming soon"
        >
          {loading
            ? "Sending transaction..."
            : `Sell ${tokenAmount || 0} tokens`}
        </button>
      )}

      <p className="text-xs text-gray-600 text-center mt-2">
        Sell executes at current bonding curve price
      </p>
    </div>
  );
}
