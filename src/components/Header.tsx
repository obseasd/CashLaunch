"use client";

import Link from "next/link";
import Image from "next/image";
import { useWallet } from "@/context/WalletContext";
import { useState } from "react";
import { usePathname } from "next/navigation";

export default function Header() {
  const { wallet, connect, disconnect, isConnected } = useWallet();
  const [showMnemonicInput, setShowMnemonicInput] = useState(false);
  const [mnemonicInput, setMnemonicInput] = useState("");
  const pathname = usePathname();

  const shortAddr = wallet
    ? `${wallet.address.slice(0, 14)}...${wallet.address.slice(-4)}`
    : "";

  const navLinks = [
    { href: "/", label: "Discover" },
    { href: "/launch", label: "Launch" },
  ];

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
          <div className="flex items-center gap-3">
            {isConnected ? (
              <>
                <div className="hidden md:flex items-center gap-2 bg-surface-2 rounded-xl px-3 py-1.5">
                  <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                  <span className="text-xs text-text-secondary font-mono">
                    {shortAddr}
                  </span>
                </div>
                <button
                  onClick={disconnect}
                  className="text-xs text-text-muted hover:text-red-400 transition-colors px-2 py-1"
                >
                  Disconnect
                </button>
              </>
            ) : showMnemonicInput ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  connect(mnemonicInput.trim() || undefined);
                  setShowMnemonicInput(false);
                  setMnemonicInput("");
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={mnemonicInput}
                  onChange={(e) => setMnemonicInput(e.target.value)}
                  placeholder="Mnemonic (or blank for new)"
                  className="bg-surface-2 border border-border rounded-xl px-3 py-1.5 text-xs w-52 focus:border-brand transition-colors"
                  autoFocus
                />
                <button
                  type="submit"
                  className="bg-brand text-surface-0 px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-brand-light transition-colors"
                >
                  Go
                </button>
                <button
                  type="button"
                  onClick={() => setShowMnemonicInput(false)}
                  className="text-text-muted text-xs hover:text-text-secondary"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <button
                onClick={() => setShowMnemonicInput(true)}
                className="bg-brand text-surface-0 px-5 py-2 rounded-xl text-sm font-semibold hover:bg-brand-light transition-all duration-200 hover:shadow-[0_0_20px_rgba(18,200,159,0.2)]"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
