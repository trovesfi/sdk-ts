import { defineConfig } from 'tsup';

export default defineConfig((options) => {
  return {
    entry: options.platform == 'browser' ? ['src/index.browser.ts'] : ['src/index.ts'],
    format: ['cjs'],
    globalName: 'strkfarm_risk_engine',
  }
})