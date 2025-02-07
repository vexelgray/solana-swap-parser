import { PublicKey } from '@solana/web3.js';
import { BN } from 'bn.js';

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
  tokenAuthority: PublicKey;
  whirlpool: PublicKey;
  tokenOwnerAccountA: PublicKey;
  tokenVaultA: PublicKey;
  tokenOwnerAccountB: PublicKey;
  tokenVaultB: PublicKey;
  tickArray0: PublicKey;
  tickArray1: PublicKey;
  tickArray2: PublicKey;
  oracle: PublicKey;
}

export interface OrcaPoolInfo {
  address: PublicKey;
  tokenA: PublicKey;
  tokenB: PublicKey;
  tokenADecimals: number;
  tokenBDecimals: number;
}
