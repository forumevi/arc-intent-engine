import { ethers } from 'ethers';
import { Intent, recordExecution, updateIntent } from '../db/intents.js';

// Arc Mainnet USDC ERC-20 precompile // arc-studio-allow-onchain-literal
const USDC_ADDRESS = '0x3600000000000000000000000000000000000000';
const USDC_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
];

function getProvider(): ethers.JsonRpcProvider {
  const rpcUrl = process.env.ARC_RPC_URL || 'https://rpc.mainnet.arc.io'; // arc-studio-allow-onchain-literal
  return new ethers.JsonRpcProvider(rpcUrl);
}

function getSigner(): ethers.Wallet {
  const privateKey = process.env.EXECUTOR_PRIVATE_KEY;
  if (!privateKey) throw new Error('EXECUTOR_PRIVATE_KEY not set');
  return new ethers.Wallet(privateKey, getProvider());
}

export async function getUSDCBalance(address: string): Promise<number> {
  const provider = getProvider();
  const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);
  const balance: bigint = await usdc.balanceOf(address);
  return Number(balance) / 1_000_000; // 6 decimals ERC-20 view
}

export async function executeTransfer(
  to: string,
  amountUsdc: number
): Promise<string> {
  const signer = getSigner();
  const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);
  const amountUnits = BigInt(Math.round(amountUsdc * 1_000_000));

  console.log(`[Executor] Sending ${amountUsdc} USDC to ${to}...`);
  const tx = await usdc.transfer(to, amountUnits);
  const receipt = await tx.wait();
  console.log(`[Executor] TX confirmed: ${receipt.hash} in block ${receipt.blockNumber}`);
  return receipt.hash;
}

export async function executeIntent(intent: Intent): Promise<void> {
  console.log(`[Executor] Executing intent ${intent.id} (${intent.type})`);

  try {
    if (intent.type === 'scheduled_transfer') {
      const { recipient, amount_usdc } = intent.parsed;
      if (!recipient || !amount_usdc) {
        throw new Error('Missing recipient or amount for scheduled transfer');
      }
      const txHash = await executeTransfer(recipient, amount_usdc);
      recordExecution(intent.id, txHash);

    } else if (intent.type === 'conditional_transfer') {
      const { condition_type, condition_threshold, condition_wallet, action_amount, action_recipient } = intent.parsed;
      if (!condition_threshold || !action_amount || !action_recipient) {
        throw new Error('Missing conditional transfer parameters');
      }

      const walletToCheck = condition_wallet || intent.owner;
      const balance = await getUSDCBalance(walletToCheck);
      console.log(`[Executor] Conditional check: ${walletToCheck} = ${balance} USDC, threshold = ${condition_threshold}`);

      const conditionMet =
        condition_type === 'balance_below'
          ? balance < condition_threshold
          : balance > condition_threshold;

      if (conditionMet) {
        const txHash = await executeTransfer(action_recipient, action_amount);
        recordExecution(intent.id, txHash);
        console.log(`[Executor] Conditional transfer triggered: ${txHash}`);
      } else {
        console.log(`[Executor] Condition not met, skipping ${intent.id}`);
      }
    }
  } catch (err: any) {
    console.error(`[Executor] Intent ${intent.id} failed:`, err.message);
    updateIntent(intent.id, { status: 'failed' });
  }
}
