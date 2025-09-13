import {
  createRunOncePlugin,
  WarningAggregator,
  withAndroidManifest,
  withAppBuildGradle,
} from 'expo/config-plugins';
import type {ConfigPlugin} from 'expo/config-plugins';

const pkg = require('../../package.json');

// Global flag to prevent duplicate logs
let hasLoggedPluginExecution = false;

const addLineToGradle = (
  content: string,
  anchor: RegExp | string,
  lineToAdd: string,
  offset: number = 1,
): string => {
  const lines = content.split('\n');
  const index = lines.findIndex((line) => line.match(anchor));
  if (index === -1) {
    console.warn(
      `Anchor "${anchor}" not found in build.gradle. Appending to end.`,
    );
    lines.push(lineToAdd);
  } else {
    lines.splice(index + offset, 0, lineToAdd);
  }
  return lines.join('\n');
};

export const modifyProjectBuildGradle = (gradle: string): string => {
  // Keep backward-compatible behavior: add supportLibVersion inside ext { } if missing
  if (!gradle.includes('supportLibVersion')) {
    const lines = gradle.split('\n');
    const extIndex = lines.findIndex((line) => line.trim() === 'ext {');
    if (extIndex !== -1) {
      lines.splice(extIndex + 1, 0, 'supportLibVersion = "28.0.0"');
      return lines.join('\n');
    }
  }
  return gradle;
};

const OPENIAP_COORD = 'io.github.hyochan.openiap:openiap-google';
const OPENIAP_VERSION = '1.1.0';

const modifyAppBuildGradle = (gradle: string): string => {
  let modified = gradle;

  // Replace legacy Billing/GMS instructions with OpenIAP Google library
  // Remove any old billingclient or play-services-base lines we may have added previously
  modified = modified
    .replace(
      /^[ \t]*(implementation|api)[ \t]+["']com\.android\.billingclient:billing-ktx:[^"']+["'][ \t]*$/gim,
      '',
    )
    .replace(
      /^[ \t]*(implementation|api)[ \t]+["']com\.google\.android\.gms:play-services-base:[^"']+["'][ \t]*$/gim,
      '',
    )
    .replace(/\n{3,}/g, '\n\n');

  const openiapDep = `    implementation "${OPENIAP_COORD}:${OPENIAP_VERSION}"`;

  if (!modified.includes(OPENIAP_COORD)) {
    if (!/dependencies\s*{/.test(modified)) {
      modified += `\n\ndependencies {\n${openiapDep}\n}\n`;
    } else {
      modified = addLineToGradle(modified, /dependencies\s*{/, openiapDep);
    }
    if (!hasLoggedPluginExecution) {
      console.log(
        `🛠️ react-native-iap: Added OpenIAP (${OPENIAP_VERSION}) to build.gradle`,
      );
    }
  }

  return modified;
};

const withIapAndroid: ConfigPlugin = (config) => {
  // Add OpenIAP dependency to app build.gradle
  config = withAppBuildGradle(config, (config) => {
    config.modResults.contents = modifyAppBuildGradle(
      config.modResults.contents,
    );
    return config;
  });

  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    if (!manifest.manifest['uses-permission']) {
      manifest.manifest['uses-permission'] = [];
    }

    const permissions = manifest.manifest['uses-permission'];
    const billingPerm = {$: {'android:name': 'com.android.vending.BILLING'}};

    const alreadyExists = permissions.some(
      (p) => p.$['android:name'] === 'com.android.vending.BILLING',
    );
    if (!alreadyExists) {
      permissions.push(billingPerm);
      if (!hasLoggedPluginExecution) {
        console.log(
          '✅ Added com.android.vending.BILLING to AndroidManifest.xml',
        );
      }
    } else {
      if (!hasLoggedPluginExecution) {
        console.log(
          'ℹ️ com.android.vending.BILLING already exists in AndroidManifest.xml',
        );
      }
    }

    return config;
  });

  return config;
};

const withIAP: ConfigPlugin = (config, _props) => {
  try {
    const result = withIapAndroid(config);
    // Set flag after first execution to prevent duplicate logs
    hasLoggedPluginExecution = true;
    return result;
  } catch (error) {
    WarningAggregator.addWarningAndroid(
      'react-native-iap',
      `react-native-iap plugin encountered an error: ${error}`,
    );
    console.error('react-native-iap plugin error:', error);
    return config;
  }
};

export default createRunOncePlugin(withIAP, pkg.name, pkg.version);
