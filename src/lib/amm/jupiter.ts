import { PublicKey, PartiallyDecodedInstruction } from '@solana/web3.js';
import { BN } from 'bn.js';
import { ParsedTransactionWithMeta } from '@solana/web3.js';
import { AmmParser, getTransactionAccounts } from './base';
import { AmmType, PROGRAM_IDS, SwapInfo } from '../types';
import { SwapState } from '../state';

export enum JupiterInstructionType {
  Swap = 1,
  SwapV2 = 2,
}

export interface JupiterSwapLayout {
  instruction: number; // u8
  amountIn: BN; // u64
  minAmountOut: BN; // u64
  platformFeeBps: number; // u8
}

export interface JupiterSwapAccounts {
  tokenProgram: PublicKey;
  userTransferAuthority: PublicKey;
  sourceTokenAccount: PublicKey;
  destinationTokenAccount: PublicKey;
  userSourceTokenAccount: PublicKey;
  userDestinationTokenAccount: PublicKey;
  swapProgram: PublicKey;
  swapState: PublicKey;
  swapAuthority: PublicKey;
}

export class JupiterParser implements AmmParser {
  canParse(programId: string): boolean {
    return programId === PROGRAM_IDS.JUPITER;
  }

  async parse(transaction: ParsedTransactionWithMeta, programId: string): Promise<SwapInfo> {
    // 获取完整的账户列表
    const { accounts } = getTransactionAccounts(transaction);

    // 获取代币余额变化
    const preBalances = transaction.meta?.preTokenBalances || [];
    const postBalances = transaction.meta?.postTokenBalances || [];

    // 找到用户的代币账户变化
    const tokenChanges = new Map<
      string,
      {
        preAmount: string;
        postAmount: string;
        mint: string;
        decimals: number;
      }
    >();

    // 记录所有前余额
    for (const pre of preBalances) {
      tokenChanges.set(pre.mint, {
        preAmount: pre.uiTokenAmount.amount,
        postAmount: '0',
        mint: pre.mint,
        decimals: pre.uiTokenAmount.decimals,
      });
    }

    // 更新后余额
    for (const post of postBalances) {
      const existing = tokenChanges.get(post.mint);
      if (existing) {
        existing.postAmount = post.uiTokenAmount.amount;
      } else {
        tokenChanges.set(post.mint, {
          preAmount: '0',
          postAmount: post.uiTokenAmount.amount,
          mint: post.mint,
          decimals: post.uiTokenAmount.decimals,
        });
      }
    }

    // 计算变化并找到输入输出代币
    const changes = Array.from(tokenChanges.entries()).map(([mint, data]) => {
      const change = BigInt(data.postAmount) - BigInt(data.preAmount);
      return {
        mint,
        change,
        decimals: data.decimals,
        absChange: change < 0n ? -change : change,
      };
    });

    // 按变化的绝对值排序
    changes.sort((a, b) => Number(b.absChange - a.absChange));

    const inToken = changes.find((c) => c.change < 0n);
    const outToken = changes.find((c) => c.change > 0n);

    if (!inToken || !outToken) {
      throw new Error('无法确定交易代币');
    }

    // 获取用户账户
    const accountKey = transaction.transaction.message.accountKeys[0];
    const userAuthority =
      typeof accountKey === 'string' ? accountKey : accountKey.pubkey.toString();

    // 获取代币信息
    const [sourceToken, destToken] = await Promise.all([
      SwapState.getTokenInfo(inToken.mint, inToken.decimals),
      SwapState.getTokenInfo(outToken.mint, outToken.decimals),
    ]);

    return {
      Signers: [userAuthority],
      Signatures: [transaction.transaction.signatures[0]],
      AMMs: [AmmType.JUPITER],
      Timestamp: transaction.blockTime
        ? new Date(transaction.blockTime * 1000).toISOString()
        : new Date(0).toISOString(),
      TokenInMint: sourceToken.address,
      TokenInAmount: (-inToken.change).toString(),
      TokenInDecimals: inToken.decimals,
      TokenOutMint: destToken.address,
      TokenOutAmount: outToken.change.toString(),
      TokenOutDecimals: outToken.decimals,
    };
  }
}
