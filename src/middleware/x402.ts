import { Request, Response, NextFunction } from 'express';
import { ethers } from 'ethers';

const TRANSFER_EVENT_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const MIN_AMOUNT_USDC_UNITS = 1000n; // 0.001 USDC minimum (6 decimals, but we accept any transfer)

export async function x402Middleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const feeRecipient = (process.env.INTENT_FEE_RECIPIENT || '0x95773C1f40B82DD8D0529471f6A6016fdfE990Aa').toLowerCase();
  const paymentProof = req.headers['x-payment-proof'] as string;

  if (!paymentProof) {
    res.status(402).json({
      error: 'Payment Required',
      protocol: 'x402',
      amount_usdc: 0.001,
      recipient_address: feeRecipient,
      chain_id: 'arc-mainnet',
      message: 'Send 0.001 USDC on Arc Mainnet and include the tx hash in x-payment-proof header.',
    });
    return;
  }

  try {
    const rpcUrl = process.env.ARC_RPC_URL || 'https://rpc.mainnet.arc.io';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const receipt = await provider.getTransactionReceipt(paymentProof);

    if (!receipt || receipt.status !== 1) {
      res.status(402).json({ error: 'Payment Verification Failed', reason: 'Transaction not found or failed.' });
      return;
    }

    let valid = false;
    let paymentInfo: any = null;

    for (const log of receipt.logs) {
      if (log.topics?.[0] === TRANSFER_EVENT_TOPIC && log.topics.length >= 3) {
        const recipientInLog = '0x' + log.topics[2].slice(26).toLowerCase();
        if (recipientInLog === feeRecipient) {
          const rawAmount = BigInt(log.data);
          if (rawAmount >= MIN_AMOUNT_USDC_UNITS) {
            valid = true;
            paymentInfo = {
              transactionHash: receipt.hash,
              blockNumber: receipt.blockNumber,
              from: receipt.from,
              amountUSDC: Number(rawAmount) >= 1e12
                ? Number(rawAmount) / 1e18   // native 18-decimal log
                : Number(rawAmount) / 1e6,   // ERC-20 6-decimal log
            };
            break;
          }
        }
      }
    }

    if (!valid) {
      res.status(402).json({ error: 'Payment Verification Failed', reason: 'No valid USDC transfer found to fee recipient.' });
      return;
    }

    (req as any).paymentInfo = paymentInfo;
    next();
  } catch (err: any) {
    res.status(402).json({ error: 'Payment Verification Failed', reason: err.message });
  }
}
