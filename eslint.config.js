import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    'node_modules',
    'content/node_modules',
    'tools/proposal-builder/output',
    'tools/proposal-builder/test',
    'test-results',
    'playwright-report',
    'public/proposals',
    'sales/proposals',
    'scripts/tile_cache',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      // Keep migration velocity: track `any` debt without blocking real errors.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}', 'content/src/**/*.{ts,tsx}'],
    extends: [
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    rules: {
      // These React compiler rules are useful, but the current app needs a staged cleanup.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components': 'warn',
      'react-refresh/only-export-components': 'warn',
    },
  },
  {
    files: ['content/**/*.{ts,tsx}'],
    rules: {
      // Content/ReMotion scenes often keep alternates during production work.
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },
])
