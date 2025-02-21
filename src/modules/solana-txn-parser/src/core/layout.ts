import { blob, Layout } from '@solana/buffer-layout';
import { PublicKey } from '@solana/web3.js';

export const pubKey = (property: string): Layout<PublicKey> => {
    const layout = blob(32, property);
    const pubKeyLayout = layout as Layout<unknown> as Layout<PublicKey>;
    const decode = layout.decode.bind(layout);
    pubKeyLayout.decode = (buffer: Buffer, offset: number) => {
        const src = decode(buffer, offset);
        return new PublicKey(src);
    };
    return pubKeyLayout;
};

export const uint64 = (property: string): Layout<bigint> => {
    const layout = blob(8, property);
    const uint64Layout = layout as Layout<unknown> as Layout<bigint>;
    const decode = layout.decode.bind(layout);
    uint64Layout.decode = (buffer: Buffer, offset: number) => {
        const src = decode(buffer, offset);
        return Buffer.from(src).readBigUInt64LE();
    };
    return uint64Layout;
};

export const uint128 = (property: string): Layout<bigint> => {
    const layout = blob(16, property);
    const uint128Layout = layout as Layout<unknown> as Layout<bigint>;
    const decode = layout.decode.bind(layout);
    uint128Layout.decode = (buffer: Buffer, offset: number) => {
        const src = decode(buffer, offset);
        return Buffer.from(src).readBigUInt64LE();
    };
    return uint128Layout;
};

export const stringLayout = (property: string, maxLength: number = 32): Layout<string> => {
    const layout = blob(maxLength, property);
    const stringLayout = layout as Layout<unknown> as Layout<string>;
    const decode = layout.decode.bind(layout);
    stringLayout.decode = (buffer: Buffer, offset: number) => {
        const src = decode(buffer, offset);
        return Buffer.from(src).toString('utf-8', 4).trim();
    };
    return stringLayout;
};

export const boolean = (property: string): Layout<boolean> => {
    const layout = blob(1, property);
    const booleanLayout = layout as Layout<unknown> as Layout<boolean>;
    const decode = layout.decode.bind(layout);
    booleanLayout.decode = (buffer: Buffer, offset: number) => {
        const src = decode(buffer, offset);
        return src[0] === 1;
    };
    return booleanLayout;
};
