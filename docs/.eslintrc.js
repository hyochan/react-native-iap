module.exports = {
  env: {
    browser: true,
    node: true,
  },
  extends: ['eslint:recommended', '@docusaurus/eslint-plugin/recommended'],
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
  },
  rules: {
    'import/no-unresolved': [
      'error',
      {
        ignore: ['^@docusaurus/', '^@site/', '^@theme/', '^@generated/'],
      },
    ],
  },
};
