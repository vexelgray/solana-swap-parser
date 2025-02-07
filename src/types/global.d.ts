declare module 'bn.js' {
  export class BN {
    static isBN(b: any): b is BN;

    constructor(
      number: number | string | number[] | Uint8Array | Buffer | BN,
      base?: number | 'hex' | 'le' | 'be',
      endian?: 'le' | 'be'
    );
    toString(base?: number | 'hex'): string;
    toNumber(): number;
    toArray(endian?: string, length?: number): number[];
    toBuffer(endian?: string, length?: number): Buffer;
    toBigInt(): bigint;
    add(b: BN): BN;
    sub(b: BN): BN;
    mul(b: BN): BN;
    div(b: BN): BN;
    mod(b: BN): BN;
    pow(b: BN): BN;
    and(b: BN): BN;
    or(b: BN): BN;
    xor(b: BN): BN;
    invm(b: BN): BN;
    isZero(): boolean;
    eq(b: BN): boolean;
    lt(b: BN): boolean;
    lte(b: BN): boolean;
    gt(b: BN): boolean;
    gte(b: BN): boolean;
    isNeg(): boolean;
    abs(): BN;
    neg(): BN;
    clone(): BN;
  }
}

declare module '@solana/buffer-layout' {
  export interface Layout<T> {
    span: number;
    property?: string;
    decode(b: Buffer, offset?: number): T;
    encode(src: T, b: Buffer, offset?: number): number;
    getSpan(b: Buffer, offset?: number): number;
    replicate(name: string): this;
  }
}
