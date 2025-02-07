import { Connection, ParsedTransactionWithMeta, PublicKey, ParsedInstruction, PartiallyDecodedInstruction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { AmmType, InstructionData, ParseResult, PROGRAM_IDS, SwapInfo } from './types';
import { SwapState } from './state';
import { withRetry } from './retry';
import { SwapParseError, ErrorCodes, ErrorMessages } from './errors';
import { parseU64 } from './utils';
import { PROGRAM_MAPPINGS } from './types';

export class TransactionParser {
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  async parseTransaction(signature: string): Promise<ParseResult> {
    try {
      console.log('\nStarting transaction parsing...');
      console.log('Signature:', signature);

      // 验证签名格式
      if (!/^[A-Za-z0-9]{32,}$/.test(signature)) {
        console.log('Invalid signature format');
        throw new SwapParseError(
          ErrorMessages[ErrorCodes.INVALID_SIGNATURE],
          ErrorCodes.INVALID_SIGNATURE
        );
      }

      console.log('Fetching transaction data...');
      const transaction = await withRetry(() =>
        this.connection.getParsedTransaction(signature, {
          maxSupportedTransactionVersion: 0,
        })
      );

      if (!transaction) {
        console.log('Transaction not found');
        throw new SwapParseError(
          ErrorMessages[ErrorCodes.TRANSACTION_NOT_FOUND],
          ErrorCodes.TRANSACTION_NOT_FOUND
        );
      }

      console.log('Transaction found, parsing instructions...');
      // 解析交易指令
      const instructions = this.parseInstructions(transaction);
      console.log(`Found ${instructions.length} instructions`);

      if (instructions.length === 0) {
        console.log('No instructions found in transaction');
        throw new SwapParseError('交易中没有找到任何指令', ErrorCodes.INVALID_INSTRUCTION);
      }

      // 识别所有涉及的AMM
      console.log('Identifying AMMs...');
      const { amms, programId } = this.identifyAmms(instructions);
      console.log('Found AMMs:', amms);
      console.log('Using program ID:', programId);

      if (amms.length === 0) {
        console.log('No supported AMM found');
        throw new SwapParseError('未找到支持的AMM', ErrorCodes.UNKNOWN_AMM);
      }

      // 解析swap数据
      console.log('Processing swap data...');
      const swapInfo = await this.processSwapData(instructions, transaction, amms, programId);
      console.log('Swap data processed successfully');

      return {
        success: true,
        data: swapInfo,
      };
    } catch (error) {
      console.error('Error during parsing:', error);
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

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private parseInstructions(transaction: ParsedTransactionWithMeta): InstructionData[] {
    console.log('Parsing transaction instructions...');
    const instructions: InstructionData[] = [];

    transaction.transaction.message.instructions.forEach((ix: any, index: number) => {
      console.log(`Processing instruction ${index + 1}...`);
      if ('programId' in ix && 'accounts' in ix && 'data' in ix) {
        console.log(`Program ID: ${ix.programId}`);
        console.log(`Number of accounts: ${ix.accounts.length}`);
        instructions.push({
          programId: new PublicKey(ix.programId),
          accounts: ix.accounts.map((acc: string) => new PublicKey(acc)),
          data: Buffer.from(ix.data, 'base64'),
        });
      }
    });

    return instructions;
  }

  private identifyAmms(instructions: InstructionData[]): { amms: string[], programId: string } {
    console.log('Identifying AMM types...');
    const amms = new Set<string>();
    let foundProgramId = '';

    for (const ix of instructions) {
      const programId = ix.programId.toBase58();
      console.log('Checking program ID:', programId);

      const ammType = PROGRAM_MAPPINGS[programId];
      if (ammType) {
        amms.add(ammType);
        foundProgramId = programId;  // 保存找到的程序 ID
        console.log(`Found ${ammType} AMM`);
      }
    }

    return {
      amms: Array.from(amms),
      programId: foundProgramId
    };
  }

  private async processSwapData(
    instructions: InstructionData[],
    transaction: ParsedTransactionWithMeta,
    amms: string[],
    programId: string
  ): Promise<SwapInfo> {
    console.log('Processing swap data...');
    let swapIx: InstructionData | undefined;
    
    if (amms.includes(AmmType.RAYDIUM)) {
      // 找到 Raydium 的指令
      swapIx = instructions.find(ix => 
        ix.programId.toBase58() === PROGRAM_IDS.RAYDIUM
      );

      if (!swapIx) {
        throw new SwapParseError('找不到 swap 指令', ErrorCodes.INVALID_INSTRUCTION);
      }

      const data = swapIx.data;
      console.log('Swap instruction data:', data.toString('hex'));

      // Raydium 的指令数据结构：
      // 1 byte: instruction code
      // 8 bytes: amount in
      // 8 bytes: minimum amount out
      const amountIn = parseU64(data, 1);
      const minAmountOut = parseU64(data, 9);

      console.log('Amount in:', amountIn.toString());
      console.log('Minimum amount out:', minAmountOut.toString());

      // 从交易的 message 中获取账户
      const accounts = transaction.transaction.message.accountKeys;
      console.log('Total accounts:', accounts.length);

      // 获取账户索引
      const accountIndexes = swapIx.accounts.map(acc => 
        accounts.findIndex(key => key.pubkey.equals(acc))
      );

      if (accountIndexes.includes(-1)) {
        throw new SwapParseError('无法找到对应的账户', ErrorCodes.INVALID_TOKEN_ACCOUNT);
      }

      // 获取用户账户
      const userSourceTokenAccount = accounts[accountIndexes[15]].pubkey;
      const userDestTokenAccount = accounts[accountIndexes[16]].pubkey;
      const userOwner = accounts[accountIndexes[17]].pubkey;

      console.log('User source token account:', userSourceTokenAccount.toBase58());
      console.log('User dest token account:', userDestTokenAccount.toBase58());
      console.log('User owner:', userOwner.toBase58());

      // 1. 从 token balances 中获取代币信息
      const preBalances = transaction.meta?.preTokenBalances || [];
      const postBalances = transaction.meta?.postTokenBalances || [];

      // 2. 从 inner instructions 中获取 SPL Token 转账信息
      const innerInstructions = transaction.meta?.innerInstructions || [];
      console.log('Inner instructions:', innerInstructions);

      // 3. 从账户列表中获取 pool token accounts
      const poolAccounts = swapIx.accounts.slice(5, 7); // pool coin and pc accounts
      console.log('Pool accounts:', poolAccounts.map(acc => acc.toBase58()));

      // 尝试多种方式获取代币信息
      let sourceMint: PublicKey | undefined;
      let destMint: PublicKey | undefined;

      // 方法1: 从 token balances 中查找
      const sourceBalance = preBalances.find(b => 
        accounts[b.accountIndex].pubkey.equals(userSourceTokenAccount)
      );
      const destBalance = postBalances.find(b => 
        accounts[b.accountIndex].pubkey.equals(userDestTokenAccount)
      );

      if (sourceBalance?.mint && destBalance?.mint) {
        sourceMint = new PublicKey(sourceBalance.mint);
        destMint = new PublicKey(destBalance.mint);
      }

      // 方法2: 从 pool accounts 获取
      if (!sourceMint || !destMint) {
        const poolInfos = await Promise.all(
          poolAccounts.map(acc => this.connection.getAccountInfo(acc))
        );
        
        if (poolInfos[0]?.data && poolInfos[1]?.data) {
          sourceMint = new PublicKey(poolInfos[0].data.slice(0, 32));
          destMint = new PublicKey(poolInfos[1].data.slice(0, 32));
        }
      }

      // 方法3: 从 inner instructions 中的 SPL Token 转账获取
      if (!sourceMint || !destMint) {
        const tokenTransfers = innerInstructions
          .flatMap(ix => ix.instructions)
          .filter(ix => ix.programId.equals(TOKEN_PROGRAM_ID))
          .filter((ix): ix is PartiallyDecodedInstruction => 
            'data' in ix && Buffer.isBuffer(ix.data)
          );

        if (tokenTransfers.length >= 2) {
          // 通常第一个是 source token，最后一个是 destination token
          sourceMint = new PublicKey(tokenTransfers[0].data.slice(0, 32));
          destMint = new PublicKey(tokenTransfers[tokenTransfers.length - 1].data.slice(0, 32));
        }
      }

      if (!sourceMint || !destMint) {
        throw new SwapParseError('无法获取代币信息', ErrorCodes.INVALID_TOKEN_ACCOUNT);
      }

      console.log('Source mint:', sourceMint.toBase58());
      console.log('Destination mint:', destMint.toBase58());

      // 获取代币信息
      const [sourceToken, destToken] = await Promise.all([
        SwapState.getTokenInfo(sourceMint.toBase58()),
        SwapState.getTokenInfo(destMint.toBase58())
      ]);

      return {
        Signers: [userOwner.toBase58()],
        Signatures: [transaction.transaction.signatures[0]],
        AMMs: amms,
        Timestamp: transaction.blockTime
          ? new Date(transaction.blockTime * 1000).toISOString()
          : new Date(0).toISOString(),
        TokenInMint: sourceToken.address,
        TokenInAmount: amountIn.toString(10),
        TokenInDecimals: sourceToken.decimals,
        TokenOutMint: destToken.address,
        TokenOutAmount: minAmountOut.toString(10),
        TokenOutDecimals: destToken.decimals,
      };
    } else if (amms.includes(AmmType.ORCA)) {
      // 找到 Orca 的指令
      swapIx = instructions.find(ix => 
        ix.programId.toBase58() === programId
      );

      if (!swapIx) {
        throw new SwapParseError('找不到 swap 指令', ErrorCodes.INVALID_INSTRUCTION);
      }

      const data = swapIx.data;
      console.log('Orca swap instruction data:', data.toString('hex'));

      // Orca 的指令数据结构：
      // 1 byte: instruction code
      // 8 bytes: amount in
      // 8 bytes: minimum amount out
      const amountIn = parseU64(data, 1);  // 跳过第一个字节的指令码
      const minAmountOut = parseU64(data, 9);

      console.log('Amount in:', amountIn.toString());
      console.log('Minimum amount out:', minAmountOut.toString());

      // 从交易的 message 中获取账户
      const accounts = transaction.transaction.message.accountKeys;
      console.log('Transaction accounts:', accounts.map(acc => acc.pubkey.toBase58()));

      // Orca 的账户布局：
      // 0: user authority
      // 1: token program
      // 2: user source token account
      // 3: user destination token account
      const userAuthority = accounts[0];
      const sourceTokenAccount = accounts[2];
      const destTokenAccount = accounts[3];

      // 获取代币账户的 mint 地址
      const sourceTokenInfo = await this.connection.getAccountInfo(sourceTokenAccount.pubkey);
      const destTokenInfo = await this.connection.getAccountInfo(destTokenAccount.pubkey);

      if (!sourceTokenInfo || !destTokenInfo) {
        throw new SwapParseError('无法获取代币账户信息', ErrorCodes.INVALID_TOKEN_ACCOUNT);
      }

      // Token 账户的前 32 字节是 mint 地址
      const sourceMint = new PublicKey(sourceTokenInfo.data.slice(0, 32));
      const destMint = new PublicKey(destTokenInfo.data.slice(0, 32));

      // 获取代币信息
      const [sourceToken, destToken] = await Promise.all([
        SwapState.getTokenInfo(sourceMint.toBase58()),
        SwapState.getTokenInfo(destMint.toBase58())
      ]);

      return {
        Signers: [userAuthority.pubkey.toBase58()],
        Signatures: [transaction.transaction.signatures[0]],
        AMMs: amms,
        Timestamp: transaction.blockTime
          ? new Date(transaction.blockTime * 1000).toISOString()
          : new Date(0).toISOString(),
        TokenInMint: sourceToken.address,
        TokenInAmount: amountIn.toString(10),
        TokenInDecimals: sourceToken.decimals,
        TokenOutMint: destToken.address,
        TokenOutAmount: minAmountOut.toString(10),
        TokenOutDecimals: destToken.decimals,
      };
    } else if (amms.includes(AmmType.JUPITER)) {
      // Jupiter 可能会通过其他 AMM 执行 swap
      // 我们需要检查 inner instructions
      const innerInstructions = transaction.meta?.innerInstructions || [];
      console.log('Jupiter inner instructions:', innerInstructions);

      // 从 token balances 中获取代币信息和金额
      const preBalances = transaction.meta?.preTokenBalances || [];
      const postBalances = transaction.meta?.postTokenBalances || [];

      // 找到变化最大的两个账户作为输入和输出
      const balanceChanges = postBalances.map(post => {
        const pre = preBalances.find(p => p.accountIndex === post.accountIndex);
        return {
          accountIndex: post.accountIndex,
          mint: post.mint,
          change: BigInt(post.uiTokenAmount.amount) - BigInt(pre?.uiTokenAmount.amount || '0'),
          decimals: post.uiTokenAmount.decimals
        };
      });

      // 按变化绝对值排序
      balanceChanges.sort((a, b) => 
        Math.abs(Number(b.change)) - Math.abs(Number(a.change))
      );

      if (balanceChanges.length < 2) {
        throw new SwapParseError('无法确定交易代币', ErrorCodes.INVALID_TOKEN_ACCOUNT);
      }

      // 最大负变化是输入代币，最大正变化是输出代币
      const [inChange, outChange] = balanceChanges;

      // 获取用户账户 - Jupiter 通常是第一个账户
      const userAuthority = transaction.transaction.message.accountKeys[0];

      // 获取代币信息
      const [sourceToken, destToken] = await Promise.all([
        SwapState.getTokenInfo(inChange.mint),
        SwapState.getTokenInfo(outChange.mint)
      ]);

      return {
        Signers: [userAuthority.pubkey.toBase58()],
        Signatures: [transaction.transaction.signatures[0]],
        AMMs: amms,
        Timestamp: transaction.blockTime
          ? new Date(transaction.blockTime * 1000).toISOString()
          : new Date(0).toISOString(),
        TokenInMint: sourceToken.address,
        TokenInAmount: (-inChange.change).toString(),
        TokenInDecimals: inChange.decimals,
        TokenOutMint: destToken.address,
        TokenOutAmount: outChange.change.toString(),
        TokenOutDecimals: outChange.decimals,
      };
    } else if (amms.includes(AmmType.METEORA)) {
      // 找到 Meteora 的指令
      swapIx = instructions.find(ix => 
        ix.programId.toBase58() === programId
      );

      if (!swapIx) {
        throw new SwapParseError('找不到 swap 指令', ErrorCodes.INVALID_INSTRUCTION);
      }

      const data = swapIx.data;
      console.log('Meteora swap instruction data:', data.toString('hex'));

      // Meteora 的指令数据结构：
      // 1 byte: instruction code (2 for swap)
      // 8 bytes: amount in
      // 8 bytes: minimum amount out
      const amountIn = parseU64(data, 1);  // 跳过第一个字节的指令码
      const minAmountOut = parseU64(data, 9);

      console.log('Amount in:', amountIn.toString());
      console.log('Minimum amount out:', minAmountOut.toString());

      // 从交易的 message 中获取账户
      const accounts = transaction.transaction.message.accountKeys;
      console.log('Transaction accounts:', accounts.map(acc => acc.pubkey.toBase58()));

      // Meteora 的账户布局：
      // 0: user authority
      // 1: token program
      // 2: user source token account
      // 3: user destination token account
      const userAuthority = accounts[0];
      const sourceTokenAccount = accounts[2];
      const destTokenAccount = accounts[3];

      // 获取代币账户的 mint 地址
      const sourceTokenInfo = await this.connection.getAccountInfo(sourceTokenAccount.pubkey);
      const destTokenInfo = await this.connection.getAccountInfo(destTokenAccount.pubkey);

      if (!sourceTokenInfo || !destTokenInfo) {
        throw new SwapParseError('无法获取代币账户信息', ErrorCodes.INVALID_TOKEN_ACCOUNT);
      }

      // Token 账户的前 32 字节是 mint 地址
      const sourceMint = new PublicKey(sourceTokenInfo.data.slice(0, 32));
      const destMint = new PublicKey(destTokenInfo.data.slice(0, 32));

      // 获取代币信息
      const [sourceToken, destToken] = await Promise.all([
        SwapState.getTokenInfo(sourceMint.toBase58()),
        SwapState.getTokenInfo(destMint.toBase58())
      ]);

      return {
        Signers: [userAuthority.pubkey.toBase58()],
        Signatures: [transaction.transaction.signatures[0]],
        AMMs: amms,
        Timestamp: transaction.blockTime 
          ? new Date(transaction.blockTime * 1000).toISOString()
          : new Date(0).toISOString(),
        TokenInMint: sourceToken.address,
        TokenInAmount: amountIn.toString(10),
        TokenInDecimals: sourceToken.decimals,
        TokenOutMint: destToken.address,
        TokenOutAmount: minAmountOut.toString(10),
        TokenOutDecimals: destToken.decimals,
      };
    } else if (amms.includes(AmmType.PUMPFUN)) {
      // 找到 Pumpfun 的指令
      swapIx = instructions.find(ix => 
        ix.programId.toBase58() === programId
      );

      if (!swapIx) {
        throw new SwapParseError('找不到 swap 指令', ErrorCodes.INVALID_INSTRUCTION);
      }

      const data = swapIx.data;
      console.log('Pumpfun swap instruction data:', data.toString('hex'));

      // Pumpfun 的指令数据结构：
      // 1 byte: instruction code (0x01 for swap)
      // 8 bytes: amount in
      // 8 bytes: minimum amount out
      const amountIn = parseU64(data, 1);  // 跳过第一个字节的指令码
      const minAmountOut = parseU64(data, 9);

      console.log('Amount in:', amountIn.toString());
      console.log('Minimum amount out:', minAmountOut.toString());

      // 从交易的 message 中获取账户
      const accounts = transaction.transaction.message.accountKeys;
      console.log('Transaction accounts:', accounts.map(acc => acc.pubkey.toBase58()));

      // Pumpfun 的账户布局：
      // 0: user authority
      // 1: user source token account
      // 2: user destination token account
      // 3: pool source token account
      // 4: pool destination token account
      // 5: token program
      const userAuthority = accounts[0];
      const sourceTokenAccount = accounts[1];
      const destTokenAccount = accounts[2];

      // 获取代币账户的 mint 地址
      const sourceTokenInfo = await this.connection.getAccountInfo(sourceTokenAccount.pubkey);
      const destTokenInfo = await this.connection.getAccountInfo(destTokenAccount.pubkey);

      if (!sourceTokenInfo || !destTokenInfo) {
        throw new SwapParseError('无法获取代币账户信息', ErrorCodes.INVALID_TOKEN_ACCOUNT);
      }

      // Token 账户的前 32 字节是 mint 地址
      const sourceMint = new PublicKey(sourceTokenInfo.data.slice(0, 32));
      const destMint = new PublicKey(destTokenInfo.data.slice(0, 32));

      // 获取代币信息
      const [sourceToken, destToken] = await Promise.all([
        SwapState.getTokenInfo(sourceMint.toBase58()),
        SwapState.getTokenInfo(destMint.toBase58())
      ]);

      return {
        Signers: [userAuthority.pubkey.toBase58()],
        Signatures: [transaction.transaction.signatures[0]],
        AMMs: amms,
        Timestamp: transaction.blockTime
          ? new Date(transaction.blockTime * 1000).toISOString()
          : new Date(0).toISOString(),
        TokenInMint: sourceToken.address,
        TokenInAmount: amountIn.toString(10),
        TokenInDecimals: sourceToken.decimals,
        TokenOutMint: destToken.address,
        TokenOutAmount: minAmountOut.toString(10),
        TokenOutDecimals: destToken.decimals,
      };
    } else if (amms.includes(AmmType.MOONSHOT)) {
      // 找到 Moonshot 的指令
      swapIx = instructions.find(ix => 
        ix.programId.toBase58() === programId
      );

      if (!swapIx) {
        throw new SwapParseError('找不到 swap 指令', ErrorCodes.INVALID_INSTRUCTION);
      }

      const data = swapIx.data;
      console.log('Moonshot swap instruction data:', data.toString('hex'));

      // Moonshot 的指令数据结构：
      // 1 byte: instruction code
      // 8 bytes: amount in
      // 8 bytes: minimum amount out
      const amountIn = parseU64(data, 1);  // 跳过第一个字节的指令码
      const minAmountOut = parseU64(data, 9);

      console.log('Amount in:', amountIn.toString());
      console.log('Minimum amount out:', minAmountOut.toString());

      // 从交易的 message 中获取账户
      const accounts = transaction.transaction.message.accountKeys;
      console.log('Transaction accounts:', accounts.map(acc => acc.pubkey.toBase58()));

      // Moonshot 的账户布局：
      // 0: user authority
      // 1: user source token account
      // 2: user destination token account
      // 3: pool source token account
      // 4: pool destination token account
      // 5: token program
      const userAuthority = accounts[0];
      const sourceTokenAccount = accounts[1];
      const destTokenAccount = accounts[2];

      // 获取代币账户的 mint 地址
      const sourceTokenInfo = await this.connection.getAccountInfo(sourceTokenAccount.pubkey);
      const destTokenInfo = await this.connection.getAccountInfo(destTokenAccount.pubkey);

      if (!sourceTokenInfo || !destTokenInfo) {
        throw new SwapParseError('无法获取代币账户信息', ErrorCodes.INVALID_TOKEN_ACCOUNT);
      }

      // Token 账户的前 32 字节是 mint 地址
      const sourceMint = new PublicKey(sourceTokenInfo.data.slice(0, 32));
      const destMint = new PublicKey(destTokenInfo.data.slice(0, 32));

      // 获取代币信息
      const [sourceToken, destToken] = await Promise.all([
        SwapState.getTokenInfo(sourceMint.toBase58()),
        SwapState.getTokenInfo(destMint.toBase58())
      ]);

      return {
        Signers: [userAuthority.pubkey.toBase58()],
        Signatures: [transaction.transaction.signatures[0]],
        AMMs: amms,
        Timestamp: transaction.blockTime
          ? new Date(transaction.blockTime * 1000).toISOString()
          : new Date(0).toISOString(),
        TokenInMint: sourceToken.address,
        TokenInAmount: amountIn.toString(10),
        TokenInDecimals: sourceToken.decimals,
        TokenOutMint: destToken.address,
        TokenOutAmount: minAmountOut.toString(10),
        TokenOutDecimals: destToken.decimals,
      };
    }

    throw new SwapParseError('不支持的 AMM 类型', ErrorCodes.UNKNOWN_AMM);
  }
}
