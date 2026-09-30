module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  extends: ['eslint:recommended'],
  rules: {
    // TypeScript checks names and unused declarations more accurately.
    'no-undef': 'off',
    'no-unused-vars': 'off',
  },
}
