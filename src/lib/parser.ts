import {
  Connection,
  ParsedTransactionWithMeta,
  PublicKey,
  PartiallyDecodedInstruction,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import {
  AmmType,
  InstructionData,
  ParseResult,
  PROGRAM_IDS,
  SwapInfo,
  PROGRAM_MAPPINGS,
} from './types';
import { SwapState } from './state';
import { withRetry } from './retry';
import { SwapParseError, ErrorCodes, ErrorMessages } from './errors';
import { parseU64 } from './utils';
import { AmmParserFactory } from './amm/factory';

export class TransactionParser {
  private connection: Connection;
  private enableDebugLogs: boolean;

  constructor(connection: Connection, enableDebugLogs: boolean = false) {
    this.connection = connection;
    this.enableDebugLogs = enableDebugLogs;
  }

  private log(message: string) {
    if (this.enableDebugLogs) {
      console.log(message);
    }
  }

  private logError(message: string) {
    if (this.enableDebugLogs) {
      console.error(message);
    }
  }

  async parseTransaction(signature: string): Promise<ParseResult> {
    let swapInfo: SwapInfo | undefined;

    try {
      this.log(`Processing transaction: ${signature}`);

      // 验证签名格式
      if (!/^[A-Za-z0-9]{32,}$/.test(signature)) {
        this.logError('Invalid signature format');
        throw new SwapParseError(
          ErrorMessages[ErrorCodes.INVALID_SIGNATURE],
          ErrorCodes.INVALID_SIGNATURE
        );
      }

      this.log('Fetching transaction data...');
      const transaction = await withRetry(() =>
        this.connection.getParsedTransaction(signature, {
          maxSupportedTransactionVersion: 0,
        })
      );

      if (!transaction) {
        this.logError('Transaction not found');
        throw new SwapParseError(
          ErrorMessages[ErrorCodes.TRANSACTION_NOT_FOUND],
          ErrorCodes.TRANSACTION_NOT_FOUND
        );
      }

      this.log('Parsing instructions...');
      const instructions = this.parseInstructions(transaction);

      if (instructions.length === 0) {
        this.logError('No instructions found in transaction');
        throw new SwapParseError(
          ErrorMessages[ErrorCodes.INVALID_INSTRUCTION],
          ErrorCodes.INVALID_INSTRUCTION
        );
      }

      // 识别 AMM 类型和程序 ID
      const { amms, programId } = this.identifyAmms(instructions);
      this.log(`Identified AMMs: ${amms.join(', ')}`);

      if (amms.length === 0 || !programId) {
        this.logError('No supported AMM found');
        throw new SwapParseError(ErrorMessages[ErrorCodes.UNKNOWN_AMM], ErrorCodes.UNKNOWN_AMM);
      }

      // 使用对应的解析器处理交易
      const parser = AmmParserFactory.getParser(programId);
      try {
        swapInfo = await parser.parse(transaction, programId);
        this.log('Successfully processed swap data');
        if (swapInfo) {
          this.log('Successfully parsed swap data');
          return {
            success: true,
            data: swapInfo,
          };
        } else {
          this.logError('Parser returned no data');
          return {
            success: false,
            error: 'Parser returned no data',
          };
        }
      } catch (error) {
        this.logError(`Error in AMM parser: ${error}`);
        this.logError(`Full error details: ${error}`);
        if (error instanceof Error) {
          this.logError(`Stack trace: ${error.stack}`);
        }
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error in AMM parser',
        };
      }
    } catch (error) {
      this.logError(
        `Error during parsing: ${error instanceof Error ? error.message : String(error)}`
      );
      this.logError(`Error details: ${error}`);
      this.logError(`Stack trace: ${error instanceof Error ? error.stack : 'No stack trace'}`);

      // 如果已经成功解析出数据，即使有非关键错误也返回成功
      if (error instanceof Error && error.message.includes('pubkey') && swapInfo) {
        return {
          success: true,
          data: swapInfo,
        };
      }

      if (error instanceof SwapParseError) {
        return {
          success: false,
          error: error.message,
        };
      }

      if (error instanceof Error && error.message.includes('429')) {
        return {
          success: false,
          error: ErrorMessages[ErrorCodes.RATE_LIMIT],
        };
      }

      // 如果已经成功解析出数据，返回成功
      if (swapInfo) {
        return {
          success: true,
          data: swapInfo,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private parseInstructions(transaction: ParsedTransactionWithMeta): InstructionData[] {
    this.log('Parsing transaction instructions...');
    const instructions: InstructionData[] = [];

    // 解析主要指令
    transaction.transaction.message.instructions.forEach((ix: any) => {
      if ('programId' in ix && 'accounts' in ix && 'data' in ix) {
        instructions.unshift({
          programId: new PublicKey(ix.programId.toString()),
          accounts: ix.accounts.map((acc: any) => new PublicKey(acc.toString())),
          data: Buffer.from(ix.data, 'base64'),
        });
      }
    });

    // 解析内部指令
    if (transaction.meta?.innerInstructions) {
      transaction.meta.innerInstructions.forEach((inner) => {
        inner.instructions.forEach((ix: any) => {
          if ('programId' in ix && 'accounts' in ix && 'data' in ix) {
            instructions.push({
              programId: new PublicKey(ix.programId.toString()),
              accounts: ix.accounts.map((acc: any) => new PublicKey(acc.toString())),
              data: Buffer.from(ix.data, 'base64'),
            });
          }
        });
      });
    }

    return instructions;
  }

  private identifyAmms(instructions: InstructionData[]): { amms: string[]; programId: string } {
    const amms = new Set<string>();
    let lastFoundProgramId = '';

    // 倒序遍历指令，这样我们会先找到最后的主要指令
    for (let i = instructions.length - 1; i >= 0; i--) {
      const ix = instructions[i];
      const programId = ix.programId.toString();
      const ammType = PROGRAM_MAPPINGS[programId];
      if (ammType) {
        amms.add(ammType);
        lastFoundProgramId = programId;
        // 如果找到了 Meteora，就停止搜索
        if (ammType === AmmType.METEORA) {
          break;
        }
      }
    }

    return {
      amms: Array.from(amms),
      programId: lastFoundProgramId,
    };
  }
}
