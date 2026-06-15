import js from '@eslint/js';
import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**'],
  },
  {
    files: ['eslint.config.mjs', '*.config.js', '*.config.mjs'],
    languageOptions: {
      globals: {
        ...globals.node,
        process: 'readonly',
        console: 'readonly',
      },
      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 'latest',
      },
    },
  },
  js.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
        tsconfigRootDir: process.cwd(),
      },
    },
    plugins: {
      '@typescript-eslint': ts,
    },
    rules: {
      ...ts.configs.recommended.rules,

      'no-undef': 'off', // TS handles this

      // Possible Errors
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'warn',

      // Best Practices
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],

      // Stylistic
      quotes: ['error', 'single', { avoidEscape: true }],
      semi: ['error', 'always'],

      // TypeScript Specific
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksVoidReturn: false,
        },
      ],

      // Project-Specific
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
  {
    files: ['**/*.spec.ts', '**/*.test.ts', '**/*.e2e-spec.ts'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',
    },
  },
  prettier,
];






You are a Principal Backend Architect reviewing a production healthcare AI platform.

Before coding, deeply analyze the entire AI prediction pipeline and existing backend architecture.

Do NOT create duplicate logic.

Reuse existing modules wherever possible.

Current Architecture:

React Native
→ NestJS
→ AWS S3
→ HuggingFace Cataract Model

---

## TASK 1 — ANALYZE EXISTING PIPELINE

Inspect:

src/ai/ai.controller.ts
src/ai/ai.service.ts
src/ai/dto/

Verify:

1. Upload flow.
2. Validation flow.
3. S3 flow.
4. ML request flow.
5. Prediction response flow.
6. Existing DTOs.
7. Existing retry logic.
8. Existing timeout logic.

Document findings.

---

## TASK 2 — IMAGE QUALITY SYSTEM

Add lightweight image quality evaluation.

DO NOT modify ML model.

DO NOT retrain model.

DO NOT move business logic into ML service.

Quality checks happen inside NestJS backend.

Checks:

1. Lens Center Validation
2. Sharpness Validation

No brightness validation.

No advanced scoring system.

Keep simple.

---

## TASK 3 — QUALITY SCORE

Generate:

qualityScore

Based only on:

* eyeCentered
* sharpnessGood

Example:

Centered + Sharp = 100

Centered only = 50

Sharp only = 50

Neither = 0

Return:

{
qualityScore,
eyeCentered,
sharpnessGood
}

---

## TASK 4 — DO NOT BLOCK PREDICTION

Important:

Prediction MUST ALWAYS RUN.

Even when:

* eye not centered
* blurry image
* low quality

Never reject.

Never stop prediction.

Flow:

Upload
↓
Quality Check
↓
ML Prediction
↓
Combine Results
↓
Return

---

## TASK 5 — IMAGE QUALITY MESSAGE LOGIC

No Warning Card.

No Separate Quality Card.

Image Quality must appear inside existing result card.

Backend returns:

{
prediction,
confidence,
qualityScore,
eyeCentered,
sharpnessGood,
imageQualityMessage
}

Logic:

IF

qualityScore < 50
AND
confidence < 0.5

Return:

"Eye not centered or image appears blurry. Consider retaking the image for better reliability."

OR

qualityScore < 30

Return same message.

Otherwise:

No message.

---

## TASK 6 — CLEAN ARCHITECTURE

Create:

src/ai/quality/

Files:

image-quality.service.ts
image-quality.types.ts
image-quality.constants.ts

Responsibilities:

image-quality.service.ts

* lens center check
* sharpness check
* quality score generation
* message generation

Keep all quality logic isolated.

---

## TASK 7 — FRONTEND RESULT INTEGRATION

Reuse existing result UI.

Inspect:

src/features/chat/components/scan-result-card.tsx

DO NOT create:

* warning card
* quality card
* modal
* popup

Instead add:

Image Quality
Quality Score
Image Quality Message

inside existing result card.

---

## TASK 8 — TESTING

Provide tests for:

1. Centered + Sharp
2. Centered + Blurry
3. Off-center + Sharp
4. Off-center + Blurry
5. Low confidence
6. High confidence
7. Empty image
8. Invalid image

---

## DELIVERABLES

Provide:

1. Architecture review.
2. New files.
3. Modified files.
4. Why each change exists.
5. API response contract changes.
6. DTO changes.
7. Edge cases.
8. Testing plan.
9. Rollback strategy.
10. No breaking changes.
