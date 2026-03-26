// eslint.config.mjs
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-empty': 'off',
      'prefer-const': 'off',
    },
  },
  {
    files: ['src/modules/**/*.controller.ts'],
    rules: {
      'no-restricted-syntax': [
        'warn',
        {
          selector: 'MemberExpression[object.name="res"][property.name="json"]',
          message:
            'Use sendSuccess/sendPaginated/sendCreated from @shared/utils/apiResponse instead of raw res.json(). For binary responses (PDF/XLSX), use res.send()/res.sendFile().',
        },
      ],
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'coverage/', 'tests/'],
  },
);
