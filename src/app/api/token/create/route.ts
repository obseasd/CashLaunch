import { NextRequest, NextResponse } from "next/server";
import { TestNetWallet } from "mainnet-js";

export async function POST(req: NextRequest) {
  try {
    const { mnemonic, supply } = await req.json();

    if (!mnemonic || !supply) {
      return NextResponse.json(
        { error: "Missing mnemonic or supply" },
        { status: 400 }
      );
    }

    const wallet = await TestNetWallet.fromSeed(mnemonic);

    const balance = await wallet.getBalance();
    if (!balance) {
      return NextResponse.json(
        {
          error: `Wallet has no BCH. Fund it first: ${wallet.cashaddr}`,
          address: wallet.cashaddr,
        },
        { status: 400 }
      );
    }

    const genesisResult = await wallet.tokenGenesis({
      cashaddr: wallet.tokenaddr!,
      amount: BigInt(supply),
    });

    const txId = genesisResult.txId!;

    return NextResponse.json({
      categoryId: txId,
      txId,
      address: wallet.cashaddr,
      tokenAddress: wallet.tokenaddr,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
