import js from '@eslint/js'
import node from 'eslint-plugin-node'
import prettier from 'eslint-config-prettier'

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        global: 'readonly'
      }
    },
    plugins: {
      node
    },
    rules: {
      'no-console': 'off',
      'node/no-unsupported-features/es-syntax': 'off',
      'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }]
    }
  },
  prettier
] 