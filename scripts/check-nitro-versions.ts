#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

const rootPackageJson: PackageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')
);

const examplePackageJson: PackageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../example/package.json'), 'utf8')
);

const rootNitroVersion =
  rootPackageJson.devDependencies?.['react-native-nitro-modules'];
const rootNitroCodegenVersion =
  rootPackageJson.devDependencies?.['nitro-codegen'];
const exampleNitroVersion =
  examplePackageJson.dependencies?.['react-native-nitro-modules'];

console.log('🔍 Checking Nitro Modules versions...');
console.log(`   Root package.json:`);
console.log(`     - react-native-nitro-modules: ${rootNitroVersion}`);
console.log(`     - nitro-codegen: ${rootNitroCodegenVersion}`);
console.log(`   Example package.json:`);
console.log(`     - react-native-nitro-modules: ${exampleNitroVersion}`);

const normalizeVersion = (version: string | undefined): string => {
  if (!version) return '';
  return version.replace(/[\^~]/, '');
};

const rootNitroNormalized = normalizeVersion(rootNitroVersion);
const exampleNitroNormalized = normalizeVersion(exampleNitroVersion);

if (!rootNitroVersion || !exampleNitroVersion) {
  console.error('\n❌ Missing Nitro Modules dependency!');
  if (!rootNitroVersion) {
    console.error(
      '   react-native-nitro-modules not found in root package.json'
    );
  }
  if (!exampleNitroVersion) {
    console.error(
      '   react-native-nitro-modules not found in example/package.json'
    );
  }
  process.exit(1);
}

if (rootNitroNormalized !== exampleNitroNormalized) {
  console.error('\n❌ Version mismatch detected!');
  console.error(
    `   Root has ${rootNitroVersion} but example has ${exampleNitroVersion}`
  );
  console.error(
    '   Please update example/package.json to match the root version.'
  );
  process.exit(1);
}

const rootCodegenNormalized = normalizeVersion(rootNitroCodegenVersion);
if (rootCodegenNormalized && rootNitroNormalized !== rootCodegenNormalized) {
  console.warn(
    '\n⚠️  Warning: nitro-codegen version differs from react-native-nitro-modules'
  );
  console.warn(`   Consider aligning both to the same version.`);
}

console.log('\n✅ Nitro Modules versions are in sync!');