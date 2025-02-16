import { PublicKey, PartiallyDecodedInstruction } from '@solana/web3.js';
import { BN } from 'bn.js';
import { ParsedTransactionWithMeta } from '@solana/web3.js';
import { AmmParser, getTransactionAccounts } from './base';
import { AmmType, PROGRAM_IDS, SwapInfo } from '../types';
import { SwapState } from '../state';
import { parseU64 } from '../utils';

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
    console.log('Accounts:', accounts);

    // 检查交易元数据
    console.log('Transaction meta:', {
      preTokenBalances: transaction.meta?.preTokenBalances,
      postTokenBalances: transaction.meta?.postTokenBalances,
      preBalances: transaction.meta?.preBalances,
      postBalances: transaction.meta?.postBalances,
      logMessages: transaction.meta?.logMessages,
      err: transaction.meta?.err,
    });

    // 找到 Raydium 的指令
    const swapIx = transaction.transaction.message.instructions.find(
      (ix) => 'programId' in ix && ix.programId.toString() === PROGRAM_IDS.RAYDIUM
    ) as PartiallyDecodedInstruction;

    if (!swapIx || !('data' in swapIx)) {
      throw new Error('找不到 swap 指令');
    }

    console.log('Found swap instruction:', swapIx);
    const data = Buffer.from(swapIx.data, 'base64');
    console.log('Instruction data:', data);

    // Updated offset positions for parsing amounts
    const amountIn = parseU64(data, 0);
    const minAmountOut = parseU64(data, 8);
    console.log('Parsed amounts:', {
      amountIn: amountIn.toString(),
      minAmountOut: minAmountOut.toString(),
    });

    // 从交易的 message 中获取账户
    const accountIndexes = swapIx.accounts.map((acc: PublicKey) =>
      accounts.findIndex((key) => key === acc.toString())
    );

    console.log('Account indexes mapping:', accountIndexes);
    console.log(
      'Swap instruction accounts:',
      swapIx.accounts.map((acc) => acc.toString())
    );

    if (accountIndexes.includes(-1)) {
      console.log('Account indexes:', accountIndexes);
      console.log('Account mapping failed. Trying alternative approach...');

      // 尝试直接使用账户列表中的索引
      const userSourceTokenAccount = swapIx.accounts[15];
      const userDestTokenAccount = swapIx.accounts[16];
      const userOwner = swapIx.accounts[17];

      console.log('User accounts from instruction:');
      console.log('Source:', userSourceTokenAccount.toString());
      console.log('Destination:', userDestTokenAccount.toString());
      console.log('Owner:', userOwner.toString());

      // 从 token balances 中获取代币信息
      const preBalances = transaction.meta?.preTokenBalances || [];
      const postBalances = transaction.meta?.postTokenBalances || [];

      console.log('Pre token balances:', JSON.stringify(preBalances, null, 2));
      console.log('Post token balances:', JSON.stringify(postBalances, null, 2));

      // 计算每个账户的余额变化
      const balanceChanges = preBalances.map((pre) => {
        const post = postBalances.find((p) => p.accountIndex === pre.accountIndex);
        if (!post) {
          console.log(`No post balance found for account index ${pre.accountIndex}`);
          return { accountIndex: pre.accountIndex, change: 0, mint: pre.mint };
        }

        const preAmount = parseFloat(pre.uiTokenAmount.amount);
        const postAmount = parseFloat(post.uiTokenAmount.amount);
        const change = Math.abs(postAmount - preAmount);

        console.log(`Balance change for account ${pre.accountIndex}:`, {
          mint: pre.mint,
          preAmount,
          postAmount,
          change,
        });

        return {
          accountIndex: pre.accountIndex,
          change,
          mint: pre.mint,
          decimals: pre.uiTokenAmount.decimals,
        };
      });

      // 按余额变化排序
      balanceChanges.sort((a, b) => b.change - a.change);
      console.log('Sorted balance changes:', JSON.stringify(balanceChanges, null, 2));

      // 使用变化最大的两个账户作为源和目标
      const sourceBalance = preBalances.find(
        (b) => b.accountIndex === balanceChanges[0]?.accountIndex
      );
      const destBalance = postBalances.find(
        (b) => b.accountIndex === balanceChanges[1]?.accountIndex
      );

      console.log('Selected token accounts:');
      console.log('Source balance:', JSON.stringify(sourceBalance, null, 2));
      console.log('Destination balance:', JSON.stringify(destBalance, null, 2));

      if (!sourceBalance?.mint || !destBalance?.mint) {
        console.log('Failed to find token balances. Source:', sourceBalance, 'Dest:', destBalance);
        throw new Error('无法获取代币信息');
      }

      // 获取代币信息
      const [sourceToken, destToken] = await Promise.all([
        SwapState.getTokenInfo(sourceBalance.mint, sourceBalance.uiTokenAmount.decimals),
        SwapState.getTokenInfo(destBalance.mint, destBalance.uiTokenAmount.decimals),
      ]);

      return {
        Signers: [userOwner.toString()],
        Signatures: [transaction.transaction.signatures[0]],
        AMMs: [AmmType.RAYDIUM],
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

    // 如果账户索引映射成功，使用原来的逻辑
    const userSourceTokenAccount = new PublicKey(accounts[accountIndexes[15]]);
    const userDestTokenAccount = new PublicKey(accounts[accountIndexes[16]]);
    const userOwner = new PublicKey(accounts[accountIndexes[17]]);

    // 从 token balances 中获取代币信息
    const preBalances = transaction.meta?.preTokenBalances || [];
    const postBalances = transaction.meta?.postTokenBalances || [];

    // 从账户列表中获取 pool token accounts
    const poolAccounts = swapIx.accounts.slice(5, 7); // pool coin and pc accounts

    // 尝试多种方式获取代币信息
    let sourceMint: string | undefined;
    let destMint: string | undefined;
    let sourceDecimals: number | undefined;
    let destDecimals: number | undefined;

    // 方法1: 从 token balances 中查找用户账户
    const sourceBalance = preBalances.find(
      (balance) =>
        balance.accountIndex === accountIndexes[5] || balance.accountIndex === accountIndexes[6]
    );
    const destBalance = preBalances.find(
      (balance) =>
        balance.accountIndex === accountIndexes[11] || balance.accountIndex === accountIndexes[12]
    );

    console.log('Found token balances:');
    console.log('Source balance:', sourceBalance);
    console.log('Destination balance:', destBalance);

    if (sourceBalance?.mint && destBalance?.mint) {
      sourceMint = sourceBalance.mint;
      destMint = destBalance.mint;
      sourceDecimals = sourceBalance.uiTokenAmount.decimals;
      destDecimals = destBalance.uiTokenAmount.decimals;
    }

    if (!sourceMint || !destMint) {
      console.log('Failed to find token information from balances');
      throw new Error('无法获取代币信息');
    }

    // 获取代币信息
    const [sourceToken, destToken] = await Promise.all([
      SwapState.getTokenInfo(sourceMint, sourceDecimals),
      SwapState.getTokenInfo(destMint, destDecimals),
    ]);

    // 确保我们有所有必需的信息
    if (!sourceToken || !destToken) {
      console.log('Failed to get token information');
      throw new Error('无法获取代币信息');
    }

    // 构建并返回 SwapInfo 对象
    const swapInfo: SwapInfo = {
      Signers: [userOwner.toString()],
      Signatures: [transaction.transaction.signatures[0]],
      AMMs: [AmmType.RAYDIUM],
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

    console.log('Successfully parsed swap info:', swapInfo);
    return swapInfo;
  }
}
