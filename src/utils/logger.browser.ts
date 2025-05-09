
interface LeveledLogMethod {
  (message: string, ...meta: any[]): void;
  (message: any): void
}

interface MyLogger {
  error: LeveledLogMethod;
  warn: LeveledLogMethod;
  info: LeveledLogMethod;
  verbose: LeveledLogMethod;
  debug: LeveledLogMethod;
}

export const logger: MyLogger = {
    ...console,
    verbose(message: string) {
        console.log(`[VERBOSE] ${message}`);
    }
};
