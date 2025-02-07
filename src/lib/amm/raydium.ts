import { PublicKey } from '@solana/web3.js';
import { BN } from 'bn.js';

// Raydium V4 指令标识
export enum RaydiumV4InstructionType {
  Swap = 9,
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
