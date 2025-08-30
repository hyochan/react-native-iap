const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')
const path = require('path')

const defaultConfig = getDefaultConfig(__dirname)

const config = {
  watchFolders: [path.resolve(__dirname, '..')],
  resolver: {
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname, '../node_modules'),
    ],
    extraNodeModules: {
      'react-native-iap': path.resolve(__dirname, '..'),
    },
    // Remove blockList to allow resolution of react-native
    blockList: [
      // Only block test files
      /.*\/__tests__\/.*/,
      /.*\.test\.(js|jsx|ts|tsx)$/,
      /.*\.spec\.(js|jsx|ts|tsx)$/,
    ],
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
}

module.exports = mergeConfig(defaultConfig, config)
