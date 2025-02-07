import { PublicKey } from '@solana/web3.js';
import { BN } from 'bn.js';

export enum MeteoraInstructionType {
  Swap = 2,
}

export interface MeteoraSwapLayout {
  instruction: number; // u8
  amountIn: BN; // u64
  minAmountOut: BN; // u64
}

export interface MeteoraSwapAccounts {
  tokenProgram: PublicKey;
  pool: PublicKey;
  poolSigner: PublicKey;
  userSourceToken: PublicKey;
  userDestinationToken: PublicKey;
  sourceVault: PublicKey;
  destinationVault: PublicKey;
  factoryState: PublicKey;
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
