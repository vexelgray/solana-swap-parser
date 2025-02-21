import { PublicKey, PartiallyDecodedInstruction, TokenBalance, ParsedInstruction } from '@solana/web3.js';
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

  private findPumpfunInstruction(transaction: ParsedTransactionWithMeta): PartiallyDecodedInstruction {
    // Buscar en instrucciones principales
    const mainIx = transaction.transaction.message.instructions.find(
      ix => 'programId' in ix && ix.programId.toString() === PROGRAM_IDS.PUMPFUN
    ) as PartiallyDecodedInstruction;

    if (mainIx) return mainIx;

    // Buscar en innerInstructions
    for (const inner of transaction.meta?.innerInstructions || []) {
      const ix = inner.instructions.find(
        ix => 'programId' in ix && ix.programId.toString() === PROGRAM_IDS.PUMPFUN
      ) as PartiallyDecodedInstruction;
      if (ix) return ix;
    }

    throw new Error('No Pumpfun instruction found');
  }

  private  isParsedInstruction(
    ix: PartiallyDecodedInstruction | ParsedInstruction
  ): ix is ParsedInstruction {
    return 'parsed' in ix; 
  }

  async parse(transaction: ParsedTransactionWithMeta, programId: string): Promise<SwapInfo> {
    // 1) Find the Pump.fun instruction
    const swapIx = this.findPumpfunInstruction(transaction);
    const data = Buffer.from(swapIx.data, 'base64');
    
    // Parsear tipo de instrucción según IDL
    const instructionType = data[0];
    const amount = parseU64(data, 1);
    const limit = parseU64(data, 9);

    // Obtener cuentas relevantes según estructura del IDL
    const accounts = swapIx.accounts.map(pubkey => pubkey.toString());
    const isBuy = instructionType === 1;

    // Determinar mints y direcciones
    const mint = accounts[2]; // Índice del mint en las cuentas
    const userAuthority = accounts[6]; // Usuario que firma
    const userTokenAccount = accounts[5]; // Token account del usuario

    // Calcular montos de tokens
    const tokenBalances = transaction.meta?.postTokenBalances?.find(
      b => b.accountIndex === transaction.transaction.message.accountKeys.findIndex(
        acc => acc.pubkey.toString() === userTokenAccount
      )
    );

    const solTransfers = transaction.meta?.innerInstructions?.flatMap((inner) =>
      inner.instructions
        .filter(this.isParsedInstruction) // Only keep ParsedInstruction
        .filter(
          (i) =>
            i.parsed?.type === 'transfer' &&
            i.parsed?.info?.source === userAuthority
        )
    ) || [];
    
    const solAmount = solTransfers.reduce(
      (sum, ix) => sum.add(new BN(ix.parsed.info.lamports || 0)),
      new BN(0)
    );

    // Validar datos críticos
    if (!tokenBalances || !mint) {
      throw new Error('Datos esenciales no encontrados');
    }

    return {
      Signers: [userAuthority],
      Signatures: [transaction.transaction.signatures[0]],
      AMMs: [AmmType.PUMPFUN],
      Timestamp: new Date(transaction.blockTime! * 1000).toISOString(),
      Action: isBuy ? "buy" : "sell",
      TokenInMint: isBuy ? NATIVE_MINT.toBase58() : mint,
      TokenInAmount: isBuy ? solAmount.toString() : amount.toString(),
      TokenInDecimals: isBuy ? 9 : tokenBalances.uiTokenAmount.decimals,
      TokenOutMint: isBuy ? mint : NATIVE_MINT.toBase58(),
      TokenOutAmount: isBuy ? tokenBalances.uiTokenAmount.amount : limit.toString(),
      TokenOutDecimals: isBuy ? tokenBalances.uiTokenAmount.decimals : 9,
      TransactionData: {
        meta: transaction.meta,
        slot: transaction.slot,
        transaction: transaction,
        version: transaction.version || 0,
        preTokenBalances: transaction.meta?.preTokenBalances as TokenBalance[],
        postTokenBalances: transaction.meta?.postTokenBalances as TokenBalance[],
        preBalances: transaction.meta?.preBalances,
        postBalances: transaction.meta?.postBalances
      }
    };
  }
}
