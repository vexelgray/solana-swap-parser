import { Connection } from '@solana/web3.js';
import { TransactionParser } from '../lib/parser';
import { SwapState } from '../lib/state';
import { AmmType } from '../lib/types';
import { sleep } from '../lib/utils';

// Raydium swap 交易签名
const RAYDIUM_TEST_SIGNATURE =
  '41od8ZzniFfHMNx3JznuGE9bAe58fBGeyic92KFBSbb5TWtQsr48n6YqXPtnEGscWt1R1ZXpeMdqus9HgjcVT3vN';

// Orca swap 交易签名
const ORCA_TEST_SIGNATURE =
  '3CPVxgpHNmCGC8XnjouJYPJU8aMYoQAqDPg5ZcUDD4ZFpNE6B7RDwrosJEh5BWzxuQL3zJKmv3QmZuavCaAz4uFg'; // 需要填入一个 Orca swap 交易签名

// Jupiter swap 交易签名
const JUPITER_TEST_SIGNATURE =
  '4Fr1GYVidxM9xMr2HCo62j3FdFYLcMZBFA4N3gTE4egxSxoir6erTXpHhx8JKoqscxxcfGTF4ruHMXiDfWSYJAZ7'; // 需要填入一个 Jupiter swap 交易签名

// Meteora swap 交易签名
const METEORA_TEST_SIGNATURE =
  '5WaGBypcFA5v21UDWdPXNcqshDpNUfQ4RzhsPhDZ4KmnefBxf19orMzMdLLgWux5js69JPFESZzRKCHg6P8AB2H'; // 需要填入一个 Meteora swap 交易签名

// Pumpfun swap 交易签名
const PUMPFUN_TEST_SIGNATURE =
  '2bz3AJVqx1LBZE1qcrqnqf8uFfwkeToufV1ZteZKXYmJEA4A89VAt5o7hJA8KgyKDGcHZLfNBpJgtT6a3UGCZn4r'; // 需要填入一个 Pumpfun swap 交易签名

// Moonshot swap 交易签名
const MOONSHOT_TEST_SIGNATURE =
  '3VurVYpBp2c8ma3W9hi72sNHUCx9hAcS5xwrYs2rUdfvVhFD7NzeSEkJv9Ga4VhgJiHr3ckTM9xfLHNYx1d2UW8F'; // 需要填入一个 Moonshot swap 交易签名

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

  // 添加一个辅助函数来等待
  const waitBetweenTests = async () => {
    console.log('Waiting between tests to avoid rate limits...');
    await sleep(5000); // 每个测试之间等待 5 秒
  };

  describe('Raydium Swap Parsing', () => {
    test('Should parse RAYDIUM swap', async () => {
      await waitBetweenTests();
      console.log('Testing RAYDIUM swap parsing...');
      const result = await parser.parseTransaction(RAYDIUM_TEST_SIGNATURE);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const data = result.data!;
      console.log('RAYDIUM Swap Result:', JSON.stringify(data, null, 2));

      expect(Array.isArray(data.Signers)).toBe(true);
      expect(Array.isArray(data.Signatures)).toBe(true);
      expect(Array.isArray(data.AMMs)).toBe(true);
      expect(typeof data.Timestamp).toBe('string');
      expect(typeof data.TokenInAmount).toBe('string');
      expect(typeof data.TokenOutAmount).toBe('string');
      expect(typeof data.TokenInDecimals).toBe('number');
      expect(typeof data.TokenOutDecimals).toBe('number');
      expect(data.AMMs).toContain(AmmType.RAYDIUM);
    });
  });

  describe('Orca Swap Parsing', () => {
    test('Should parse ORCA swap', async () => {
      await waitBetweenTests();
      console.log('Testing ORCA swap parsing...');
      const result = await parser.parseTransaction(ORCA_TEST_SIGNATURE);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const data = result.data!;
      console.log('ORCA Swap Result:', JSON.stringify(data, null, 2));

      expect(Array.isArray(data.Signers)).toBe(true);
      expect(Array.isArray(data.Signatures)).toBe(true);
      expect(Array.isArray(data.AMMs)).toBe(true);
      expect(typeof data.Timestamp).toBe('string');
      expect(typeof data.TokenInAmount).toBe('string');
      expect(typeof data.TokenOutAmount).toBe('string');
      expect(typeof data.TokenInDecimals).toBe('number');
      expect(typeof data.TokenOutDecimals).toBe('number');
      expect(data.AMMs).toContain(AmmType.ORCA);
    });
  });

  describe('Jupiter Swap Parsing', () => {
    test('Should parse JUPITER swap', async () => {
      await waitBetweenTests();
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
      await waitBetweenTests();
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

  describe('Pumpfun Swap Parsing', () => {
    test('Should parse PUMPFUN swap', async () => {
      await waitBetweenTests();
      console.log('Testing PUMPFUN swap parsing...');
      const result = await parser.parseTransaction(PUMPFUN_TEST_SIGNATURE);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const data = result.data!;
      console.log('PUMPFUN Swap Result:', JSON.stringify(data, null, 2));

      expect(Array.isArray(data.Signers)).toBe(true);
      expect(Array.isArray(data.Signatures)).toBe(true);
      expect(Array.isArray(data.AMMs)).toBe(true);
      expect(typeof data.Timestamp).toBe('string');
      expect(typeof data.TokenInAmount).toBe('string');
      expect(typeof data.TokenOutAmount).toBe('string');
      expect(typeof data.TokenInDecimals).toBe('number');
      expect(typeof data.TokenOutDecimals).toBe('number');
      expect(data.AMMs).toContain(AmmType.PUMPFUN);
    });
  });

  describe('Moonshot Swap Parsing', () => {
    test('Should parse MOONSHOT swap', async () => {
      await waitBetweenTests();
      console.log('Testing MOONSHOT swap parsing...');
      const result = await parser.parseTransaction(MOONSHOT_TEST_SIGNATURE);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const data = result.data!;
      console.log('MOONSHOT Swap Result:', JSON.stringify(data, null, 2));

      expect(Array.isArray(data.Signers)).toBe(true);
      expect(Array.isArray(data.Signatures)).toBe(true);
      expect(Array.isArray(data.AMMs)).toBe(true);
      expect(typeof data.Timestamp).toBe('string');
      expect(typeof data.TokenInAmount).toBe('string');
      expect(typeof data.TokenOutAmount).toBe('string');
      expect(typeof data.TokenInDecimals).toBe('number');
      expect(typeof data.TokenOutDecimals).toBe('number');
      expect(data.AMMs).toContain(AmmType.MOONSHOT);
    });
  });

  // 错误处理测试
  describe('Error Handling', () => {
    test('Should handle invalid signature', async () => {
      await waitBetweenTests();
      const result = await parser.parseTransaction('invalid');
      expect(result.success).toBe(false);
      expect(result.error).toBe('无效的交易签名格式');
    });
  });

  afterAll(async () => {
    await sleep(1000);
  });
});
