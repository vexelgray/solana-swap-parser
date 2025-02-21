<div align="center">
<div>
  <img src="https://solscan.io/_next/static/media/solana-sol-logo.ecf2bf3a.svg" height=50px></img><h1> solana-transaction-parser</h1>
</div>

<h3>An open-source and lightweight transaction parser for popular DeFi applications on the Solana blockchain, written in TypeScript.</h3>
</div>

## 💪🏽 Supported DeFi Platforms

- PumpFun ✅
- RaydiumV4 ✅
- Jupiter 🔜

## 👨‍🔧 Installation
```bash
npm install git+https://github.com/Tee-py/solana-txn-parser.git
```

## 👨🏽‍💻 Usage

### 🎰 PumpFun Parser

```typescript
import { PumpFunParser } from 'sol-parser/src';
import { Connection, PublicKey, clusterApiUrl, ParsedTransactionWithMeta } from '@solana/web3.js';
import fs from "fs";

const connection = new Connection(clusterApiUrl('mainnet-beta'));
const parser = new PumpFunParser();

// Fetch a transaction
const txnSig = '<transaction_signature>'
const txn1 = await connection.getParsedTransaction(txnSig);

// Parse single transaction
const pumpTxn = parser.parse(transaction);
console.log(parsedTx);

// Parse multiple transactions
const txnSig2 = '<second transaction signature>'
const txn2 = await connection.getParsedTransaction(txnSig2)
const pumpTxns = parser.parseMultiple([txn1, txn2])

// Parse transaction from json file
const txn = JSON.parse(fs.readFileSync("<file_path>", "utf-8")) as unknown as ParsedTransactionWithMeta
const pumpTxn = parser.parse(txn)
```

#### 📦 Output Structure

The parser returns a `PumpFunTransaction` object (or an array of `PumpFunTransaction` objects if `parseMultiple` is called):

#### 🎰 PumpFun Transaction Structure
The `PumpFunTransaction` object shows the different operations that occurred in the transaction. These operations are gotten from the events emitted during the transaction execution and are represented by the `PumpFunAction` interface as follows:
```typescript
interface PumpFunTransaction {
  platform: string; // pumpfun
  actions: PumpFunAction[];
}
```

#### PumpFun Action Structure
The `PumpFunAction` interface contains the three major actions that can occur in a PumpFun transaction (`create`, `complete`, `trade`), with the `info` field containing the relevant information for each action. The info field is of type `TradeInfo`, `CreateInfo`, or `CompleteInfo` depending on the action.

```typescript
interface PumpFunAction {
  type: "create" | "complete" | "trade";
  info: TradeInfo | CreateInfo | CompleteInfo;
}

type TradeInfo = {
  solAmount: bigint;
  tokenAmount: bigint;
  tokenMint: PublicKey;
  trader: PublicKey;
  isBuy: boolean;
  timestamp: bigint;
  virtualSolReserves: bigint;
  virtualTokenReserves: bigint;
};

type CreateInfo = {
  name: string;
  symbol: string;
  uri: string;
  tokenMint: PublicKey;
  bondingCurve: PublicKey;
  tokenDecimals: number;
  createdBy: PublicKey;
};

type CompleteInfo = {
  user: PublicKey;
  tokenMint: PublicKey;
  bondingCurve: PublicKey;
  timestamp: bigint;
};
```

> NB: The `CompleteInfo` event might return unexpected results due to issues with parsing variable length string fields (`name`, `symbol`, `uri`).


### 🧑🏼‍🚀 RaydiumV4 Parser
```typescript
import { RaydiumV4Parser } from 'sol-parser/src';
import { Connection, PublicKey, clusterApiUrl, ParsedTransactionWithMeta } from '@solana/web3.js';
import fs from "fs";

const connection = new Connection(clusterApiUrl('mainnet-beta'));
// set max size of lru cache for caching decoded pool info 
const parser = new RaydiumV4Parser(connection, { maxPoolCache: 20 });

// Fetch a transaction
const txnSig = '<transaction_signature>'
const txn1 = await connection.getParsedTransaction(txnSig);

// Parse single transaction
const result = await parser.parse(transaction);
console.log(result);

// Parse multiple transactions
const txnSig2 = '<second transaction signature>'
const txn2 = await connection.getParsedTransaction(txnSig2)
const results = await parser.parseMultiple([txn1, txn2])

// Parse transaction from json file
const txn = JSON.parse(fs.readFileSync("<file_path>", "utf-8")) as unknown as ParsedTransactionWithMeta
const result = parser.parse(txn)
```

### 🔄 Jupiter Parser [Coming soon]

### 🧰 Creating Custom Parsers

You can create custom parsers for other DeFi platforms by extending the `BaseParser` class:

```typescript
import { BaseParser, ParsedTransactionWithMeta } from 'solana-txn-parser';

// define action information
type ActionInfo = {
    // add neccessary fields for the action
};

// define your custom action
interface CustomAction extends BaseParsedAction {
    info: ActionInfo;
}

// define your custom transaction
interface CustomTransaction extends BaseParsedTransaction<CustomAction> {
    actions: CustomAction[];
}

// define your parser class
class CustomParser extends BaseParser<CustomTransaction> {
  parse(transaction: ParsedTransactionWithMeta): CustomTransaction {
    // Implement your parsing logic here
  }

  parseMultiple(transactions: ParsedTransactionWithMeta[]): CustomTransaction[] {
    return transactions.map((tx) => this.parse(tx));
  }
}
```

> NB: For anchor specific parsers that rely on events, you can use the `anchorLogScanner` function present in the `src/core/utils` file to get program events from the transaction.


## 🤝 Contributing

Here's how you can contribute to the library:

### 🎉 Adding a New Parser

- Fork the repository and create a new branch for your parser.
- Create a new folder in the `src/parsers` directory for your parser (e.g., `newparser`).
- Add an index.ts file in the `src/parser/<newparser>` directory to hold your Parser logic
- Implement your parser by extending the `BaseParser` class.
- Write unit tests for your parser in the `tests/newparser` directory.
- Update the README.md to include documentation for your new parser.
- Submit a pull request with your changes.

You can check the parser directory for more information on how to implement your new parser

### ♻️ Modifying/Improving Existing Parsers

- Fork the repository and create a new branch for your modifications.
- Make your changes to the existing parser file.
- If you're adding new functionality, make sure to add corresponding unit tests.
- If you're fixing a bug, add a test case that would have caught the bug.
- Update the README.md if your changes affect the usage of the parser.
- Submit a pull request with your changes, explaining the modifications and their purpose.


> NB: For all contributions, please ensure your code passes all existing tests and include additional tests for the new parser. I also recommend using the `anchorLogScanner` function present in the `src/core/utils` file to get anchor program events from the transaction to avoid having to install anchor library (trying to make this library as lightweight as possible).

## 🗂️ License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.