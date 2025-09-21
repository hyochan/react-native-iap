import {
  createRunOncePlugin,
  WarningAggregator,
  withAndroidManifest,
  withAppBuildGradle,
  withPodfile,
} from 'expo/config-plugins';
import type {ConfigPlugin} from 'expo/config-plugins';
import type {ExpoConfig} from '@expo/config-types';
import {readFileSync} from 'node:fs';
import {resolve as resolvePath} from 'node:path';

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

function loadOpenIapConfig(): {google: string} {
  const versionsPath = resolvePath(__dirname, '../../openiap-versions.json');
  try {
    const raw = readFileSync(versionsPath, 'utf8');
    const parsed = JSON.parse(raw);
    const googleVersion =
      typeof parsed?.google === 'string' ? parsed.google.trim() : '';
    if (!googleVersion) {
      throw new Error(
        'react-native-iap: "google" version missing or invalid in openiap-versions.json',
      );
    }
    return {google: googleVersion};
  } catch (error) {
    throw new Error(
      `react-native-iap: Unable to load openiap-versions.json (${error instanceof Error ? error.message : error})`,
    );
  }
}

let cachedOpenIapVersion: string | null = null;
const getOpenIapVersion = (): string => {
  if (cachedOpenIapVersion) {
    return cachedOpenIapVersion;
  }
  cachedOpenIapVersion = loadOpenIapConfig().google;
  return cachedOpenIapVersion;
};

const modifyAppBuildGradle = (gradle: string): string => {
  let modified = gradle;

  let openiapVersion: string;
  try {
    openiapVersion = getOpenIapVersion();
  } catch (error) {
    WarningAggregator.addWarningAndroid(
      'react-native-iap',
      `react-native-iap: Failed to resolve OpenIAP version (${error instanceof Error ? error.message : error})`,
    );
    return gradle;
  }

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

  const openiapDep = `    implementation "${OPENIAP_COORD}:${openiapVersion}"`;

  if (!modified.includes(OPENIAP_COORD)) {
    if (!/dependencies\s*{/.test(modified)) {
      modified += `\n\ndependencies {\n${openiapDep}\n}\n`;
    } else {
      modified = addLineToGradle(modified, /dependencies\s*{/, openiapDep);
    }
    if (!hasLoggedPluginExecution) {
      console.log(
        `🛠️ react-native-iap: Added OpenIAP (${openiapVersion}) to build.gradle`,
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

type IapPluginProps = {
  ios?: {
    // Enable to inject Folly coroutine-disabling macros into Podfile during prebuild
    'with-folly-no-coroutines'?: boolean;
    // @deprecated Use 'with-folly-no-coroutines'. Kept for backward compatibility.
    'with-folly-no-couroutines'?: boolean;
  };
};

const withIapIosFollyWorkaround: ConfigPlugin<IapPluginProps | undefined> = (
  config,
  props,
) => {
  const newKey = props?.ios?.['with-folly-no-coroutines'];
  const oldKey = props?.ios?.['with-folly-no-couroutines'];
  if (oldKey && !hasLoggedPluginExecution) {
    // Temporary deprecation notice; remove when old key is dropped
    WarningAggregator.addWarningIOS(
      'react-native-iap',
      "react-native-iap: 'ios.with-folly-no-couroutines' is deprecated; use 'ios.with-folly-no-coroutines'.",
    );
  }
  const enabled = !!(newKey ?? oldKey);
  if (!enabled) return config;

  return withPodfile(config, (config) => {
    let contents = config.modResults.contents;

    // Idempotency: if any of the defines already exists, assume it's applied
    if (
      contents.includes('FOLLY_CFG_NO_COROUTINES') ||
      contents.includes('FOLLY_HAS_COROUTINES=0')
    ) {
      return config;
    }

    const anchor = 'post_install do |installer|';
    const snippet = `
  # react-native-iap (expo): Disable Folly coroutines to avoid including non-vendored <folly/coro/*> headers
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      defs = (config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] || ['$(inherited)'])
      defs << 'FOLLY_NO_CONFIG=1' unless defs.any? { |d| d.to_s.include?('FOLLY_NO_CONFIG') }
      # Portability.h respects FOLLY_CFG_NO_COROUTINES to fully disable coroutine support
      defs << 'FOLLY_CFG_NO_COROUTINES=1' unless defs.any? { |d| d.to_s.include?('FOLLY_CFG_NO_COROUTINES') }
      defs << 'FOLLY_HAS_COROUTINES=0' unless defs.any? { |d| d.to_s.include?('FOLLY_HAS_COROUTINES') }
      config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = defs
    end
  end`;

    if (contents.includes(anchor)) {
      contents = contents.replace(anchor, `${anchor}\n${snippet}`);
    } else {
      // As a fallback, append a new post_install block
      contents += `

${anchor}
${snippet}
end
`;
    }

    config.modResults.contents = contents;
    return config;
  });
};

const withIAP: ConfigPlugin<IapPluginProps | undefined> = (config, props) => {
  try {
    let result = withIapAndroid(config);
    result = withIapIosFollyWorkaround(result, props);
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

// Standard Expo config plugin export
// Export a test-friendly wrapper that accepts 1 or 2 args
type IapPluginCallable = {
  (config: ExpoConfig): ExpoConfig;
  (config: ExpoConfig, props?: IapPluginProps): ExpoConfig;
};

const _wrapped = createRunOncePlugin(
  withIAP,
  pkg.name,
  pkg.version,
) as unknown as (
  config: ExpoConfig,
  props: IapPluginProps | undefined,
) => ExpoConfig;

const pluginExport: IapPluginCallable = ((
  config: ExpoConfig,
  props?: IapPluginProps,
) => _wrapped(config, props)) as unknown as IapPluginCallable;

export {pluginExport as default};
