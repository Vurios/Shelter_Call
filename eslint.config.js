import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      '.venv/**',
      'test-results/**',
      'playwright-report/**',
      '.wrangler/**',
      'android/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    files: ['src/core/**/*.js'],
    languageOptions: { globals: { window: 'off', document: 'off' } },
    rules: {
      'no-restricted-imports': ['error', { patterns: ['three', 'three/*'] }],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use the seeded RNG.' },
      ],
    },
  },
];
