// import {createLogger, format, transports} from 'winston';
import { TokenInfo } from './interfaces';
import axios from 'axios';
import { ZkLend } from './modules';
import TOKENS from '@/data/tokens.json';
import { isAsyncFunction } from 'util/types';
// import { verbose } from 'winston';

// const winston = require('winston');

const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'blue',
    verbose: 'white',
    debug: 'white',
}

// Add custom colors to Winston
// winston.addColors(colors);

// export const logger = createLogger({
//   level: 'verbose', // Set the minimum logging level
//   format: format.combine(
//     format.colorize({ all: true }), // Apply custom colors
//     format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // Add timestamp to log messages
//     format.printf(({ timestamp, level, message }) => {
//       return `${timestamp} ${level}: ${message}`;
//     })
//   ),
//   transports: [
//     // new transports.Console() // Output logs to the console
//   ]
// });


export const logger = {
    ...console,
    verbose(message: string) {
        console.log(`[VERBOSE] ${message}`);
    }
};


export class FatalError extends Error {
    constructor(message: string, err?: Error) {
        super(message);
        logger.error(message);
        if (err)
            logger.error(err.message);
        this.name = "FatalError";
    }
}
/** Contains globally useful functions. 
 * - fatalError: Things to do when a fatal error occurs
 */
export class Global {
    static fatalError(message: string, err?: Error) {
        logger.error(message);
        console.error(message, err);
        if (err)
            console.error(err);
        process.exit(1);
    }

    static httpError(url: string, err: Error, message?: string) {
        logger.error(`${url}: ${message}`);
        console.error(err);
    }

    static async getTokens(): Promise<TokenInfo[]> {
        return TOKENS;
    }

    static assert(condition: any, message: string) {
        if (!condition) {
            throw new FatalError(message);
        }
    }
}
