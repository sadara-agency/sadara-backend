// eslint.config.mjs
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-empty-object-type': 'warn',   // 20 model files
      '@typescript-eslint/no-require-imports': 'warn',      // finance.service.ts
      'no-empty': 'warn',                                   // contract.pdf.controller.ts
      'prefer-const': 'warn',                               // settings.routes.ts
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'coverage/', 'tests/'],
  },
);