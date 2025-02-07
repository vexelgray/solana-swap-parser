import { PublicKey } from '@solana/web3.js';
import { BN } from 'bn.js';

export enum RaydiumClInstructionType {
  Swap = 1,
}

export interface RaydiumClSwapLayout {
  instruction: number; // u8
  amountIn: BN; // u64
  minAmountOut: BN; // u64
  sqrtPriceLimit: BN; // u128
}

export interface RaydiumClSwapAccounts {
  tokenProgram: PublicKey;
  pool: PublicKey;
  poolState: PublicKey;
  inputTokenAccount: PublicKey;
  outputTokenAccount: PublicKey;
  inputVault: PublicKey;
  outputVault: PublicKey;
  observationState: PublicKey;
  owner: PublicKey;
  tickArray: PublicKey;
}
