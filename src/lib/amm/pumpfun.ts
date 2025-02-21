import { PublicKey, PartiallyDecodedInstruction } from '@solana/web3.js';
import { BN } from 'bn.js';
import { ParsedTransactionWithMeta } from '@solana/web3.js';
import { AmmParser, getTransactionAccounts } from './base';
import { AmmType, PROGRAM_IDS, SwapInfo } from '../types'
import { SwapState } from '../state';
import { parseU64 } from '../utils';
import { NATIVE_MINT } from '@solana/spl-token';

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
  poolAuthority: PublicKey;
  sourceTokenAccount: PublicKey;
  destTokenAccount: PublicKey;
  userSourceTokenAccount: PublicKey;
  userDestTokenAccount: PublicKey;
  userAuthority: PublicKey;
}

export interface PumpfunPoolInfo {
  address: PublicKey;
  tokenA: PublicKey;
  tokenB: PublicKey;
  vaultA: PublicKey;
  vaultB: PublicKey;
  decimalsA: number;
  decimalsB: number;
}

export class PumpfunParser implements AmmParser {
  canParse(programId: string): boolean {
    return programId === PROGRAM_IDS.PUMPFUN;
  }

  async parse(transaction: ParsedTransactionWithMeta, programId: string): Promise<SwapInfo> {
    // 1) Find the Pump.fun instruction
    const pumpIx = transaction.transaction.message.instructions.find(
      (ix) => 'programId' in ix && ix.programId.toBase58() === programId
    ) as PartiallyDecodedInstruction | undefined;

    if (!pumpIx) {
      throw new Error("No Pump.fun instruction found in this transaction");
    }

    // 2) Optionally parse the instruction data to see if it's a "buy" or "sell"
    //    The first byte typically indicates which method is being called (by IDL order).
    //    Or we can just rely on pre/post changes. 
    const data = Buffer.from(pumpIx.data, 'base64');
    // For demonstration, let's do a minimal parse:
    //   - The Anchor IDL will have a "discriminator" for the instruction, which is 8 bytes typically.
    //   - Then the rest are the arguments. But to keep it simple, we can just check the logMessages or 
    //     rely on negative vs. positive tokens. 
    //   - Alternatively, you can watch for "Program log: Instruction: Buy" / "Instruction: Sell" in logMessages.

    let instructionName: 'buy' | 'sell' | 'unknown' = 'unknown';
    const logMessages = transaction.meta?.logMessages || [];
    for (const log of logMessages) {
      if (log.includes('Program log: Instruction: Buy')) {
        instructionName = 'buy';
        break;
      }
      if (log.includes('Program log: Instruction: Sell')) {
        instructionName = 'sell';
        break;
      }
    }

    // 3) Build the list of pre/post token balance changes
    const preBalances = transaction.meta?.preTokenBalances || [];
    const postBalances = transaction.meta?.postTokenBalances || [];

    const balanceChanges = preBalances
      .map((pre) => {
        const post = postBalances.find((p) => p.accountIndex === pre.accountIndex);
        if (!post) return null;

        const preAmount = BigInt(pre.uiTokenAmount.amount);
        const postAmount = BigInt(post.uiTokenAmount.amount);
        const change = postAmount - preAmount;

        return {
          accountIndex: pre.accountIndex,
          mint: pre.mint,
          owner: pre.owner,
          decimals: pre.uiTokenAmount.decimals,
          change,
          absChange: change < 0n ? -change : change,
          preAmount: pre.uiTokenAmount.amount,
          postAmount: post.uiTokenAmount.amount,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => Number(b.absChange - a.absChange));

    if (balanceChanges.length === 0) {
      throw new Error("No token balance changes found");
    }

    // 4) Typically, the user is the one with negative SOL if it's a "buy," or negative tokens if it's a "sell."
    //    We'll find the largest negative => that's the "input." Then find a largest positive => "output."
    const sourceChange = balanceChanges.find((b) => b.change < 0n);
    const destChange = balanceChanges.find((b) => b.change > 0n);

    if (!sourceChange || !destChange) {
      // Possibly aggregator usage or no net user gain. 
      // For your example, we do see a negative SOL and a positive token.
      throw new Error("Could not find both negative and positive changes for user in Pump.fun transaction");
    }

    // 5) Load token info for each side
    const [sourceToken, destToken] = await Promise.all([
      SwapState.getTokenInfo(sourceChange.mint, sourceChange.decimals),
      SwapState.getTokenInfo(destChange.mint, destChange.decimals),
    ]);

    // 6) Decide if it's buy or sell
    //    We can combine both approaches:
    //    - If instructionName is "buy"/"sell", we trust that.
    //    - Otherwise, we guess from negative SOL => buy, negative minted token => sell.
    let action: 'buy' | 'sell';
    if (instructionName === 'buy' || instructionName === 'sell') {
      action = instructionName;
    } else {
      // fallback approach
      if (sourceToken.address === NATIVE_MINT.toBase58()) {
        action = 'buy';
      } else {
        action = 'sell';
      }
    }

    // 7) The user is typically at index 6 in the IDL for both buy/sell
    //    So let's confirm we have at least 7 accounts, then pick index 6
    const userIndex = 6; 
    if (pumpIx.accounts.length <= userIndex) {
      throw new Error("PumpFun instruction does not have enough accounts for user at index 6");
    }
    const userPubkey = pumpIx.accounts[userIndex];

    // 8) Build the final SwapInfo
    //    sourceChange.change is negative => user spent that token
    //    so the input amount is -sourceChange.change
    //    destChange.change is positive => user received that token
    const tokenInAmount = (-sourceChange.change).toString();
    const tokenOutAmount = destChange.change.toString();

    return {
      Signers: [userPubkey.toBase58()],
      Signatures: [transaction.transaction.signatures[0]],
      AMMs: [AmmType.PUMPFUN],
      Timestamp: transaction.blockTime
        ? new Date(transaction.blockTime * 1000).toISOString()
        : new Date(0).toISOString(),
      Action: action,
      TokenInMint: sourceToken.address,
      TokenInAmount: tokenInAmount,
      TokenInDecimals: sourceToken.decimals,
      TokenOutMint: destToken.address,
      TokenOutAmount: tokenOutAmount,
      TokenOutDecimals: destToken.decimals,

      TransactionData: {
        meta: transaction.meta,
        slot: transaction.slot,
        transaction: transaction,
        version: transaction.version || 0,
        preTokenBalances: preBalances,
        postTokenBalances: postBalances,
        preBalances: transaction.meta?.preBalances,
        postBalances: transaction.meta?.postBalances,
      },
    };
  }
}
