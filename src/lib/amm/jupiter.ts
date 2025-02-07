import { PublicKey } from '@solana/web3.js';
import { BN } from 'bn.js';

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
