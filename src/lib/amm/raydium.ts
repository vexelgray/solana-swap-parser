import { PublicKey, PartiallyDecodedInstruction, ParsedInstruction, TokenBalance } from '@solana/web3.js';
import { BN } from 'bn.js';
import { ParsedTransactionWithMeta } from '@solana/web3.js';
import { AmmParser, getTransactionAccounts } from './base';
import { AmmType, PROGRAM_IDS, SwapInfo, TokenInfo } from '../types';
import { SwapState } from '../state';
import { parseU64 } from '../utils';
import { NATIVE_MINT } from '@solana/spl-token';

// Raydium V4 指令标识
export enum RaydiumV4InstructionType {
  Swap = 1,
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

export class RaydiumParser implements AmmParser {
  canParse(programId: string): boolean {
    return programId === PROGRAM_IDS.RAYDIUM;
  }

  async parse(transaction: ParsedTransactionWithMeta, programId: string): Promise<SwapInfo> {
    
    let tokenAccountInfo: TokenInfo = {
        address: "",
        decimals: 0
    };
    
    const timestamp = transaction.blockTime;
    if (!timestamp) {
        throw "Transaction is not yet processed.";
    }
    // Extract account keys
    const accountKeys = transaction.transaction.message.accountKeys.map(key =>
        key.pubkey.toBase58()
    );

    // Find the index of the Raydium swap instruction
    const swapInstructionIndex = transaction.transaction.message.instructions.findIndex(
        instruction => instruction.programId.toBase58() === PROGRAM_IDS.RAYDIUM
    );

    if (swapInstructionIndex === -1) {
        throw "Raydium instruction not found in the transaction.";
    }

    if (!transaction.meta?.innerInstructions) {
        throw "Transaction not confirmed yet.";
    }

    // Extract inner instructions related to the swap
    const swapInnerInstructions = transaction.meta.innerInstructions.reduce<ParsedInstruction[]>((accumulator, innerInstruction) => {
        if (innerInstruction.index === swapInstructionIndex) {
            const parsedInstructions = innerInstruction.instructions as ParsedInstruction[];
            return accumulator.concat(parsedInstructions);
        }
        return accumulator;
    }, []);

    const destination1 = swapInnerInstructions[0].parsed.info.destination;
    const destination1AccountInfo = transaction.meta.preTokenBalances!.find(
        balance => balance.accountIndex === accountKeys.indexOf(destination1)
    );

    const swapInstruction = transaction.transaction.message.instructions[swapInstructionIndex] as PartiallyDecodedInstruction;

    // Extract pool ID and token accounts
    const poolId = swapInstruction.accounts[1].toBase58();
    const token1Account = swapInstruction.accounts[5].toBase58();
    const token2Account = swapInstruction.accounts[6].toBase58();

    // Retrieve account information for both tokens
    const token1AccountInfo = transaction.meta.preTokenBalances!.find(
        balance => balance.accountIndex === accountKeys.indexOf(token1Account)
    );
    const token2AccountInfo = transaction.meta.preTokenBalances!.find(
        balance => balance.accountIndex === accountKeys.indexOf(token2Account)
    );

    if (token1AccountInfo!.mint === NATIVE_MINT.toBase58()) {
        tokenAccountInfo.address = token2AccountInfo!.mint;
        tokenAccountInfo.decimals = token2AccountInfo!.uiTokenAmount.decimals;
    } else if (token2AccountInfo!.mint === NATIVE_MINT.toBase58()) {
        tokenAccountInfo.address = token1AccountInfo!.mint;
        tokenAccountInfo.decimals = token1AccountInfo!.uiTokenAmount.decimals;
    }

    // Parse amounts from inner instructions
    const token1Amount = Number((swapInnerInstructions[0] as ParsedInstruction).parsed.info.amount);
    const token2Amount = Number((swapInnerInstructions[1] as ParsedInstruction).parsed.info.amount);

    if (destination1AccountInfo?.mint === NATIVE_MINT.toBase58()) {

      return {
        Signers:  accountKeys, // userOwner is at index 17
        Signatures: transaction.transaction.signatures,
        AMMs: [AmmType.RAYDIUM],
        Timestamp: transaction.blockTime
          ? new Date(transaction.blockTime * 1000).toISOString()
          : new Date(0).toISOString(),
        PoolId: poolId,
        Action: destination1AccountInfo?.mint === NATIVE_MINT.toBase58() ? 'buy' : 'sell',
        TokenInMint: token2AccountInfo?.mint!,
        TokenInAmount: token2Amount.toString(),
        TokenInDecimals: token2AccountInfo!.uiTokenAmount.decimals,
        TokenOutMint: token1AccountInfo?.mint!,
        TokenOutAmount: token1Amount.toString(),
        TokenOutDecimals: token1AccountInfo!.uiTokenAmount.decimals,
        TransactionData:{
          meta: transaction.meta, 
          slot: transaction.slot,
          transaction: transaction,
          version: transaction.version || 0,
          preTokenBalances: transaction.meta.preTokenBalances as TokenBalance[],
          postTokenBalances: transaction.meta.postTokenBalances as TokenBalance[],
          preBalances: transaction.meta?.preBalances,
          postBalances:transaction.meta?.postBalances
        }
      };

    }
    else {

      return {
        Signers:  accountKeys, // userOwner is at index 17
        Signatures: transaction.transaction.signatures,
        AMMs: [AmmType.RAYDIUM],
        Timestamp: transaction.blockTime
          ? new Date(transaction.blockTime * 1000).toISOString()
          : new Date(0).toISOString(),
        PoolId: poolId,
        Action: destination1AccountInfo?.mint === NATIVE_MINT.toBase58() ? 'buy' : 'sell',
        TokenInMint: token2AccountInfo?.mint!,
        TokenInAmount: token2Amount.toString(),
        TokenInDecimals: tokenAccountInfo.decimals,
        TokenOutMint: token1AccountInfo?.mint!,
        TokenOutAmount: token1Amount.toString(),
        TokenOutDecimals: token1AccountInfo!.uiTokenAmount.decimals,
        TransactionData:{
          meta: transaction.meta, 
          slot: transaction.slot,
          transaction: transaction,
          version: transaction.version || 0,
          preTokenBalances: transaction.meta.preTokenBalances as TokenBalance[],
          postTokenBalances: transaction.meta.postTokenBalances as TokenBalance[],
          preBalances: transaction.meta?.preBalances,
          postBalances:transaction.meta?.postBalances
        }
      };
    }
  }
}