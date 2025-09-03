// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config')
const expoConfig = require('eslint-config-expo/flat')

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    rules: {
      // Disable import resolution for react-native-iap since it's locally linked
      'import/no-unresolved': [
        'error',
        {
          ignore: ['^react-native-iap$'],
        },
      ],
    },
  },
])
