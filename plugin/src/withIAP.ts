import {
  WarningAggregator,
  withAppBuildGradle,
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

const addToBuildGradle = (
  newLine: string,
  anchor: RegExp | string,
  offset: number,
  buildGradle: string,
) => {
  const lines = buildGradle.split('\n');
  const lineIndex = lines.findIndex((line) => line.match(anchor));
  // add after given line
  lines.splice(lineIndex + offset, 0, newLine);
  return lines.join('\n');
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
