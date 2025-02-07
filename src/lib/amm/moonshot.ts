import { PublicKey } from '@solana/web3.js';
import { BN } from 'bn.js';

export enum MoonshotInstructionType {
  Swap = 1,
}

export interface MoonshotSwapLayout {
  instruction: number; // u8
  amountIn: BN; // u64
  minAmountOut: BN; // u64
  sqrtPriceLimit: BN; // u128
}

export interface MoonshotSwapAccounts {
  tokenProgram: PublicKey;
  pool: PublicKey;
  poolState: PublicKey;
  inputTokenAccount: PublicKey;
  outputTokenAccount: PublicKey;
  inputVault: PublicKey;
  outputVault: PublicKey;
  lastObservationState: PublicKey;
  owner: PublicKey;
}

export interface MoonshotPoolInfo {
  address: PublicKey;
  token0: PublicKey;
  token1: PublicKey;
  vault0: PublicKey;
  vault1: PublicKey;
  decimals0: number;
  decimals1: number;
}
