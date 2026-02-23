/**
 * CashLaunch Chipnet Integration Test
 *
 * Tests the full flow:
 * 1. Create wallet from mnemonic (or generate new)
 * 2. Create a CashToken via mainnet-js
 * 3. Send tokens to the bonding curve contract
 * 4. Execute a buy transaction on the bonding curve
 *
 * Prerequisites:
 * - Set MNEMONIC in .env (or one will be generated)
 * - Wallet must have chipnet BCH (use faucet: https://tbch4.googol.cash/)
 */

import 'dotenv/config';
import { createWallet } from '../src/lib/bch/wallet';
import { createToken, sendTokens } from '../src/lib/bch/tokens';
import { createBondingCurve, calculateBuyCost, buyTokens } from '../src/lib/bch/bonding-curve';
import { satsToBch } from '../src/lib/bch/utils';

async function main() {
  console.log('=== CashLaunch Chipnet Test ===\n');

  // Step 1: Create wallet
  const mnemonic = process.env.MNEMONIC;
  const wallet = createWallet(mnemonic);

  console.log('Wallet created:');
  console.log('  Mnemonic:', wallet.mnemonic);
  console.log('  Address:', wallet.address);
  console.log('  Token Address:', wallet.tokenAddress);
  console.log('  PubKeyHash:', Buffer.from(wallet.pubkeyHash).toString('hex'));
  console.log();

  if (!mnemonic) {
    console.log('⚠ No MNEMONIC in .env — generated a new wallet.');
    console.log('  Fund it with chipnet BCH from: https://tbch4.googol.cash/');
    console.log('  Then set MNEMONIC in .env and re-run this script.');
    return;
  }

  // Step 2: Create bonding curve contract
  const basePrice = 100n;   // 100 sats per token base price
  const slope = 1n;          // 1 sat increase per token
  const totalSupply = 1000n; // 1000 tokens

  const curve = createBondingCurve({
    creatorPkh: wallet.pubkeyHash,
    basePrice,
    slope,
  });

  console.log('Bonding Curve Contract:');
  console.log('  Address:', curve.address);
  console.log('  Token Address:', curve.tokenAddress);
  console.log('  Base Price:', basePrice.toString(), 'sats');
  console.log('  Slope:', slope.toString(), 'sats/token');
  console.log();

  // Check if contract already has tokens (from a previous run)
  const existingUtxos = await curve.contract.getUtxos();
  const existingTokenUtxo = existingUtxos.find(u => u.token);

  if (existingTokenUtxo) {
    console.log('Contract already has tokens from a previous run.');
    console.log('  Token Category:', existingTokenUtxo.token!.category);
    console.log('  Token Amount:', existingTokenUtxo.token!.amount.toString());
    console.log('  BCH Balance:', satsToBch(existingTokenUtxo.satoshis));
    console.log();

    // Try a buy
    await testBuy(curve, wallet, 10n);
    return;
  }

  // Step 3: Create token
  console.log('Creating token on chipnet...');
  const tokenResult = await createToken(wallet.mnemonic, totalSupply);
  console.log('Token created!');
  console.log('  TX ID:', tokenResult.txId);
  console.log('  Category ID:', tokenResult.categoryId);
  console.log();

  // Step 4: Send tokens to the bonding curve contract
  console.log('Sending tokens to bonding curve contract...');
  const fundTxId = await sendTokens(
    wallet.mnemonic,
    tokenResult.categoryId,
    curve.tokenAddress,
    totalSupply
  );
  console.log('Tokens sent to contract!');
  console.log('  TX ID:', fundTxId);
  console.log();

  // Wait a moment for the tx to propagate
  console.log('Waiting for transaction to propagate...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Step 5: Execute buy transaction
  await testBuy(curve, wallet, 10n);
}

async function testBuy(
  curve: ReturnType<typeof createBondingCurve>,
  wallet: ReturnType<typeof createWallet>,
  amount: bigint
) {
  // Verify contract state
  const utxos = await curve.contract.getUtxos();
  const tokenUtxo = utxos.find(u => u.token);

  if (!tokenUtxo || !tokenUtxo.token) {
    console.log('ERROR: No tokens found in contract. Fund it first.');
    return;
  }

  console.log('Contract state before buy:');
  console.log('  Tokens:', tokenUtxo.token.amount.toString());
  console.log('  BCH:', satsToBch(tokenUtxo.satoshis));

  // Calculate cost
  const cost = calculateBuyCost(
    tokenUtxo.token.amount,
    amount,
    curve.params.basePrice,
    curve.params.slope
  );
  console.log(`\nBuying ${amount} tokens...`);
  console.log(`  Estimated cost: ${cost} sats (${satsToBch(cost)} BCH)`);

  try {
    const buyTxId = await buyTokens(curve, wallet, amount);
    console.log('\nBuy successful!');
    console.log('  TX ID:', buyTxId);

    // Check final state
    const finalUtxos = await curve.contract.getUtxos();
    const finalTokenUtxo = finalUtxos.find(u => u.token);
    if (finalTokenUtxo?.token) {
      console.log('\nContract state after buy:');
      console.log('  Tokens:', finalTokenUtxo.token.amount.toString());
      console.log('  BCH:', satsToBch(finalTokenUtxo.satoshis));
    }
  } catch (err) {
    console.error('\nBuy failed:', err);
  }
}

main().catch(console.error);
