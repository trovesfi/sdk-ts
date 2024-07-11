import { defineConfig } from 'tsup';

export default defineConfig((options) => {
  return {
    entry: 'src/index.ts',
    sourcemap: true,
    clean: true,
    format: ['cjs'],
    globalName: 'strkfarm_risk_engine',
  }
})