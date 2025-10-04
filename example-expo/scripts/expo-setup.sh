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

# Copy all necessary directories and files
echo "📁 Copying source directories..."
cp -r src example-expo/node_modules/react-native-iap/
cp -r ios example-expo/node_modules/react-native-iap/
cp -r android example-expo/node_modules/react-native-iap/

# Copy essential files (not symlink to avoid issues)
echo "📄 Copying configuration files..."
cp package.json example-expo/node_modules/react-native-iap/
cp nitro.json example-expo/node_modules/react-native-iap/
cp NitroIap.podspec example-expo/node_modules/react-native-iap/
cp openiap-versions.json example-expo/node_modules/react-native-iap/
cp react-native.config.js example-expo/node_modules/react-native-iap/ 2>/dev/null || true
cp README.md example-expo/node_modules/react-native-iap/ 2>/dev/null || true
cp tsconfig.json example-expo/node_modules/react-native-iap/ 2>/dev/null || true
# Don't copy app.plugin.js here - will copy after building plugin

# Build the plugin
echo "🔨 Building plugin..."
yarn build:plugin

# Build the library
echo "🔨 Building library..."
yarn prepare

# Copy plugin directory after building
echo "📁 Copying plugin directory..."
if [ -d "plugin" ]; then
    cp -r plugin example-expo/node_modules/react-native-iap/
    echo "✅ plugin/ directory copied"
fi

# Copy app.plugin.js after plugin is built
cp app.plugin.js example-expo/node_modules/react-native-iap/

# Copy built files
echo "📂 Copying built files..."
if [ -d "lib" ]; then
    cp -r lib example-expo/node_modules/react-native-iap/
    echo "✅ lib/ directory copied"
fi

if [ -d "nitrogen" ]; then
    cp -r nitrogen example-expo/node_modules/react-native-iap/
    echo "✅ nitrogen/ directory copied"
fi

# Function to add generation comment to copied file
add_generation_comment() {
    local source_file=$1
    local target_file=$2
    local source_name=$(basename "$source_file")
    
    # Create temp file with comment and original content
    {
        echo "// Generated from example/screens/$source_name"
        echo "// This file is automatically copied during postinstall"
        echo "// Do not edit directly - modify the source file instead"
        echo ""
        cat "$source_file"
    } > "$target_file"
}

# Return to example-expo directory
cd example-expo
