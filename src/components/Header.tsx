"use client";

import Link from "next/link";
import { useWallet } from "@/context/WalletContext";
import { useState } from "react";

export default function Header() {
  const { wallet, connect, disconnect, isConnected } = useWallet();
  const [showMnemonicInput, setShowMnemonicInput] = useState(false);
  const [mnemonicInput, setMnemonicInput] = useState("");

  const shortAddr = wallet
    ? `${wallet.address.slice(0, 16)}...${wallet.address.slice(-6)}`
    : "";

  return (
    <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-bch-green flex items-center justify-center font-bold text-gray-950 text-sm">
              CL
            </div>
            <span className="font-bold text-lg hidden sm:block">
              Cash<span className="text-bch-green">Launch</span>
            </span>
          </Link>

          {/* Nav */}
          <nav className="flex items-center gap-6">
            <Link
              href="/"
              className="text-sm text-gray-400 hover:text-gray-100 transition-colors"
            >
              Discover
            </Link>
            <Link
              href="/launch"
              className="text-sm text-gray-400 hover:text-gray-100 transition-colors"
            >
              Launch
            </Link>

            {/* Wallet */}
            {isConnected ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 font-mono hidden md:block">
                  {shortAddr}
                </span>
                <div className="w-2 h-2 rounded-full bg-bch-green" />
                <button
                  onClick={disconnect}
                  className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {showMnemonicInput ? (
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
                      placeholder="Enter mnemonic or leave blank"
                      className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs w-48 focus:outline-none focus:border-bch-green"
                    />
                    <button
                      type="submit"
                      className="bg-bch-green text-gray-950 px-3 py-1 rounded text-xs font-semibold hover:bg-bch-green-light transition-colors"
                    >
                      Go
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowMnemonicInput(false)}
                      className="text-gray-500 text-xs hover:text-gray-300"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={() => setShowMnemonicInput(true)}
                    className="bg-bch-green text-gray-950 px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-bch-green-light transition-colors"
                  >
                    Connect Wallet
                  </button>
                )}
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
