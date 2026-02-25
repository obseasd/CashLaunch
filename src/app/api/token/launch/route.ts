import { NextRequest, NextResponse } from "next/server";
import { TestNetWallet, TokenSendRequest, DefaultProvider } from "mainnet-js";

// Configure chipnet Electrum servers
DefaultProvider.servers.testnet = [
  "wss://chipnet.imaginary.cash:50004",
  "wss://chipnet.bch.ninja:50004",
];

export const maxDuration = 60;

// Step 1 or combined: handles genesis, optionally funds contract
export async function POST(req: NextRequest) {
  try {
    const { mnemonic, supply, contractTokenAddress, step, categoryId } = await req.json();

    if (!mnemonic) {
      return NextResponse.json({ error: "Missing mnemonic" }, { status: 400 });
    }

    const wallet = await TestNetWallet.fromSeed(mnemonic);

    // STEP 2: Fund the contract (send tokens)
    if (step === "fund" && categoryId) {
      const tokenBalance = await wallet.getTokenBalance(categoryId);
      if (tokenBalance <= 0n) {
        return NextResponse.json(
          { error: "No tokens found. Genesis may still be propagating — retry in a few seconds." },
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

      return NextResponse.json({
        fundTxId: fundResult.txId,
        tokensSent: tokenBalance.toString(),
      });
    }

    // STEP 1: Genesis (create token)
    if (!supply) {
      return NextResponse.json({ error: "Missing supply" }, { status: 400 });
    }

    const balance = await wallet.getBalance();
    if (!balance) {
      return NextResponse.json(
        {
          error: `Wallet has no tBCH. Fund from tbch.googol.cash — Address: ${wallet.cashaddr}`,
          address: wallet.cashaddr,
        },
        { status: 400 }
      );
    }

    // Consolidate UTXOs only if needed (multiple UTXOs)
    const utxos = await wallet.getUtxos();
    const bchUtxos = utxos.filter((u: { token?: unknown }) => !u.token);
    if (bchUtxos.length > 1) {
      try {
        await wallet.sendMax(wallet.cashaddr!);
        await new Promise((r) => setTimeout(r, 1500));
      } catch {
        // continue anyway
      }
    }

    // Token genesis
    const genesisResult = await wallet.tokenGenesis({
      cashaddr: wallet.tokenaddr!,
      amount: BigInt(supply),
    });

    const genCategoryId = genesisResult.categories![0];
    const genesisTxId = genesisResult.txId!;

    return NextResponse.json({
      categoryId: genCategoryId,
      genesisTxId,
      address: wallet.cashaddr,
      tokenAddress: wallet.tokenaddr,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
