"use client";

import Link from "next/link";
import Image from "next/image";
import { useWallet } from "@/context/WalletContext";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function Header() {
  const { wallet, connect, disconnect, isConnected } = useWallet();
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [mnemonicInput, setMnemonicInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const shortAddr = wallet
    ? `${wallet.address.slice(0, 14)}...${wallet.address.slice(-4)}`
    : "";

  // Fetch balance when wallet is connected
  useEffect(() => {
    if (!wallet) { setBalance(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const { ElectrumNetworkProvider } = await import("cashscript");
        const provider = new ElectrumNetworkProvider("chipnet");
        const utxos = await provider.getUtxos(wallet.address);
        const total = utxos
          .filter((u) => !u.token)
          .reduce((sum, u) => sum + u.satoshis, 0n);
        if (!cancelled) setBalance(Number(total));
      } catch {
        if (!cancelled) setBalance(null);
      }
    })();
    return () => { cancelled = true; };
  }, [wallet]);

  // Close modal on outside click
  useEffect(() => {
    if (!showConnectModal) return;
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setShowConnectModal(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showConnectModal]);

  const navLinks = [
    { href: "/", label: "Discover" },
    { href: "/launch", label: "Launch" },
  ];

  const balanceStr = balance !== null
    ? balance >= 1_000_000
      ? `${(balance / 1e8).toFixed(4)} BCH`
      : `${balance.toLocaleString()} sats`
    : null;

  return (
    <header className="border-b border-border bg-surface-0/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image
              src="/logo.png"
              alt="CashLaunch"
              width={32}
              height={32}
              className="rounded-full"
            />
            <span className="font-bold text-lg text-text-primary hidden sm:block">
              Cash<span className="text-brand">Launch</span>
            </span>
          </Link>

          {/* Center nav */}
          <nav className="flex items-center bg-surface-2 rounded-xl p-1 gap-0.5">
            {navLinks.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-surface-3 text-text-primary"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Wallet */}
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                {balanceStr && (
                  <span className="hidden md:block text-xs text-text-muted font-mono">
                    {balanceStr}
                  </span>
                )}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(wallet!.address);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  title={wallet!.address}
                  className="hidden md:flex items-center gap-2 bg-surface-2 rounded-xl px-3 py-1.5 hover:bg-surface-3 transition-colors cursor-pointer"
                >
                  <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                  <span className="text-xs text-text-secondary font-mono">
                    {copied ? "Copied!" : shortAddr}
                  </span>
                </button>
                <button
                  onClick={disconnect}
                  className="text-xs text-text-muted hover:text-red-400 transition-colors px-2 py-1"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowConnectModal(!showConnectModal)}
                  className="bg-brand text-surface-0 px-5 py-2 rounded-xl text-sm font-semibold hover:bg-brand-light transition-all duration-200 hover:shadow-[0_0_20px_rgba(18,200,159,0.2)]"
                >
                  Connect Wallet
                </button>

                {showConnectModal && (
                  <div
                    ref={modalRef}
                    className="absolute right-0 top-12 w-80 bg-surface-1 border border-border rounded-2xl p-5 shadow-2xl z-50"
                  >
                    <h3 className="text-sm font-bold text-text-primary mb-1">Connect to CashLaunch</h3>
                    <p className="text-[11px] text-text-muted mb-4">
                      A chipnet (testnet) wallet is created in your browser. No real funds needed.
                    </p>

                    <button
                      onClick={() => {
                        connect();
                        setShowConnectModal(false);
                      }}
                      className="w-full bg-brand text-surface-0 py-2.5 rounded-xl font-semibold text-sm hover:bg-brand-light transition-all mb-3"
                    >
                      Create New Wallet
                    </button>

                    <div className="relative mb-3">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-[10px]">
                        <span className="bg-surface-1 px-2 text-text-muted">or import existing</span>
                      </div>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (mnemonicInput.trim()) {
                          connect(mnemonicInput.trim());
                          setShowConnectModal(false);
                          setMnemonicInput("");
                        }
                      }}
                    >
                      <input
                        type="text"
                        value={mnemonicInput}
                        onChange={(e) => setMnemonicInput(e.target.value)}
                        placeholder="Enter 12-word mnemonic..."
                        className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-xs focus:border-brand transition-colors mb-2"
                      />
                      <button
                        type="submit"
                        disabled={!mnemonicInput.trim()}
                        className="w-full bg-surface-2 text-text-secondary py-2 rounded-xl text-xs font-medium hover:bg-surface-3 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Import Wallet
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Onboarding banner — shown when connected but no balance */}
      {isConnected && balance === 0 && (
        <div className="bg-amber-500/10 border-t border-amber-500/20 px-4 py-2.5">
          <div className="max-w-[1200px] mx-auto flex flex-wrap items-center gap-2 text-xs">
            <span className="text-amber-400 font-medium">Your wallet is empty.</span>
            <span className="text-text-muted">
              Get free testnet BCH from the faucet to start trading:
            </span>
            <a
              href="https://tbch.googol.cash/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand hover:text-brand-light font-medium underline underline-offset-2"
            >
              tbch.googol.cash
            </a>
            <button
              onClick={() => {
                navigator.clipboard.writeText(wallet!.address);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="ml-auto bg-surface-2 border border-border rounded-lg px-2.5 py-1 text-[11px] text-text-secondary hover:text-text-primary hover:border-border-hover transition-all"
            >
              {copied ? "Copied!" : "Copy address"}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
