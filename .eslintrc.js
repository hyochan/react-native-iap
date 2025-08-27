module.exports = {
  root: true,
  extends: ['expo', 'plugin:eslint-comments/recommended', 'prettier'],
  plugins: ['prettier', 'eslint-comments'],
  rules: {
    'prettier/prettier': process.env.CI ? 'error' : 'warn',
    'eslint-comments/no-unlimited-disable': 'warn',
    'eslint-comments/no-unused-disable': 'warn',
  },
};
