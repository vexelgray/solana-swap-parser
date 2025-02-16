import { AmmParser } from './base';
import { JupiterParser } from './jupiter';
import { RaydiumParser } from './raydium';
import { OrcaParser } from './orca';
import { MeteoraParser } from './meteora';
import { PumpfunParser } from './pumpfun';
import { MoonshotParser } from './moonshot';
import { SwapParseError, ErrorCodes, ErrorMessages } from '../errors';

export class AmmParserFactory {
  private static parsers: AmmParser[] = [
    new JupiterParser(),
    new RaydiumParser(),
    new OrcaParser(),
    new MeteoraParser(),
    new PumpfunParser(),
    new MoonshotParser(),
  ];

  static getParser(programId: string): AmmParser {
    const parser = this.parsers.find((p) => p.canParse(programId));
    if (!parser) {
      throw new SwapParseError(ErrorMessages[ErrorCodes.UNKNOWN_AMM], ErrorCodes.UNKNOWN_AMM);
    }
    return parser;
  }

  static addParser(parser: AmmParser) {
    this.parsers.push(parser);
  }
}
