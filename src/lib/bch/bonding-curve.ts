import { Contract, TransactionBuilder, SignatureTemplate } from 'cashscript';
import { compileFile } from 'cashc';
import { getProvider } from './provider';
import type { WalletInfo } from './wallet';

export interface BondingCurveParams {
  creatorPkh: Uint8Array;
  basePrice: bigint;  // sats per token (starting price)
  slope: bigint;      // price increase per token in sats
}

export interface BondingCurveInstance {
  contract: Contract;
  address: string;
  tokenAddress: string;
  params: BondingCurveParams;
}

// Cache compiled artifacts
let bondingCurveArtifact: ReturnType<typeof compileFile> | null = null;
let tokenSaleArtifact: ReturnType<typeof compileFile> | null = null;

function getBondingCurveArtifact() {
  if (!bondingCurveArtifact) {
    bondingCurveArtifact = compileFile(
      new URL('../../../contracts/BondingCurve.cash', import.meta.url)
    );
  }
  return bondingCurveArtifact;
}

function getTokenSaleArtifact() {
  if (!tokenSaleArtifact) {
    tokenSaleArtifact = compileFile(
      new URL('../../../contracts/TokenSale.cash', import.meta.url)
    );
  }
  return tokenSaleArtifact;
}

/**
 * Instantiate a BondingCurve contract.
 */
export function createBondingCurve(params: BondingCurveParams): BondingCurveInstance {
  const artifact = getBondingCurveArtifact();
  const provider = getProvider();

  const contract = new Contract(
    artifact,
    [params.creatorPkh, params.basePrice, params.slope],
    { provider }
  );

  return {
    contract,
    address: contract.address,
    tokenAddress: contract.tokenAddress,
    params,
  };
}

/**
 * Instantiate a TokenSale (fixed price) contract.
 */
export function createTokenSale(creatorPkh: Uint8Array, pricePerToken: bigint) {
  const artifact = getTokenSaleArtifact();
  const provider = getProvider();

  const contract = new Contract(
    artifact,
    [creatorPkh, pricePerToken],
    { provider }
  );

  return {
    contract,
    address: contract.address,
    tokenAddress: contract.tokenAddress,
  };
}

/**
 * Calculate the cost to buy `tokenAmount` tokens from the bonding curve.
 * Uses the same formula as the contract:
 *   cost = tokensBought * basePrice + slope * tokensBought * (2*currentSupply - tokensBought) / 2
 *
 * @param currentSupply - tokens currently held by the contract
 * @param tokenAmount - number of tokens to buy
 * @param basePrice - base price per token in sats
 * @param slope - price slope in sats per token
 */
export function calculateBuyCost(
  currentSupply: bigint,
  tokenAmount: bigint,
  basePrice: bigint,
  slope: bigint
): bigint {
  return tokenAmount * basePrice
    + slope * tokenAmount * (2n * currentSupply - tokenAmount) / 2n;
}

/**
 * Buy tokens from the bonding curve contract.
 * Uses TransactionBuilder to construct the transaction.
 *
 * @returns transaction ID
 */
export async function buyTokens(
  instance: BondingCurveInstance,
  buyerWallet: WalletInfo,
  tokenAmount: bigint
): Promise<string> {
  const contractUtxos = await instance.contract.getUtxos();
  const tokenUtxo = contractUtxos.find(u => u.token);

  if (!tokenUtxo || !tokenUtxo.token) {
    throw new Error('No token UTXO found in contract. Has it been funded?');
  }

  const currentSupply = tokenUtxo.token.amount;
  if (tokenAmount > currentSupply) {
    throw new Error(
      `Not enough tokens in contract. Available: ${currentSupply}, requested: ${tokenAmount}`
    );
  }

  const cost = calculateBuyCost(
    currentSupply,
    tokenAmount,
    instance.params.basePrice,
    instance.params.slope
  );

  const remainingTokens = currentSupply - tokenAmount;
  const category = tokenUtxo.token.category;
  const contractOutputValue = tokenUtxo.satoshis + cost;

  const provider = getProvider();

  const tx = new TransactionBuilder({ provider })
    .addInput(tokenUtxo, instance.contract.unlock.buy())
    .addOutput({
      to: instance.contract.tokenAddress,
      amount: contractOutputValue,
      token: {
        amount: remainingTokens,
        category,
      },
    })
    .addOutput({
      to: buyerWallet.tokenAddress,
      amount: 1000n,
      token: {
        amount: tokenAmount,
        category,
      },
    });

  const result = await tx.send();
  return result.txid;
}

/**
 * Creator withdraws all BCH + remaining tokens from the contract.
 *
 * @returns transaction ID
 */
export async function withdrawFromContract(
  instance: BondingCurveInstance,
  creatorWallet: WalletInfo
): Promise<string> {
  const contractUtxos = await instance.contract.getUtxos();
  const tokenUtxo = contractUtxos.find(u => u.token);

  if (!tokenUtxo) {
    throw new Error('No UTXO found in contract');
  }

  const sigTemplate = new SignatureTemplate(creatorWallet.privateKey);
  const provider = getProvider();

  const tx = new TransactionBuilder({ provider })
    .addInput(tokenUtxo, instance.contract.unlock.withdraw(creatorWallet.publicKey, sigTemplate))
    .addOutput({
      to: creatorWallet.tokenAddress,
      amount: tokenUtxo.satoshis,
      token: tokenUtxo.token ? {
        amount: tokenUtxo.token.amount,
        category: tokenUtxo.token.category,
      } : undefined,
    });

  const result = await tx.send();
  return result.txid;
}
