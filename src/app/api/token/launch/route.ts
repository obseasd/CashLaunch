import { NextRequest, NextResponse } from "next/server";
import { TestNetWallet, TokenSendRequest, DefaultProvider } from "mainnet-js";

// Configure chipnet Electrum servers
DefaultProvider.servers.testnet = [
  "wss://chipnet.imaginary.cash:50004",
  "wss://chipnet.bch.ninja:50004",
];

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const times: Record<string, number> = {};

  try {
    const { mnemonic, supply, contractTokenAddress, step, categoryId } = await req.json();

    if (!mnemonic) {
      return NextResponse.json({ error: "Missing mnemonic" }, { status: 400 });
    }

    // If step=diagnostic, just test connectivity and return timings
    if (step === "diagnostic") {
      const wallet = await TestNetWallet.fromSeed(mnemonic);
      times.wallet = Date.now() - t0;
      const balance = await wallet.getBalance();
      times.balance = Date.now() - t0;
      return NextResponse.json({ ok: true, times, balance: balance?.toString(), total: Date.now() - t0 });
    }

    const wallet = await TestNetWallet.fromSeed(mnemonic);
    times.wallet = Date.now() - t0;

    // STEP 2: Fund the contract (send tokens)
    if (step === "fund" && categoryId) {
      const tokenBalance = await wallet.getTokenBalance(categoryId);
      times.getBalance = Date.now() - t0;

      if (tokenBalance <= 0n) {
        return NextResponse.json(
          { error: "No tokens found. Genesis may still be propagating — retry in a few seconds.", times },
          { status: 400 }
        );
      }

      const fundResult = await wallet.send([
        new TokenSendRequest({
          cashaddr: contractTokenAddress,
          amount: tokenBalance,
          category: categoryId,
        }),
      ]);
      times.fund = Date.now() - t0;

      return NextResponse.json({
        fundTxId: fundResult.txId,
        tokensSent: tokenBalance.toString(),
        times,
        total: Date.now() - t0,
      });
    }

    // STEP 1: Genesis (create token)
    if (!supply) {
      return NextResponse.json({ error: "Missing supply" }, { status: 400 });
    }

    const balance = await wallet.getBalance();
    times.balance = Date.now() - t0;

    if (!balance) {
      return NextResponse.json(
        { error: `Wallet has no tBCH. Fund from tbch.googol.cash — Address: ${wallet.cashaddr}` },
        { status: 400 }
      );
    }

    // Consolidate only if multiple UTXOs
    const utxos = await wallet.getUtxos();
    times.utxos = Date.now() - t0;
    const bchUtxos = utxos.filter((u: { token?: unknown }) => !u.token);

    if (bchUtxos.length > 1) {
      try {
        await wallet.sendMax(wallet.cashaddr!);
        times.sendMax = Date.now() - t0;
        await new Promise((r) => setTimeout(r, 1500));
      } catch {
        // continue
      }
    }

    // Token genesis
    const genesisResult = await wallet.tokenGenesis({
      cashaddr: wallet.tokenaddr!,
      amount: BigInt(supply),
    });
    times.genesis = Date.now() - t0;

    const genCategoryId = genesisResult.categories![0];
    const genesisTxId = genesisResult.txId!;

    return NextResponse.json({
      categoryId: genCategoryId,
      genesisTxId,
      address: wallet.cashaddr,
      tokenAddress: wallet.tokenaddr,
      times,
      total: Date.now() - t0,
    });
  } catch (err) {
    times.error = Date.now() - t0;
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message, times, total: Date.now() - t0 }, { status: 500 });
  }
}
