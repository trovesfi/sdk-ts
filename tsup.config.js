import { defineConfig } from 'tsup';

export default defineConfig((options) => {
  return {
    entry: options.platform == 'browser' ? ['src/index.browser.ts'] : ['src/index.ts'],
    format: ['cjs'],
    globalName: 'strkfarm_risk_engine',
    esbuildOptions(options) {
      // Override headless.ts to use the browser version
      options.alias = options.platform == 'browser' ? {
      } : {
        // '@/node/headless': '@/node/headless.node',
        '@/dataTypes/bignumber': '@/dataTypes/bignumber.node',
        '@/utils/logger': '@/utils/logger.node',
      }
    },
  }
})