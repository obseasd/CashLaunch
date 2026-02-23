import { TestNetWallet, TokenSendRequest } from 'mainnet-js';

export interface TokenGenesisResult {
  txId: string;
  categoryId: string;
}

/**
 * Create a new CashToken (fungible) on chipnet using mainnet-js.
 * The token category ID equals the genesis transaction ID.
 */
export async function createToken(
  mnemonic: string,
  supply: bigint
): Promise<TokenGenesisResult> {
  const wallet = await TestNetWallet.fromSeed(mnemonic);

  const balance = await wallet.getBalance();
  console.log('Wallet address:', wallet.cashaddr);
  console.log('Wallet balance:', balance);

  const genesisResult = await wallet.tokenGenesis({
    cashaddr: wallet.tokenaddr!,
    amount: supply,
  });

  const txId = genesisResult.txId!;

  return {
    txId,
    categoryId: txId, // category = genesis txId
  };
}

/**
 * Send fungible tokens from wallet to a recipient address.
 */
export async function sendTokens(
  mnemonic: string,
  categoryId: string,
  toAddress: string,
  amount: bigint
): Promise<string> {
  const wallet = await TestNetWallet.fromSeed(mnemonic);

  const result = await wallet.send([
    new TokenSendRequest({
      cashaddr: toAddress,
      amount: amount,
      category: categoryId,
    }),
  ]);

  return result.txId!;
}
