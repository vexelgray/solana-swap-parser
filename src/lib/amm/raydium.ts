import { PublicKey, PartiallyDecodedInstruction } from '@solana/web3.js';
import { BN } from 'bn.js';
import { ParsedTransactionWithMeta } from '@solana/web3.js';
import { AmmParser, getTransactionAccounts } from './base';
import { AmmType, PROGRAM_IDS, SwapInfo } from '../types';
import { SwapState } from '../state';
import { parseU64 } from '../utils';
import { NATIVE_MINT } from '@solana/spl-token';

// Raydium V4 指令标识
export enum RaydiumV4InstructionType {
  Swap = 1,
}

// Raydium V4 Swap指令数据布局
export interface RaydiumV4SwapLayout {
  instruction: number; // u8
  amountIn: BN; // u64
  minAmountOut: BN; // u64
}

// Raydium V4 Swap账户布局
export interface RaydiumV4SwapAccounts {
  tokenProgram: PublicKey;
  amm: PublicKey;
  ammAuthority: PublicKey;
  ammOpenOrders: PublicKey;
  poolCoinTokenAccount: PublicKey;
  poolPcTokenAccount: PublicKey;
  serumProgram: PublicKey;
  serumMarket: PublicKey;
  serumBids: PublicKey;
  serumAsks: PublicKey;
  serumEventQueue: PublicKey;
  serumCoinVault: PublicKey;
  serumPcVault: PublicKey;
  serumVaultSigner: PublicKey;
  userSourceTokenAccount: PublicKey;
  userDestTokenAccount: PublicKey;
  userOwner: PublicKey;
}

// Raydium池信息
export interface RaydiumPoolInfo {
  id: PublicKey;
  baseMint: PublicKey;
  quoteMint: PublicKey;
  lpMint: PublicKey;
  baseDecimals: number;
  quoteDecimals: number;
  lpDecimals: number;
}

export class RaydiumParser implements AmmParser {
  canParse(programId: string): boolean {
    return programId === PROGRAM_IDS.RAYDIUM;
  }

  async parse(transaction: ParsedTransactionWithMeta, programId: string): Promise<SwapInfo> {
    // 获取完整的账户列表
    const { accounts } = getTransactionAccounts(transaction);

    // 找到 Raydium 的指令
    const swapIx = transaction.transaction.message.instructions.find(
      (ix) => 'programId' in ix && ix.programId.toString() === PROGRAM_IDS.RAYDIUM
    ) as PartiallyDecodedInstruction;

    if (!swapIx || !('data' in swapIx)) {
      throw new Error('找不到 swap 指令');
    }
    const poolId = swapIx.accounts[1].toBase58();
    const data = Buffer.from(swapIx.data, 'base64');

    // 从交易的 message 中获取账户
    const accountIndexes = swapIx.accounts.map((acc: PublicKey) =>
      accounts.findIndex((key) => key === acc.toString())
    );

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
    if (!sourceBalance) {
      throw new Error("No negative balance found");
    }

    let destBalance;

    // 1) If sourceBalance.mint is SOL => this is a BUY scenario
    if (sourceBalance.mint === NATIVE_MINT.toBase58()) {
      // find a positive change whose mint is NOT SOL
      destBalance = balanceChanges.find(
        (b) => b.change > 0n && b.mint !== NATIVE_MINT.toBase58()
      );

    // 2) If sourceBalance.mint is not SOL => this is a SELL scenario
    } else {
      // find a positive change whose mint IS SOL
      destBalance = balanceChanges.find(
        (b) => b.change > 0n && b.mint === NATIVE_MINT.toBase58()
      );
    }

    if (!destBalance) {
      throw new Error("Could not find a matching positive balance for this swap");
    }

    if (!sourceBalance?.mint || !destBalance?.mint) {
      throw new Error('无法获取代币信息');
    }

    // 获取代币信息
    const [sourceToken, destToken] = await Promise.all([
      SwapState.getTokenInfo(sourceBalance.mint, sourceBalance.decimals),
      SwapState.getTokenInfo(destBalance.mint, destBalance.decimals),
    ]);

    // 构建并返回 SwapInfo 对象
    return {
      Signers: [swapIx.accounts[17].toString()], // userOwner is at index 17
      Signatures: [transaction.transaction.signatures[0]],
      AMMs: [AmmType.RAYDIUM],
      Timestamp: transaction.blockTime
        ? new Date(transaction.blockTime * 1000).toISOString()
        : new Date(0).toISOString(),
      PoolId: poolId,
      Action: destToken.address === NATIVE_MINT.toBase58() ? 'buy' : 'sell',
      TokenInMint: sourceToken.address,
      TokenInAmount: (-sourceBalance.change).toString(),
      TokenInDecimals: sourceToken.decimals,
      TokenOutMint: destToken.address,
      TokenOutAmount: destBalance.change.toString(),
      TokenOutDecimals: destToken.decimals,
      TransactionData:{
        meta: transaction.meta, 
        slot: transaction.slot,
        transaction: transaction,
        version: transaction.version || 0,
        preTokenBalances: preBalances,
        postTokenBalances: postBalances,
        preBalances: transaction.meta?.preBalances,
        postBalances:transaction.meta?.postBalances
      }
    };
  }
}
