import { NextRequest, NextResponse } from "next/server";
import { TestNetWallet, TokenSendRequest } from "mainnet-js";

export async function POST(req: NextRequest) {
  try {
    const { mnemonic, categoryId, contractTokenAddress, amount } =
      await req.json();

    if (!mnemonic || !categoryId || !contractTokenAddress || !amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const wallet = await TestNetWallet.fromSeed(mnemonic);

    // Send tokens + some BCH to the contract
    const result = await wallet.send([
      new TokenSendRequest({
        cashaddr: contractTokenAddress,
        amount: BigInt(amount),
        category: categoryId,
      }),
    ]);

    return NextResponse.json({
      txId: result.txId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
