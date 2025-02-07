import { PublicKey } from '@solana/web3.js';
import { BN } from 'bn.js';

export enum RaydiumRouteInstructionType {
  Swap = 9,
}

export interface RaydiumRouteSwapLayout {
  instruction: number; // u8
  amountIn: BN; // u64
  minAmountOut: BN; // u64
}

export interface RaydiumRouteSwapAccounts {
  tokenProgram: PublicKey;
  ammProgram: PublicKey;
  routeProgram: PublicKey;
  userSourceToken: PublicKey;
  userDestinationToken: PublicKey;
  ammSourceToken: PublicKey;
  ammDestinationToken: PublicKey;
  poolState: PublicKey;
  userAuthority: PublicKey;
  ammAuthority: PublicKey;
}
