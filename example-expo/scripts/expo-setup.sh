#!/bin/bash

echo "📦 Setting up react-native-iap for development..."

# Go to root directory
cd ..

# Install root dependencies first
echo "🔧 Installing root dependencies with yarn..."
yarn install

# Clean and create react-native-iap directory in node_modules
echo "📁 Preparing node_modules/react-native-iap directory..."
rm -rf example-expo/node_modules/react-native-iap
mkdir -p example-expo/node_modules/react-native-iap

# Create symlinks for development (TypeScript sources and native code)
echo "🔗 Creating symlinks for development..."

# Link source directories
ln -sf "$(pwd)/src" example-expo/node_modules/react-native-iap/src
ln -sf "$(pwd)/ios" example-expo/node_modules/react-native-iap/ios
ln -sf "$(pwd)/android" example-expo/node_modules/react-native-iap/android
ln -sf "$(pwd)/plugin" example-expo/node_modules/react-native-iap/plugin

# Copy essential files (not symlink to avoid issues)
cp package.json example-expo/node_modules/react-native-iap/
cp README.md example-expo/node_modules/react-native-iap/ 2>/dev/null || true
cp tsconfig.json example-expo/node_modules/react-native-iap/ 2>/dev/null || true
cp nitro.json example-expo/node_modules/react-native-iap/ 2>/dev/null || true
cp react-native.config.js example-expo/node_modules/react-native-iap/
cp NitroIap.podspec example-expo/node_modules/react-native-iap/ 2>/dev/null || true
# Also copy as react-native-iap.podspec for CocoaPods compatibility
cp NitroIap.podspec example-expo/node_modules/react-native-iap/react-native-iap.podspec 2>/dev/null || true
sed -i '' 's/s.name.*=.*"NitroIap"/s.name         = "react-native-iap"/' example-expo/node_modules/react-native-iap/react-native-iap.podspec 2>/dev/null || true
cp app.plugin.js example-expo/node_modules/react-native-iap/ 2>/dev/null || true

# Build the plugin
echo "🔨 Building plugin..."
yarn build:plugin

# Build the library
echo "🔨 Building library..."
yarn prepare

# Copy built files
echo "📂 Copying built files..."
cp -r lib example-expo/node_modules/react-native-iap/ 2>/dev/null || true
cp -r nitrogen example-expo/node_modules/react-native-iap/ 2>/dev/null || true

# Copy nitrogen generated files (already includes all necessary files)
if [ -d "nitrogen/generated" ]; then
    echo "📋 Copying all nitrogen generated files..."
    cp -r nitrogen/generated/* example-expo/node_modules/react-native-iap/nitrogen/generated/ 2>/dev/null || true
    echo "✅ Nitrogen files copied successfully"
fi

# Return to example-expo directory
cd example-expo

# Install example-expo dependencies
echo "📦 Installing example-expo dependencies with bun..."
bun install

echo "✅ Successfully set up react-native-iap for development!"
echo "📝 You can now edit TypeScript files in the root src/ directory"
echo "🔄 Run 'yarn prepare' in root to rebuild after changes"
echo ""
echo "🚀 Next steps:"
echo "   1. Run 'bun prebuild' to generate native code (iOS/Android)"
echo "      (This will automatically fix the Podfile path)"
echo "   2. cd ios && pod install"
echo "   4. iOS: bun ios (for simulator) or bun ios --device (for device)"
echo "   5. Android: bun android"
echo ""
echo "🔧 If iOS build fails, try:"
echo "   1. cd ios && xcodebuild clean"
echo "   2. cd ios && pod deintegrate && pod install"
echo "   3. Clean build folder in Xcode (Cmd+Shift+K)"