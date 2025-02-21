import { ParsedTransactionWithMeta } from '@solana/web3.js';

export type BaseParsedAction = {
    type: string;
};

export type BaseParsedTransaction<T extends BaseParsedAction> = {
    platform: string;
    actions: T[];
};

export interface BaseParser<T extends BaseParsedTransaction<BaseParsedAction>> {
    parse(transaction: ParsedTransactionWithMeta): T | null;
    parseMultiple(transactions: ParsedTransactionWithMeta[]): T[] | null;
}

export interface AsyncBaseParser<T extends BaseParsedTransaction<BaseParsedAction>> {
    parse(transaction: ParsedTransactionWithMeta): Promise<T | null>;
    parseMultiple(transactions: ParsedTransactionWithMeta[]): Promise<T[] | null>;
}
