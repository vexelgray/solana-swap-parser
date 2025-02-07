import { PublicKey } from '@solana/web3.js';
import { BN } from 'bn.js';

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
  authority: PublicKey;
  userSourceToken: PublicKey;
  userDestinationToken: PublicKey;
  sourceVault: PublicKey;
  destinationVault: PublicKey;
  poolState: PublicKey;
  userAuthority: PublicKey;
}

export interface PumpfunPoolInfo {
  address: PublicKey;
  baseToken: PublicKey;
  quoteToken: PublicKey;
  baseVault: PublicKey;
  quoteVault: PublicKey;
  baseDecimals: number;
  quoteDecimals: number;
}
