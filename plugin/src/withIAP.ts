import {
  WarningAggregator,
  withAppBuildGradle,
  withMainActivity,
  withProjectBuildGradle,
} from 'expo/config-plugins';
import {ConfigPlugin, createRunOncePlugin} from 'expo/config-plugins';

const pkg = require('../../package.json');

type PaymentProvider = 'Amazon AppStore' | 'both' | 'Play Store';

const hasPaymentProviderProperValue = (
  paymentProvider: string,
): paymentProvider is PaymentProvider => {
  return ['Amazon AppStore', 'Play Store', 'both'].includes(paymentProvider);
};

const linesToAdd: {[key in PaymentProvider]: string} = {
  ['Amazon AppStore']: `missingDimensionStrategy "store", "amazon"`,
  ['Play Store']: `missingDimensionStrategy "store", "play"`,
  ['both']: `flavorDimensions "appstore"

productFlavors {
  googlePlay {
    dimension "appstore"
    missingDimensionStrategy "store", "play"
  }

  amazon {
    dimension "appstore"
    missingDimensionStrategy "store", "amazon"
  }
}`,
};

const addLineToFile = (
  newLine: string,
  anchor: RegExp | string,
  offset: number,
  fileContents: string,
) => {
  const lines = fileContents.split('\n');
  const lineIndex = lines.findIndex((line) => line.match(anchor));

  if (lineIndex === -1) {
    console.warn(`Anchor "${anchor}" not found, skipping modification.`);
    return fileContents;
  }

  lines.splice(lineIndex + offset, 0, newLine);
  return lines.join('\n');
};

const addToBuildGradle = (
  newLine: string,
  anchor: RegExp | string,
  offset: number,
  buildGradle: string,
) => {
  return addLineToFile(newLine, anchor, offset, buildGradle);
};

const addToMainActivity = (
  newLine: string,
  anchor: RegExp | string,
  offset: number,
  mainActivity: string,
) => {
  return addLineToFile(newLine, anchor, offset, mainActivity);
};

export const modifyAppBuildGradle = (
  buildGradle: string,
  paymentProvider: PaymentProvider,
) => {
  if (paymentProvider === 'both') {
    if (buildGradle.includes(`flavorDimensions "appstore"`)) {
      return buildGradle;
    }
    return addToBuildGradle(
      linesToAdd[paymentProvider],
      'defaultConfig',
      -1,
      buildGradle,
    );
  }

  const missingDimensionStrategy = linesToAdd[paymentProvider];
  if (buildGradle.includes(missingDimensionStrategy)) {
    return buildGradle;
  }
  return addToBuildGradle(
    missingDimensionStrategy,
    'defaultConfig',
    1,
    buildGradle,
  );
};

export const modifyProjectBuildGradle = (buildGradle: string) => {
  const supportLibVersion = `supportLibVersion = "28.0.0"`;
  if (buildGradle.includes(supportLibVersion)) {
    return buildGradle;
  }
  return addToBuildGradle(supportLibVersion, 'ext', 1, buildGradle);
};

export const modifyMainActivity = (
  mainActivity: string,
  paymentProvider: PaymentProvider,
) => {
  // These lines only need to be added if Amazon Store is a target
  if (paymentProvider === 'Play Store') return mainActivity;

  const importLine = 'import com.dooboolab.rniap.RNIapActivityListener';
  const listener = 'RNIapActivityListener.registerActivity(this)';
  if (!mainActivity.includes(importLine)) {
    mainActivity = addToMainActivity(
      importLine,
      'import expo.modules.ReactActivityDelegateWrapper',
      1,
      mainActivity,
    );
  }
  if (!mainActivity.includes(listener)) {
    mainActivity = addToMainActivity(
      listener,
      'super.onCreate',
      1,
      mainActivity,
    );
  }
  return mainActivity;
};

const withIAPAndroid: ConfigPlugin<{paymentProvider: PaymentProvider}> = (
  config,
  {paymentProvider},
) => {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  config = withAppBuildGradle(config, (config) => {
    config.modResults.contents = modifyAppBuildGradle(
      config.modResults.contents,
      paymentProvider,
    );
    return config;
  });

  // eslint-disable-next-line @typescript-eslint/no-shadow
  config = withProjectBuildGradle(config, (config) => {
    config.modResults.contents = modifyProjectBuildGradle(
      config.modResults.contents,
    );
    return config;
  });

  // eslint-disable-next-line @typescript-eslint/no-shadow
  config = withMainActivity(config, (config) => {
    config.modResults.contents = modifyMainActivity(
      config.modResults.contents,
      paymentProvider,
    );
    return config;
  });

  return config;
};

interface Props {
  paymentProvider?: PaymentProvider;
}

const withIAP: ConfigPlugin<Props | undefined> = (config, props) => {
  const paymentProvider = props?.paymentProvider ?? 'Play Store';

  if (!hasPaymentProviderProperValue(paymentProvider)) {
    WarningAggregator.addWarningAndroid(
      'react-native-iap',

      `The payment provider '${paymentProvider}' is not supported. Please update your app.json file with one of the following supported values: 'Play Store', 'Amazon AppStore', or 'both'.`,
    );
    return config;
  }
  try {
    config = withIAPAndroid(config, {paymentProvider});
  } catch (error) {
    WarningAggregator.addWarningAndroid(
      'react-native-iap',

      `There was a problem configuring react-native-iap in your native Android project: ${error}`,
    );
  }

  return config;
};

export default createRunOncePlugin(withIAP, pkg.name, pkg.version);
