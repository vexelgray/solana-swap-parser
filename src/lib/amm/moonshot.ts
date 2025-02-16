import { PublicKey, PartiallyDecodedInstruction } from '@solana/web3.js';
import { BN } from 'bn.js';
import { ParsedTransactionWithMeta } from '@solana/web3.js';
import { AmmParser, getTransactionAccounts } from './base';
import { AmmType, PROGRAM_IDS, SwapInfo } from '../types';
import { SwapState } from '../state';
import { parseU64 } from '../utils';

export enum MoonshotInstructionType {
  Swap = 1,
}

export interface MoonshotSwapLayout {
  instruction: number; // u8
  amountIn: BN; // u64
  minAmountOut: BN; // u64
}

export interface MoonshotSwapAccounts {
  tokenProgram: PublicKey;
  pool: PublicKey;
  poolAuthority: PublicKey;
  sourceTokenAccount: PublicKey;
  destTokenAccount: PublicKey;
  userSourceTokenAccount: PublicKey;
  userDestTokenAccount: PublicKey;
  userAuthority: PublicKey;
}

export interface MoonshotPoolInfo {
  address: PublicKey;
  tokenA: PublicKey;
  tokenB: PublicKey;
  vaultA: PublicKey;
  vaultB: PublicKey;
  decimalsA: number;
  decimalsB: number;
}

export class MoonshotParser implements AmmParser {
  canParse(programId: string): boolean {
    return programId === PROGRAM_IDS.MOONSHOT;
  }

  async parse(transaction: ParsedTransactionWithMeta, programId: string): Promise<SwapInfo> {
    // 获取完整的账户列表
    const { accounts } = getTransactionAccounts(transaction);

    // 找到 Moonshot 的指令
    const swapIx = transaction.transaction.message.instructions.find(
      (ix) => 'programId' in ix && ix.programId.toString() === PROGRAM_IDS.MOONSHOT
    ) as PartiallyDecodedInstruction;

    if (!swapIx || !('data' in swapIx)) {
      throw new Error('找不到 swap 指令');
    }

    const data = Buffer.from(swapIx.data, 'base64');

    const amountIn = parseU64(data, 1);
    const minAmountOut = parseU64(data, 9);

    // 从交易的 message 中获取账户
    const accountIndexes = swapIx.accounts.map((acc: PublicKey) =>
      accounts.findIndex((key) => key === acc.toString())
    );

    if (accountIndexes.includes(-1)) {
      throw new Error('无法找到对应的账户');
    }

    // Moonshot 的账户布局：
    // 0: token program
    // 1: pool
    // 2: pool authority
    // 3: source token account
    // 4: dest token account
    // 5: user source token account
    // 6: user dest token account
    // 7: user authority
    const userSourceTokenAccount = new PublicKey(accounts[accountIndexes[5]]);
    const userDestTokenAccount = new PublicKey(accounts[accountIndexes[6]]);
    const userAuthority = new PublicKey(accounts[accountIndexes[7]]);

    // 从 token balances 中获取代币信息
    const preBalances = transaction.meta?.preTokenBalances || [];
    const postBalances = transaction.meta?.postTokenBalances || [];

    console.log('Pre token balances:', JSON.stringify(preBalances, null, 2));
    console.log('Post token balances:', JSON.stringify(postBalances, null, 2));

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
        };
      })
      .filter((change): change is NonNullable<typeof change> => change !== null);

    console.log('Balance changes:', balanceChanges);

    // 找到变化最大的两个账户
    balanceChanges.sort((a, b) => Number(b.change - a.change));

    const sourceBalance = preBalances.find(
      (b) => b.accountIndex === balanceChanges[1]?.accountIndex
    );
    const destBalance = preBalances.find((b) => b.accountIndex === balanceChanges[0]?.accountIndex);

    console.log('Source balance:', sourceBalance);
    console.log('Destination balance:', destBalance);

    if (!sourceBalance?.mint || !destBalance?.mint) {
      throw new Error('无法获取代币信息');
    }

    // 获取代币信息
    const [sourceToken, destToken] = await Promise.all([
      SwapState.getTokenInfo(sourceBalance.mint, sourceBalance.uiTokenAmount.decimals),
      SwapState.getTokenInfo(destBalance.mint, destBalance.uiTokenAmount.decimals),
    ]);

    return {
      Signers: [userAuthority.toString()],
      Signatures: [transaction.transaction.signatures[0]],
      AMMs: [AmmType.MOONSHOT],
      Timestamp: transaction.blockTime
        ? new Date(transaction.blockTime * 1000).toISOString()
        : new Date(0).toISOString(),
      TokenInMint: sourceToken.address,
      TokenInAmount: amountIn.toString(),
      TokenInDecimals: sourceToken.decimals,
      TokenOutMint: destToken.address,
      TokenOutAmount: minAmountOut.toString(),
      TokenOutDecimals: destToken.decimals,
    };
  }
}
