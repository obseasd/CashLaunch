import {
  deriveHdPrivateNodeFromSeed,
  deriveHdPath,
  deriveSeedFromBip39Mnemonic,
  secp256k1,
  generateBip39Mnemonic,
  encodeCashAddress,
  hash160,
  CashAddressType,
} from '@bitauth/libauth';
import { SignatureTemplate } from 'cashscript';

export interface WalletInfo {
  mnemonic: string;
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  pubkeyHash: Uint8Array;
  address: string;
  tokenAddress: string;
}

export function createWallet(mnemonic?: string): WalletInfo {
  const seed = mnemonic || generateBip39Mnemonic();

  const seedBytes = deriveSeedFromBip39Mnemonic(seed);
  if (typeof seedBytes === 'string') {
    throw new Error(`Invalid mnemonic: ${seedBytes}`);
  }

  // deriveHdPrivateNodeFromSeed throws on invalid seed by default
  const rootNode = deriveHdPrivateNodeFromSeed(seedBytes);

  // m/44'/0'/0'/0/0 matches mainnet-js default derivation path
  const node = deriveHdPath(rootNode, "m/44'/0'/0'/0/0");
  if (typeof node === 'string') {
    throw new Error(`Failed to derive HD path: ${node}`);
  }

  const privateKey = node.privateKey;
  const publicKey = secp256k1.derivePublicKeyCompressed(privateKey);
  if (typeof publicKey === 'string') {
    throw new Error(`Failed to derive public key: ${publicKey}`);
  }

  const pkh = hash160(publicKey);

  // encodeCashAddress returns { address: string } with default throwErrors=true
  const addressResult = encodeCashAddress({
    prefix: 'bchtest',
    type: CashAddressType.p2pkh,
    payload: pkh,
  });

  const tokenAddressResult = encodeCashAddress({
    prefix: 'bchtest',
    type: CashAddressType.p2pkhWithTokens,
    payload: pkh,
  });

  return {
    mnemonic: seed,
    privateKey,
    publicKey,
    pubkeyHash: pkh,
    address: addressResult.address,
    tokenAddress: tokenAddressResult.address,
  };
}

export function getSignatureTemplate(privateKey: Uint8Array): SignatureTemplate {
  return new SignatureTemplate(privateKey);
}
