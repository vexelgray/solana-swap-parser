import { PublicKey } from '@solana/web3.js';
import { BN } from 'bn.js';

export enum RaydiumCpmmInstructionType {
  Swap = 9,
}

export interface RaydiumCpmmSwapLayout {
  instruction: number; // u8
  amountIn: BN; // u64
  minAmountOut: BN; // u64
}

export interface RaydiumCpmmSwapAccounts {
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
