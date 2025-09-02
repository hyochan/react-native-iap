#!/usr/bin/env node

/**
 * Fix Podfile for react-native-iap (NitroIap) integration
 * 
 * Why this script is needed:
 * --------------------------
 * When running `expo prebuild`, Expo's autolinking tries to find react-native-iap
 * in node_modules and generates an incorrect path: '../node_modules/react-native-iap'
 * 
 * However, in this monorepo setup, example-expo is not part of the yarn workspace,
 * and the actual library source is located at the root level (../../).
 * 
 * This script automatically fixes the Podfile after prebuild to point to the correct
 * path so that iOS builds can find the native NitroIap module properly.
 * 
 * What it does:
 * 1. Checks if Podfile exists
 * 2. Replaces incorrect path '../node_modules/react-native-iap' with '../../'
 * 3. Adds the pod line if it's missing entirely
 * 
 * Usage:
 * - Automatically runs after `bun prebuild` or `bunx expo prebuild`
 * - Can also be run manually: `node ./scripts/fix-podfile.js`
 */

const fs = require('fs');
const path = require('path');

function fixPodfile() {
  const podfilePath = path.join(__dirname, '..', 'ios', 'Podfile');
  
  // Check if Podfile exists
  if (!fs.existsSync(podfilePath)) {
    console.log('⚠️  Podfile not found. Run "bunx expo prebuild" first.');
    return;
  }
  
  // Read Podfile
  let podfileContent = fs.readFileSync(podfilePath, 'utf8');
  
  // Check if NitroIap pod line already exists
  if (podfileContent.includes("pod 'NitroIap'")) {
    // Replace the incorrect path with the correct one
    const incorrectPattern = /pod\s+['"]NitroIap['"]\s*,\s*:path\s*=>\s*['"]\.\.\/node_modules\/react-native-iap['"]/g;
    const correctLine = "  pod 'NitroIap', :path => '../../'";
    
    if (incorrectPattern.test(podfileContent)) {
      podfileContent = podfileContent.replace(incorrectPattern, correctLine);
      fs.writeFileSync(podfilePath, podfileContent);
      console.log('✅ Fixed NitroIap path in Podfile');
    } else {
      console.log('✅ NitroIap path is already correct');
    }
  } else {
    // Add the pod line after use_expo_modules!
    const useExpoModulesPattern = /(\s*use_expo_modules!\s*\n)/;
    
    if (useExpoModulesPattern.test(podfileContent)) {
      const podLine = "  \n  # Manually add react-native-iap since it's not picked up by autolinking\n  pod 'NitroIap', :path => '../../'\n";
      podfileContent = podfileContent.replace(useExpoModulesPattern, '$1' + podLine);
      fs.writeFileSync(podfilePath, podfileContent);
      console.log('✅ Added NitroIap pod to Podfile');
    } else {
      console.log('⚠️  Could not find use_expo_modules! line in Podfile');
    }
  }
}

// Run the fix
fixPodfile();