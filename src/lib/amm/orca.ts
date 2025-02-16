import { PublicKey, PartiallyDecodedInstruction } from '@solana/web3.js';
import { BN } from 'bn.js';
import { ParsedTransactionWithMeta } from '@solana/web3.js';
import { AmmParser, getTransactionAccounts } from './base';
import { AmmType, PROGRAM_IDS, SwapInfo } from '../types';
import { SwapState } from '../state';
import { parseU64 } from '../utils';

export enum OrcaInstructionType {
  Swap = 1,
}

export interface OrcaSwapLayout {
  instruction: number; // u8
  amountIn: BN; // u64
  minAmountOut: BN; // u64
}

export interface OrcaSwapAccounts {
  tokenProgram: PublicKey;
  amm: PublicKey;
  ammAuthority: PublicKey;
  sourceTokenAccount: PublicKey;
  destTokenAccount: PublicKey;
  userSourceTokenAccount: PublicKey;
  userDestTokenAccount: PublicKey;
  userAuthority: PublicKey;
}

export interface OrcaPoolInfo {
  address: PublicKey;
  tokenA: PublicKey;
  tokenB: PublicKey;
  tokenADecimals: number;
  tokenBDecimals: number;
}

export class OrcaParser implements AmmParser {
  canParse(programId: string): boolean {
    return (
      programId === PROGRAM_IDS.ORCA ||
      programId === '8i97DHS9KPnG311fSY9yin4cyk9ZzkBjLXobyEFvtfKY' ||
      programId === '4ngnN8dA9sAf1sbz3m6qwquxbHkyzgXVpeTYcxKPtZuf'
    );
  }

  async parse(transaction: ParsedTransactionWithMeta, programId: string): Promise<SwapInfo> {
    // 获取完整的账户列表
    const { accounts } = getTransactionAccounts(transaction);

    // 找到 Orca 的指令
    const swapIx = transaction.transaction.message.instructions.find(
      (ix) =>
        'programId' in ix &&
        (ix.programId.toString() === PROGRAM_IDS.ORCA ||
          ix.programId.toString() === '8i97DHS9KPnG311fSY9yin4cyk9ZzkBjLXobyEFvtfKY' ||
          ix.programId.toString() === '4ngnN8dA9sAf1sbz3m6qwquxbHkyzgXVpeTYcxKPtZuf')
    ) as PartiallyDecodedInstruction;

    if (!swapIx || !('data' in swapIx)) {
      throw new Error('找不到 swap 指令');
    }

    // 从 token balances 中获取代币信息
    const preBalances = transaction.meta?.preTokenBalances || [];
    const postBalances = transaction.meta?.postTokenBalances || [];

    // 计算每个账户的余额变化
    const balanceChanges = preBalances
      .map((pre) => {
        const post = postBalances.find((p) => p.accountIndex === pre.accountIndex);
        if (!post) return null;

        const preAmount = BigInt(pre.uiTokenAmount.amount);
        const postAmount = BigInt(post.uiTokenAmount.amount);
        const change = postAmount - preAmount;

        return {
          accountIndex: pre.accountIndex,
          mint: pre.mint,
          owner: pre.owner,
          decimals: pre.uiTokenAmount.decimals,
          change,
          absChange: change < 0n ? -change : change,
          preAmount: pre.uiTokenAmount.amount,
          postAmount: post.uiTokenAmount.amount,
        };
      })
      .filter((change): change is NonNullable<typeof change> => change !== null)
      // 按变化的绝对值排序
      .sort((a, b) => Number(b.absChange - a.absChange));

    // 找到变化最大的两个账户，负变化为输入，正变化为输出
    const sourceBalance = balanceChanges.find((b) => b.change < 0n);
    const destBalance = balanceChanges.find((b) => b.change > 0n && b.mint !== sourceBalance?.mint);

    if (!sourceBalance?.mint || !destBalance?.mint) {
      throw new Error('无法获取代币信息');
    }

    // 获取代币信息
    const [sourceToken, destToken] = await Promise.all([
      SwapState.getTokenInfo(sourceBalance.mint, sourceBalance.decimals),
      SwapState.getTokenInfo(destBalance.mint, destBalance.decimals),
    ]);

    return {
      Signers: [swapIx.accounts[7].toString()], // userAuthority is at index 7
      Signatures: [transaction.transaction.signatures[0]],
      AMMs: [AmmType.ORCA],
      Timestamp: transaction.blockTime
        ? new Date(transaction.blockTime * 1000).toISOString()
        : new Date(0).toISOString(),
      TokenInMint: sourceToken.address,
      TokenInAmount: (-sourceBalance.change).toString(),
      TokenInDecimals: sourceToken.decimals,
      TokenOutMint: destToken.address,
      TokenOutAmount: destBalance.change.toString(),
      TokenOutDecimals: destToken.decimals,
    };
  }
}
