import { NextRequest, NextResponse } from "next/server";
import { TestNetWallet, TokenSendRequest, DefaultProvider } from "mainnet-js";

// Configure chipnet Electrum servers (multiple for redundancy)
DefaultProvider.servers.testnet = [
  "wss://chipnet.imaginary.cash:50004",
  "wss://chipnet.bch.ninja:50004",
];

export const maxDuration = 60; // Vercel serverless timeout

export async function POST(req: NextRequest) {
  try {
    const { mnemonic, supply, contractTokenAddress } = await req.json();

    if (!mnemonic || !supply || !contractTokenAddress) {
      return NextResponse.json(
        { error: "Missing mnemonic, supply, or contractTokenAddress" },
        { status: 400 }
      );
    }

    const wallet = await TestNetWallet.fromSeed(mnemonic);

    const balance = await wallet.getBalance();
    if (!balance) {
      return NextResponse.json(
        {
          error: `Wallet has no tBCH. Fund it from tbch.googol.cash — Address: ${wallet.cashaddr}`,
          address: wallet.cashaddr,
        },
        { status: 400 }
      );
    }

    // Step 1: Consolidate UTXOs — token genesis requires a UTXO at vout=0
    try {
      await wallet.sendMax(wallet.cashaddr!);
      await new Promise((r) => setTimeout(r, 2000));
    } catch {
      // May fail if already consolidated, continue
    }

    // Step 2: Token genesis
    const genesisResult = await wallet.tokenGenesis({
      cashaddr: wallet.tokenaddr!,
      amount: BigInt(supply),
    });

    // In CashTokens, the category ID is the txid of the consumed vout=0 UTXO,
    // NOT the genesis transaction itself. mainnet-js returns it in categories[0].
    const categoryId = genesisResult.categories![0];
    const genesisTxId = genesisResult.txId!;

    // Step 3: Wait for genesis tx to propagate in mempool
    await new Promise((r) => setTimeout(r, 3000));

    // Step 4: Send all tokens to the bonding curve contract
    const fundResult = await wallet.send([
      new TokenSendRequest({
        cashaddr: contractTokenAddress,
        amount: BigInt(supply),
        category: categoryId,
      }),
    ]);
    const fundTxId = fundResult.txId!;

    return NextResponse.json({
      categoryId,
      genesisTxId,
      fundTxId,
      address: wallet.cashaddr,
      tokenAddress: wallet.tokenaddr,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
