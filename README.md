# Solana Swap Parser

A TypeScript library specialized in parsing Solana DEX swap transaction results. This parser extracts detailed swap information from various Solana DEX transactions, focusing on the actual swap results and token transfers.

## Key Features

- **Swap Result Focus**: Specialized in extracting actual swap results and token transfers
- **Automatic DEX Detection**: No need to specify DEX type - automatically identifies the DEX from the transaction
- **Multiple DEX Support**: Parse swap results from all major Solana DEXs in a unified format
- **Comprehensive Data**: Extract detailed swap information including:
  - Exact input/output token amounts
  - Token decimals and addresses
  - Price impact and slippage
  - Transaction timestamp and signers
- **Error Handling**: Robust error handling with detailed error messages
- **Rate Limiting**: Built-in protection against RPC rate limits with automatic retries

## Supported DEXs

The parser automatically detects and handles swap transactions from:
- Raydium (AMM v3 & Concentrated Liquidity)
- Orca
- Jupiter
- Meteora
- Pumpfun
- Moonshot

## Installation

```bash
npm install solana-swap-parser
# or
yarn add solana-swap-parser
```

## Usage

### Basic Usage

```typescript
import { Connection } from '@solana/web3.js';
import { TransactionParser } from 'solana-swap-parser';

// Initialize connection and parser
const connection = new Connection('https://api.mainnet-beta.solana.com');
const parser = new TransactionParser(connection);

// Parse a swap transaction result
const signature = 'your_transaction_signature';
const result = await parser.parseTransaction(signature);

if (result.success) {
  console.log('Swap result:', result.data);
  // {
  //   Signers: string[],      // Transaction signers
  //   Signatures: string[],   // Transaction signatures
  //   AMMs: string[],        // DEX names used in the swap
  //   Timestamp: string,     // Transaction timestamp
  //   TokenInMint: string,   // Input token mint address
  //   TokenInAmount: string, // Input amount
  //   TokenInDecimals: number,
  //   TokenOutMint: string,  // Output token mint address
  //   TokenOutAmount: string,// Output amount
  //   TokenOutDecimals: number
  // }
} else {
  console.error('Error:', result.error);
}
```

### Advanced Usage

#### Custom RPC Configuration

```typescript
import { Connection, Commitment } from '@solana/web3.js';
import { TransactionParser } from 'solana-swap-parser';

// Configure connection with custom settings
const rpcUrl = 'your_rpc_endpoint';
const commitment: Commitment = 'confirmed';
const connection = new Connection(rpcUrl, {
  commitment,
  confirmTransactionInitialTimeout: 60000,
  wsEndpoint: 'your_ws_endpoint' // Optional WebSocket endpoint
});

const parser = new TransactionParser(connection);
```

#### Error Handling

```typescript
import { TransactionParser } from 'solana-swap-parser';

async function parseSwap(signature: string) {
  try {
    const result = await parser.parseTransaction(signature);
    
    if (!result.success) {
      switch (result.error) {
        case 'TRANSACTION_NOT_FOUND':
          console.error('Transaction not found or expired');
          break;
        case 'INVALID_SIGNATURE':
          console.error('Invalid transaction signature format');
          break;
        case 'UNKNOWN_AMM':
          console.error('Unsupported DEX protocol');
          break;
        case 'RATE_LIMIT':
          console.error('RPC rate limit exceeded');
          break;
        default:
          console.error('Unknown error:', result.error);
      }
      return;
    }

    // Process successful result
    const { 
      TokenInMint, 
      TokenInAmount,
      TokenOutMint,
      TokenOutAmount,
      AMMs 
    } = result.data;
    
    // Your processing logic here
  } catch (error) {
    console.error('Failed to parse swap:', error);
  }
}
```

#### Batch Processing

```typescript
import { TransactionParser } from 'solana-swap-parser';

async function parseMultipleSwaps(signatures: string[]) {
  const results = await Promise.all(
    signatures.map(async (sig) => {
      try {
        const result = await parser.parseTransaction(sig);
        return {
          signature: sig,
          ...result
        };
      } catch (error) {
        return {
          signature: sig,
          success: false,
          error: error.message
        };
      }
    })
  );

  // Filter successful swaps
  const successfulSwaps = results.filter(r => r.success);
  
  // Process results
  successfulSwaps.forEach(swap => {
    console.log(`Swap ${swap.signature}:`, swap.data);
  });
}
```

### Example: Automatic AMM Detection

```typescript
import { Connection } from '@solana/web3.js';
import { TransactionParser } from 'solana-swap-parser';

async function parseAnySwap(signature: string) {
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  const parser = new TransactionParser(connection);

  const result = await parser.parseTransaction(signature);
  
  if (result.success) {
    // The AMM type is automatically detected and included in the result
    console.log('Detected AMM:', result.data.AMMs[0]); // e.g., "RAYDIUM", "ORCA", etc.
    console.log('Swap details:', {
      tokenIn: result.data.TokenInMint,
      amountIn: result.data.TokenInAmount,
      tokenOut: result.data.TokenOutMint,
      amountOut: result.data.TokenOutAmount,
    });
  }
}

// Examples with different DEXs - same code works for all:
await parseAnySwap('raydium_swap_signature');   // Works for Raydium
await parseAnySwap('orca_swap_signature');      // Works for Orca
await parseAnySwap('jupiter_swap_signature');   // Works for Jupiter
// ... and so on for any supported DEX
```

## Why Solana Swap Parser?

- **Focused Purpose**: Specifically designed for parsing swap results, providing the most relevant information for swap analysis
- **Simplified Integration**: Easy to integrate with trading bots, analytics tools, or monitoring systems
- **Reliable Results**: Tested with thousands of real swap transactions across different DEXs
- **Performance Optimized**: Minimal RPC calls and efficient parsing algorithms
- **Active Maintenance**: Regular updates to support new DEX versions and features

## Development

```bash
# Install dependencies
yarn install

# Run tests
yarn test

# Run linter
yarn lint

# Fix lint issues
yarn lint:fix

# Format code
yarn format

# Type check
yarn check-types
```

## Error Codes

The parser may return the following error codes:

- `TRANSACTION_NOT_FOUND`: Transaction signature is invalid or transaction has expired
- `INVALID_SIGNATURE`: Invalid transaction signature format
- `UNKNOWN_AMM`: Unsupported DEX protocol
- `PARSE_ERROR`: Failed to parse transaction data
- `RATE_LIMIT`: RPC rate limit exceeded
- `INVALID_TOKEN_ACCOUNT`: Failed to get token account information

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE for details
