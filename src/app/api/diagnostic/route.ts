import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function GET() {
  const start = Date.now();
  const times: Record<string, number> = {};

  try {
    // Step 1: Import mainnet-js
    const { TestNetWallet, DefaultProvider } = await import("mainnet-js");
    times["1_import"] = Date.now() - start;

    // Step 2: Configure servers
    DefaultProvider.servers.testnet = [
      "wss://chipnet.imaginary.cash:50004",
      "wss://chipnet.bch.ninja:50004",
    ];
    times["2_config"] = Date.now() - start;

    // Step 3: Create wallet from seed (uses a dummy test mnemonic)
    const wallet = await TestNetWallet.fromSeed(
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
    );
    times["3_wallet"] = Date.now() - start;

    // Step 4: Get balance
    const balance = await wallet.getBalance();
    times["4_balance"] = Date.now() - start;

    // Step 5: Get UTXOs
    const utxos = await wallet.getUtxos();
    times["5_utxos"] = Date.now() - start;

    return NextResponse.json({
      ok: true,
      times,
      total_ms: Date.now() - start,
      balance: balance?.toString(),
      utxo_count: utxos?.length,
      address: wallet.cashaddr,
    });
  } catch (err) {
    times["error_at"] = Date.now() - start;
    return NextResponse.json({
      ok: false,
      times,
      total_ms: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}
