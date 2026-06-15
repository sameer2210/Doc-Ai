import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,

  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**'],
  },

  // Config files
  {
    files: ['eslint.config.mjs', '*.config.js', '*.config.mjs'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 'latest',
      },
    },
  },

  // Production TypeScript files
  {
    files: ['**/*.ts'],

    ignores: [
      '**/*.spec.ts',
      '**/*.test.ts',
      '**/*.e2e-spec.ts',
      'jest.config.ts',
      'jest.e2e.config.ts',
    ],

    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.eslint.json',
        tsconfigRootDir: process.cwd(),
      },
      globals: {
        ...globals.node,
      },
    },

    plugins: {
      '@typescript-eslint': tsPlugin,
    },

    rules: {
      ...tsPlugin.configs.recommended.rules,

      // TypeScript already handles this
      'no-undef': 'off',

      // Possible Errors
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'warn',

      // Best Practices
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],

      // Style
      quotes: ['error', 'single', { avoidEscape: true }],
      semi: ['error', 'always'],

      // TS Rules
      '@typescript-eslint/explicit-function-return-type': 'off',

      '@typescript-eslint/no-floating-promises': 'error',

      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksVoidReturn: false,
        },
      ],

      '@typescript-eslint/consistent-type-imports': 'error',

      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },

  // Test files
  {
    files: ['**/*.spec.ts', '**/*.test.ts', '**/*.e2e-spec.ts'],

    languageOptions: {
      parser: tsParser,

      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.eslint.json',
        tsconfigRootDir: process.cwd(),
      },

      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },

    plugins: {
      '@typescript-eslint': tsPlugin,
    },

    rules: {
      ...tsPlugin.configs.recommended.rules,

      'no-undef': 'off',

      // Tests commonly need looser mocking
      '@typescript-eslint/no-explicit-any': 'off',

      '@typescript-eslint/consistent-type-imports': 'error',

      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },

  prettier,
];
