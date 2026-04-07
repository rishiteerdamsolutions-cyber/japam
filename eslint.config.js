import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Allow _-prefixed identifiers as intentional no-ops (common TS convention)
      '@typescript-eslint/no-unused-vars': ['error', {
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
      // Empty catch blocks are intentional throughout (browser API guard, storage failures)
      'no-empty': ['error', { allowEmptyCatch: true }],
      // setState synchronously in an effect is a valid React pattern (e.g. setLoading(true) before async)
      'react-hooks/set-state-in-effect': 'warn',
      // Date.now() and similar impure calls in render are acceptable for relative-time display
      'react-hooks/purity': 'warn',
      // Manual memoization preservation warnings — informational only, not blocking
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
])
