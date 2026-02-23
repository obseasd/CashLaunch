import { hexToBin, binToHex } from '@bitauth/libauth';

export { hexToBin, binToHex };

/** Convert satoshis to BCH display string */
export function satsToBch(sats: bigint | number): string {
  const val = typeof sats === 'bigint' ? sats : BigInt(sats);
  const bch = Number(val) / 1e8;
  return bch.toFixed(8);
}

/** Convert BCH to satoshis */
export function bchToSats(bch: number): bigint {
  return BigInt(Math.round(bch * 1e8));
}
