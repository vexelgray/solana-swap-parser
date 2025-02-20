import { PublicKey, PartiallyDecodedInstruction } from '@solana/web3.js';
import { BN } from 'bn.js';
import { ParsedTransactionWithMeta } from '@solana/web3.js';
import { AmmParser, getTransactionAccounts } from './base';
import { AmmType, PROGRAM_IDS, SwapInfo } from '../types';
import { SwapState } from '../state';
import { parseU64 } from '../utils';
import { NATIVE_MINT } from '@solana/spl-token';

export enum MeteoraInstructionType {
  Swap = 1,
}

export interface MeteoraSwapLayout {
  instruction: number; // u8
  amountIn: BN; // u64
  minAmountOut: BN; // u64
}

export interface MeteoraSwapAccounts {
  tokenProgram: PublicKey;
  pool: PublicKey;
  poolAuthority: PublicKey;
  sourceTokenAccount: PublicKey;
  destTokenAccount: PublicKey;
  userSourceTokenAccount: PublicKey;
  userDestTokenAccount: PublicKey;
  userAuthority: PublicKey;
}

export interface MeteoraPoolInfo {
  address: PublicKey;
  tokenA: PublicKey;
  tokenB: PublicKey;
  vaultA: PublicKey;
  vaultB: PublicKey;
  decimalsA: number;
  decimalsB: number;
}

export class MeteoraParser implements AmmParser {
  canParse(programId: string): boolean {
    return (
      programId === PROGRAM_IDS.METEORA ||
      programId === 'HzwtjANeVzJPpnXTYt9MYMjVmkhTMfUyS8pJWqSRWLNr'
    );
  }

  async parse(transaction: ParsedTransactionWithMeta, programId: string): Promise<SwapInfo> {
    // 获取完整的账户列表
    const { accounts } = getTransactionAccounts(transaction);

    // 找到 Meteora 的指令
    const swapIx = transaction.transaction.message.instructions.find(
      (ix) =>
        'programId' in ix &&
        (ix.programId.toString() === PROGRAM_IDS.METEORA ||
          ix.programId.toString() === 'HzwtjANeVzJPpnXTYt9MYMjVmkhTMfUyS8pJWqSRWLNr')
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

    // Meteora 的账户布局：
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

    // 尝试从 token balances 中查找代币信息
    const sourceBalance = preBalances.find((b) => b.uiTokenAmount.amount !== '0');
    const destBalance = postBalances.find(
      (b) => b.uiTokenAmount.amount !== '0' && b.mint !== sourceBalance?.mint
    );

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
      AMMs: [AmmType.METEORA],
      Timestamp: transaction.blockTime
        ? new Date(transaction.blockTime * 1000).toISOString()
        : new Date(0).toISOString(),
      Action: destToken.address === NATIVE_MINT.toBase58() ? 'buy' : 'sell',
      TokenInMint: sourceToken.address,
      TokenInAmount: amountIn.toString(),
      TokenInDecimals: sourceToken.decimals,
      TokenOutMint: destToken.address,
      TokenOutAmount: minAmountOut.toString(),
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
