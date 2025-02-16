import { PublicKey, PartiallyDecodedInstruction } from '@solana/web3.js';
import { BN } from 'bn.js';
import { ParsedTransactionWithMeta } from '@solana/web3.js';
import { AmmParser, getTransactionAccounts } from './base';
import { AmmType, PROGRAM_IDS, SwapInfo } from '../types';
import { SwapState } from '../state';

export enum MoonshotInstructionType {
  Swap = 1,
}

export interface MoonshotSwapLayout {
  instruction: number; // u8
  amountIn: BN; // u64
  minAmountOut: BN; // u64
}

export interface MoonshotSwapAccounts {
  tokenProgram: PublicKey;
  pool: PublicKey;
  poolAuthority: PublicKey;
  sourceTokenAccount: PublicKey;
  destTokenAccount: PublicKey;
  userSourceTokenAccount: PublicKey;
  userDestTokenAccount: PublicKey;
  userAuthority: PublicKey;
}

export interface MoonshotPoolInfo {
  address: PublicKey;
  tokenA: PublicKey;
  tokenB: PublicKey;
  vaultA: PublicKey;
  vaultB: PublicKey;
  decimalsA: number;
  decimalsB: number;
}

export class MoonshotParser implements AmmParser {
  private enableDebugLogs: boolean = true;

  private log(message: string) {
    if (this.enableDebugLogs) {
      console.log(`[Moonshot] ${message}`);
    }
  }

  canParse(programId: string): boolean {
    return programId === PROGRAM_IDS.MOONSHOT;
  }

  async parse(transaction: ParsedTransactionWithMeta, programId: string): Promise<SwapInfo> {
    if (!transaction.meta?.postTokenBalances || !transaction.meta.preTokenBalances) {
      throw new Error('Missing token balance information');
    }

    // Get the accounts list
    const { accounts } = getTransactionAccounts(transaction);

    // Find Moonshot program invocation
    const moonshotInstruction = transaction.transaction.message.instructions.find(
      (ix) => 'programId' in ix && ix.programId.toString() === PROGRAM_IDS.MOONSHOT
    ) as PartiallyDecodedInstruction;

    if (!moonshotInstruction || !('accounts' in moonshotInstruction)) {
      throw new Error('No Moonshot instruction found');
    }

    // Check if this is a Buy instruction
    const logMessages = transaction.meta.logMessages || [];
    const isBuyInstruction = logMessages.some((msg) => msg.includes('Instruction: Buy'));
    if (!isBuyInstruction) {
      throw new Error('Not a Moonshot Buy instruction');
    }

    // Get account indexes
    const accountIndexes = moonshotInstruction.accounts.map((acc: PublicKey) =>
      accounts.findIndex((key) => key === acc.toString())
    );

    if (accountIndexes.includes(-1)) {
      throw new Error('Could not find all accounts');
    }

    // Get the signer's public key (buyer's address)
    const signerKey = transaction.transaction.message.accountKeys[0].pubkey.toString();
    this.log(`Signer (buyer) address: ${signerKey}`);

    // Get token balances
    const { preTokenBalances, postTokenBalances } = transaction.meta;

    // Find source account (user's account)
    const sourceBalance = preTokenBalances.find(
      (b) => b.owner === signerKey && b.uiTokenAmount.amount !== '0'
    );

    // Find destination account (pool's account)
    const poolBalance = preTokenBalances.find(
      (b) => b.owner !== signerKey && b.uiTokenAmount.amount !== '0'
    );

    if (!sourceBalance?.mint || !poolBalance?.mint) {
      throw new Error('Could not find token information');
    }

    if (!sourceBalance.owner || !poolBalance.owner) {
      throw new Error('Could not find token owner information');
    }

    // Get pool's post balance
    const poolPostBalance = postTokenBalances.find(
      (b) => b.owner === poolBalance.owner && b.mint === poolBalance.mint
    );

    if (!poolPostBalance) {
      throw new Error('Could not find pool post balance');
    }

    // Calculate actual output amount
    const outputAmount =
      BigInt(poolPostBalance.uiTokenAmount.amount) - BigInt(poolBalance.uiTokenAmount.amount);

    // Get token info
    const tokenInfo = await SwapState.getTokenInfo(
      sourceBalance.mint,
      sourceBalance.uiTokenAmount.decimals
    );

    this.log(`Source balance: ${sourceBalance.uiTokenAmount.amount}`);
    this.log(`Pool balance: ${poolBalance.uiTokenAmount.amount}`);
    this.log(`Pool post balance: ${poolPostBalance.uiTokenAmount.amount}`);
    this.log(`Output amount: ${outputAmount.toString()}`);

    return {
      Signers: [signerKey],
      Signatures: [transaction.transaction.signatures[0]],
      AMMs: [AmmType.MOONSHOT],
      Timestamp: transaction.blockTime
        ? new Date(transaction.blockTime * 1000).toISOString()
        : new Date(0).toISOString(),
      TokenInMint: tokenInfo.address,
      TokenInAmount: sourceBalance.uiTokenAmount.amount,
      TokenInDecimals: sourceBalance.uiTokenAmount.decimals,
      TokenOutMint: tokenInfo.address,
      TokenOutAmount: abs(outputAmount).toString(),
      TokenOutDecimals: poolPostBalance.uiTokenAmount.decimals,
    };
  }
}

// Helper function to get absolute value of bigint
function abs(n: bigint): bigint {
  return n < 0n ? -n : n;
}
