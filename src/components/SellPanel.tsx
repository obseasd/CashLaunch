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
  categoryId,
  onSell,
}: Props) {
  const isDemo = categoryId.startsWith("demo-");
  const { wallet, isConnected } = useWallet();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [txId, setTxId] = useState("");

  const tokenAmount = parseInt(amount) || 0;

  // Revenue calculation: reverse of buy — integrating from currentSupply to (currentSupply + tokensReturned)
  const newSupply = currentSupply + tokenAmount;
  const revenue =
    tokenAmount > 0
      ? tokenAmount * basePrice +
        (slope * tokenAmount * (2 * newSupply - tokenAmount)) / 2
      : 0;
  const revenueBch = revenue / 1e8;

  const handleSell = async () => {
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
        [wallet.pubkeyHash, BigInt(basePrice), BigInt(slope)],
        { provider }
      );

      // Get contract's token UTXO
      const contractUtxos = await contract.getUtxos();
      const contractTokenUtxo = contractUtxos.find((u) => u.token);
      if (!contractTokenUtxo?.token)
        throw new Error("No tokens in contract");

      // Get user's token UTXOs
      const userUtxos = await provider.getUtxos(wallet.tokenAddress);
      const userTokenUtxo = userUtxos.find(
        (u) =>
          u.token &&
          u.token.category === contractTokenUtxo.token!.category &&
          u.token.amount >= BigInt(tokenAmount)
      );
      if (!userTokenUtxo?.token)
        throw new Error("You don't have enough tokens to sell");

      const sellAmount = BigInt(tokenAmount);
      const sellRefund =
        sellAmount * BigInt(basePrice) +
        (BigInt(slope) *
          sellAmount *
          (2n * contractTokenUtxo.token.amount + sellAmount)) /
          2n;

      // Ensure contract has enough BCH to pay the refund
      const minContractBalance = 1000n; // dust limit
      if (contractTokenUtxo.satoshis - sellRefund < minContractBalance)
        throw new Error("Contract doesn't have enough BCH for this sell");

      const signer = new SignatureTemplate(wallet.privateKey);
      const hasRemainingTokens = userTokenUtxo.token.amount > sellAmount;
      const txFee = 1000n;

      const tx = new TransactionBuilder({ provider })
        .addInput(contractTokenUtxo, contract.unlock.sell())
        .addInput(userTokenUtxo, signer.unlockP2PKH())
        // Contract output: more tokens, less BCH
        .addOutput({
          to: contract.tokenAddress,
          amount: contractTokenUtxo.satoshis - sellRefund,
          token: {
            amount: contractTokenUtxo.token.amount + sellAmount,
            category: contractTokenUtxo.token.category,
          },
        })
        // User BCH output: gets the refund
        .addOutput({
          to: wallet.address,
          amount:
            sellRefund +
            userTokenUtxo.satoshis -
            txFee -
            (hasRemainingTokens ? 1000n : 0n),
        });

      // Return remaining tokens if user had more than they sold
      if (hasRemainingTokens) {
        tx.addOutput({
          to: wallet.tokenAddress,
          amount: 1000n,
          token: {
            amount: userTokenUtxo.token.amount - sellAmount,
            category: userTokenUtxo.token.category,
          },
        });
      }

      const result = await tx.send();
      setTxId(result.txid);
      onSell?.(tokenAmount, result.txid);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

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
        <div className="flex gap-1.5 mt-3">
          {[100, 1000, 10000].map((q) => (
            <button
              key={q}
              onClick={() => setAmount(String(q))}
              className="bg-surface-2 border border-border rounded-lg px-2.5 py-1 text-[11px] text-text-muted hover:text-text-secondary hover:border-border-hover transition-all duration-200"
            >
              {q.toLocaleString()}
            </button>
          ))}
        </div>
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
          onClick={handleSell}
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

      {error && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-red-400 text-xs break-all">{error}</p>
        </div>
      )}
      {txId && (
        <div className="mt-3 p-3 bg-brand/10 border border-brand/20 rounded-xl">
          <p className="text-brand text-xs font-medium">Tokens sold!</p>
          <p className="text-brand/70 text-[11px] font-mono mt-1 break-all">{txId}</p>
        </div>
      )}
    </div>
  );
}
