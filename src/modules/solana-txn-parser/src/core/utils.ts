import {
    ParsedInstruction,
    ParsedTransactionWithMeta,
    PartiallyDecodedInstruction,
    PublicKey,
} from '@solana/web3.js';
import { sha256 } from '@noble/hashes/sha256';

export const anchorLogScanner = (logs: string[], programId: string) => {
    const executionStack: string[] = [];
    const programEvents: { [key: string]: string[] } = {};

    for (const log of logs) {
        if (log.includes('invoke')) {
            const program = log.split(' ')[1];
            executionStack.push(program);
            if (programEvents[program] == undefined) {
                programEvents[program] = [];
            }
        } else {
            const currentProgram = executionStack[executionStack.length - 1];
            if (log.match(/^Program (.*) success/g) !== null) {
                executionStack.pop();
                continue;
            }
            if (currentProgram == programId) {
                if (log.startsWith('Program data: ')) {
                    const data = log.split('Program data: ')[1];
                    programEvents[currentProgram].push(data);
                }
                continue;
            }
        }
    }
    return programEvents[programId];
};

export const createAnchorSigHash = (sig: string) => {
    return Buffer.from(sha256(sig).slice(0, 8));
};

export const flattenTransactionInstructions = (transaction: ParsedTransactionWithMeta) => {
    // Takes a parsed transaction and creates a sorted array of all the instructions (including cpi calls)
    let txnIxs = transaction.transaction.message.instructions;
    let cpiIxs = transaction.meta?.innerInstructions?.sort((a, b) => a.index - b.index) || [];
    const totalCalls = cpiIxs.reduce((acc, ix) => acc + ix.instructions.length, 0) + txnIxs.length;

    const flattended = [];
    let lastPushedIx = -1;
    let currCallIndex = -1;
    for (const cpiIx of cpiIxs) {
        while (lastPushedIx != cpiIx.index) {
            lastPushedIx += 1;
            currCallIndex += 1;
            flattended.push(txnIxs[lastPushedIx]);
        }
        for (const innerIx of cpiIx.instructions) {
            flattended.push(innerIx);
            currCallIndex += 1;
        }
    }
    while (currCallIndex < totalCalls - 1) {
        lastPushedIx += 1;
        currCallIndex += 1;
        flattended.push(txnIxs[lastPushedIx]);
    }
    return flattended;
};

export const getAccountSOLBalanceChange = (
    transaction: ParsedTransactionWithMeta,
    account: PublicKey
) => {
    const accountIndex = transaction.transaction.message.accountKeys.findIndex(
        (acct) => acct.pubkey.toString() == account.toString()
    );
    if (accountIndex == -1) return 0;
    const preBalances = transaction.meta?.preBalances || [];
    const postBalances = transaction.meta?.postBalances || [];
    return Math.abs(postBalances[accountIndex] - preBalances[accountIndex]);
};

export const getSplTransfers = (
    instructions: (ParsedInstruction | PartiallyDecodedInstruction)[]
) => {
    return instructions.filter(
        (ix) =>
            ix.programId.toString() == 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' &&
            // @ts-ignore
            ix.parsed.type == 'transfer'
    );
};

export const getSOLTransfers = (
    instructions: (ParsedInstruction | PartiallyDecodedInstruction)[]
) => {
    return instructions.filter(
        (ix) =>
            ix.programId.toString() == '11111111111111111111111111111111' &&
            // @ts-ignore
            ix.parsed.type == 'transfer'
    );
};
