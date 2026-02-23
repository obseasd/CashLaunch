"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

export interface WalletState {
  mnemonic: string;
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  pubkeyHash: Uint8Array;
  address: string;
  tokenAddress: string;
}

interface WalletContextType {
  wallet: WalletState | null;
  connect: (mnemonic?: string) => Promise<void> | void;
  disconnect: () => void;
  isConnected: boolean;
}

const WalletContext = createContext<WalletContextType>({
  wallet: null,
  connect: () => {},
  disconnect: () => {},
  isConnected: false,
});

async function deriveWallet(mnemonic: string): Promise<WalletState> {
  const libauth = await import("@bitauth/libauth");
  const {
    deriveHdPrivateNodeFromSeed,
    deriveHdPath,
    deriveSeedFromBip39Mnemonic,
    secp256k1,
    encodeCashAddress,
    hash160,
    CashAddressType,
  } = libauth;

  const seedBytes = deriveSeedFromBip39Mnemonic(mnemonic);
  if (typeof seedBytes === "string") throw new Error(`Invalid mnemonic: ${seedBytes}`);

  const rootNode = deriveHdPrivateNodeFromSeed(seedBytes);
  const node = deriveHdPath(rootNode, "m/44'/0'/0'/0/0");
  if (typeof node === "string") throw new Error(`HD derivation failed: ${node}`);

  const privateKey = node.privateKey;
  const publicKey = secp256k1.derivePublicKeyCompressed(privateKey);
  if (typeof publicKey === "string") throw new Error(`Public key derivation failed: ${publicKey}`);

  const pkh = hash160(publicKey);

  const addressResult = encodeCashAddress({
    prefix: "bchtest",
    type: CashAddressType.p2pkh,
    payload: pkh,
  });
  const tokenAddressResult = encodeCashAddress({
    prefix: "bchtest",
    type: CashAddressType.p2pkhWithTokens,
    payload: pkh,
  });

  return {
    mnemonic,
    privateKey,
    publicKey,
    pubkeyHash: pkh,
    address: addressResult.address,
    tokenAddress: tokenAddressResult.address,
  };
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<WalletState | null>(null);

  // Restore wallet from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("cashlaunch_mnemonic");
    if (saved) {
      deriveWallet(saved)
        .then(setWallet)
        .catch(() => localStorage.removeItem("cashlaunch_mnemonic"));
    }
  }, []);

  const connect = useCallback(async (mnemonic?: string) => {
    const libauth = await import("@bitauth/libauth");
    const seed = mnemonic || libauth.generateBip39Mnemonic();
    const w = await deriveWallet(seed);
    localStorage.setItem("cashlaunch_mnemonic", seed);
    setWallet(w);
  }, []);

  const disconnect = useCallback(() => {
    localStorage.removeItem("cashlaunch_mnemonic");
    setWallet(null);
  }, []);

  return (
    <WalletContext.Provider
      value={{ wallet, connect, disconnect, isConnected: !!wallet }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
