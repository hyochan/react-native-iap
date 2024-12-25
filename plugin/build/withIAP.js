"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.modifyProjectBuildGradle = exports.modifyAppBuildGradle = void 0;
const config_plugins_1 = require("expo/config-plugins");
const config_plugins_2 = require("expo/config-plugins");
const pkg = require('../../package.json');
const hasPaymentProviderProperValue = (paymentProvider) => {
    return ['Amazon AppStore', 'Play Store', 'both'].includes(paymentProvider);
};
const linesToAdd = {
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
const addToBuildGradle = (newLine, anchor, offset, buildGradle) => {
    const lines = buildGradle.split('\n');
    const lineIndex = lines.findIndex((line) => line.match(anchor));
    // add after given line
    lines.splice(lineIndex + offset, 0, newLine);
    return lines.join('\n');
};
const modifyAppBuildGradle = (buildGradle, paymentProvider) => {
    if (paymentProvider === 'both') {
        if (buildGradle.includes(`flavorDimensions "appstore"`)) {
            return buildGradle;
        }
        return addToBuildGradle(linesToAdd[paymentProvider], 'defaultConfig', -1, buildGradle);
    }
    const missingDimensionStrategy = linesToAdd[paymentProvider];
    if (buildGradle.includes(missingDimensionStrategy)) {
        return buildGradle;
    }
    return addToBuildGradle(missingDimensionStrategy, 'defaultConfig', 1, buildGradle);
};
exports.modifyAppBuildGradle = modifyAppBuildGradle;
const withIAPAndroid = (config, { paymentProvider }) => {
    // eslint-disable-next-line @typescript-eslint/no-shadow
    config = (0, config_plugins_1.withAppBuildGradle)(config, (config) => {
        config.modResults.contents = (0, exports.modifyAppBuildGradle)(config.modResults.contents, paymentProvider);
        return config;
    });
    return config;
};
const withIAP = (config, props) => {
    const paymentProvider = props?.paymentProvider ?? 'Play Store';
    if (!hasPaymentProviderProperValue(paymentProvider)) {
        config_plugins_1.WarningAggregator.addWarningAndroid('react-native-iap', `The payment provider '${paymentProvider}' is not supported. Please update your app.json file with one of the following supported values: 'Play Store', 'Amazon AppStore', or 'both'.`);
        return config;
    }
    try {
        config = withIAPAndroid(config, { paymentProvider });
    }
    catch (error) {
        config_plugins_1.WarningAggregator.addWarningAndroid('react-native-iap', `There was a problem configuring react-native-iap in your native Android project: ${error}`);
    }
    return config;
};
exports.default = (0, config_plugins_2.createRunOncePlugin)(withIAP, pkg.name, pkg.version);
