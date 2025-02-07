import { Connection, PublicKey } from '@solana/web3.js';
import { TransactionParser } from '../lib/parser';
import { SwapState } from '../lib/state';
import { AmmType, PROGRAM_IDS } from '../lib/types';
import { sleep } from '../lib/utils';
import { withRetry } from '../lib/retry';

// Raydium swap 交易签名
const RAYDIUM_TEST_SIGNATURE = '3JWAkycz9cLt647dWAiua13WxV38kqBHyeuVvBxErJd5R3SZ7Rp982vsBxC8RBwTeLvLPa8KFWfVZp3dpWUqSpq2';

// Orca swap 交易签名
const ORCA_TEST_SIGNATURE = '3CPVxgpHNmCGC8XnjouJYPJU8aMYoQAqDPg5ZcUDD4ZFpNE6B7RDwrosJEh5BWzxuQL3zJKmv3QmZuavCaAz4uFg'; // 需要填入一个 Orca swap 交易签名

// Jupiter swap 交易签名
const JUPITER_TEST_SIGNATURE = '4Fr1GYVidxM9xMr2HCo62j3FdFYLcMZBFA4N3gTE4egxSxoir6erTXpHhx8JKoqscxxcfGTF4ruHMXiDfWSYJAZ7'; // 需要填入一个 Jupiter swap 交易签名

// Meteora swap 交易签名
const METEORA_TEST_SIGNATURE = '5WaGBypcFA5v21UDWdPXNcqshDpNUfQ4RzhsPhDZ4KmnefBxf19orMzMdLLgWux5js69JPFESZzRKCHg6P8AB2H'; // 需要填入一个 Meteora swap 交易签名

describe('DEX Swap Parser', () => {
  let connection: Connection;
  let parser: TransactionParser;

  beforeAll(async () => {
    const rpcUrl = 'https://api.mainnet-beta.solana.com';
    connection = new Connection(rpcUrl, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 30000,
    });
    parser = new TransactionParser(connection);
    SwapState.setConnection(connection);
  }, 120000);

  // describe('Raydium Swap Parsing', () => {
  //   test('Should parse RAYDIUM swap', async () => {
  //     console.log('Testing RAYDIUM swap parsing...');
  //     const result = await parser.parseTransaction(RAYDIUM_TEST_SIGNATURE);
      
  //     expect(result.success).toBe(true);
  //     expect(result.data).toBeDefined();
      
  //     const data = result.data!;
  //     console.log('RAYDIUM Swap Result:', JSON.stringify(data, null, 2));

  //     expect(Array.isArray(data.Signers)).toBe(true);
  //     expect(Array.isArray(data.Signatures)).toBe(true);
  //     expect(Array.isArray(data.AMMs)).toBe(true);
  //     expect(typeof data.Timestamp).toBe('string');
  //     expect(typeof data.TokenInAmount).toBe('string');
  //     expect(typeof data.TokenOutAmount).toBe('string');
  //     expect(typeof data.TokenInDecimals).toBe('number');
  //     expect(typeof data.TokenOutDecimals).toBe('number');
  //     expect(data.AMMs).toContain(AmmType.RAYDIUM);
  //   });
  // });

  // describe('Orca Swap Parsing', () => {
  //   test('Should parse ORCA swap', async () => {
  //     console.log('Testing ORCA swap parsing...');
  //     const result = await parser.parseTransaction(ORCA_TEST_SIGNATURE);
      
  //     expect(result.success).toBe(true);
  //     expect(result.data).toBeDefined();
      
  //     const data = result.data!;
  //     console.log('ORCA Swap Result:', JSON.stringify(data, null, 2));

  //     expect(Array.isArray(data.Signers)).toBe(true);
  //     expect(Array.isArray(data.Signatures)).toBe(true);
  //     expect(Array.isArray(data.AMMs)).toBe(true);
  //     expect(typeof data.Timestamp).toBe('string');
  //     expect(typeof data.TokenInAmount).toBe('string');
  //     expect(typeof data.TokenOutAmount).toBe('string');
  //     expect(typeof data.TokenInDecimals).toBe('number');
  //     expect(typeof data.TokenOutDecimals).toBe('number');
  //     expect(data.AMMs).toContain(AmmType.ORCA);
  //   });
  // });

  describe('Jupiter Swap Parsing', () => {
    test('Should parse JUPITER swap', async () => {
      console.log('Testing JUPITER swap parsing...');
      const result = await parser.parseTransaction(JUPITER_TEST_SIGNATURE);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      const data = result.data!;
      console.log('JUPITER Swap Result:', JSON.stringify(data, null, 2));

      expect(Array.isArray(data.Signers)).toBe(true);
      expect(Array.isArray(data.Signatures)).toBe(true);
      expect(Array.isArray(data.AMMs)).toBe(true);
      expect(typeof data.Timestamp).toBe('string');
      expect(typeof data.TokenInAmount).toBe('string');
      expect(typeof data.TokenOutAmount).toBe('string');
      expect(typeof data.TokenInDecimals).toBe('number');
      expect(typeof data.TokenOutDecimals).toBe('number');
      expect(data.AMMs).toContain(AmmType.JUPITER);
    });
  });

  describe('Meteora Swap Parsing', () => {
    test('Should parse METEORA swap', async () => {
      console.log('Testing METEORA swap parsing...');
      const result = await parser.parseTransaction(METEORA_TEST_SIGNATURE);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      const data = result.data!;
      console.log('METEORA Swap Result:', JSON.stringify(data, null, 2));

      expect(Array.isArray(data.Signers)).toBe(true);
      expect(Array.isArray(data.Signatures)).toBe(true);
      expect(Array.isArray(data.AMMs)).toBe(true);
      expect(typeof data.Timestamp).toBe('string');
      expect(typeof data.TokenInAmount).toBe('string');
      expect(typeof data.TokenOutAmount).toBe('string');
      expect(typeof data.TokenInDecimals).toBe('number');
      expect(typeof data.TokenOutDecimals).toBe('number');
      expect(data.AMMs).toContain(AmmType.METEORA);
    });
  });

  // 错误处理测试
  describe('Error Handling', () => {
    test('Should handle invalid signature', async () => {
      const result = await parser.parseTransaction('invalid');
      expect(result.success).toBe(false);
      expect(result.error).toBe('无效的交易签名格式');
    });
  });

  afterAll(async () => {
    await sleep(1000);
  });
});
