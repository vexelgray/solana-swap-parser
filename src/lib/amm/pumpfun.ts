import { PublicKey, PartiallyDecodedInstruction } from '@solana/web3.js';
import { BN } from 'bn.js';
import { ParsedTransactionWithMeta } from '@solana/web3.js';
import { AmmParser, getTransactionAccounts } from './base';
import { AmmType, PROGRAM_IDS, SwapInfo } from '../types'
import { SwapState } from '../state';
import { parseU64 } from '../utils';
import { NATIVE_MINT } from '@solana/spl-token';

export enum PumpfunInstructionType {
  Swap = 1,
}

export interface PumpfunSwapLayout {
  instruction: number; // u8
  amountIn: BN; // u64
  minAmountOut: BN; // u64
}

export interface PumpfunSwapAccounts {
  tokenProgram: PublicKey;
  pool: PublicKey;
  poolAuthority: PublicKey;
  sourceTokenAccount: PublicKey;
  destTokenAccount: PublicKey;
  userSourceTokenAccount: PublicKey;
  userDestTokenAccount: PublicKey;
  userAuthority: PublicKey;
}

export interface PumpfunPoolInfo {
  address: PublicKey;
  tokenA: PublicKey;
  tokenB: PublicKey;
  vaultA: PublicKey;
  vaultB: PublicKey;
  decimalsA: number;
  decimalsB: number;
}

export class PumpfunParser implements AmmParser {
  canParse(programId: string): boolean {
    return programId === PROGRAM_IDS.PUMPFUN;
  }

  async parse(transaction: ParsedTransactionWithMeta, programId: string): Promise<SwapInfo> {
    // 获取完整的账户列表
    const { accounts } = getTransactionAccounts(transaction);

    // 找到 Pumpfun 的指令
    const swapIx = transaction.transaction.message.instructions.find(
      (ix) => 'programId' in ix && ix.programId.toString() === PROGRAM_IDS.PUMPFUN
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

    // 直接从指令的账户列表中获取用户账户
    const userSourceTokenAccount = swapIx.accounts[5];
    const userDestTokenAccount = swapIx.accounts[6];
    const userAuthority = swapIx.accounts[7];

    // 从 token balances 中获取代币信息
    const preBalances = transaction.meta?.preTokenBalances || [];
    const postBalances = transaction.meta?.postTokenBalances || [];

    // 获取源账户的代币信息
    const sourceBalance = preBalances.find((b) => b.accountIndex === accountIndexes[5]);

    // 获取池账户的代币信息
    const poolBalance = preBalances.find((b) => b.accountIndex === 1);

    if (!sourceBalance?.mint || !poolBalance?.mint) {
      throw new Error('无法找到代币信息');
    }

    if (!sourceBalance.owner || !poolBalance.owner) {
      throw new Error('无法找到代币所有者信息');
    }

    // 获取池账户的后余额
    const poolPostBalance = postBalances.find((b) => b.accountIndex === 1);

    if (!poolPostBalance) {
      throw new Error('无法找到池账户的后余额');
    }

    // 计算实际的输出金额
    const outputAmount =
      BigInt(poolPostBalance.uiTokenAmount.amount) - BigInt(poolBalance.uiTokenAmount.amount);

    // 创建交换信息
    return {
      Signers: [userAuthority.toString()],
      Signatures: [transaction.transaction.signatures[0]],
      AMMs: [AmmType.PUMPFUN],
      Timestamp: transaction.blockTime
        ? new Date(transaction.blockTime * 1000).toISOString()
        : new Date(0).toISOString(),
      Action: poolBalance.owner === NATIVE_MINT.toBase58() ? "buy" : "sell",
      TokenInMint: sourceBalance.owner,
      TokenInAmount: amountIn.toString(),
      TokenInDecimals: sourceBalance.uiTokenAmount.decimals,
      TokenOutMint: poolBalance.owner,
      TokenOutAmount: outputAmount.toString(),
      TokenOutDecimals: poolBalance.uiTokenAmount.decimals,
    };
  }
}
