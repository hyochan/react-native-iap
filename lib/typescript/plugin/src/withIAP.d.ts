import type { ConfigPlugin } from 'expo/config-plugins';
import type { ExpoConfig } from '@expo/config-types';
export declare const modifyProjectBuildGradle: (gradle: string) => string;
export interface IosAlternativeBillingConfig {
    /** Country codes where external purchases are supported (ISO 3166-1 alpha-2) */
    countries?: string[];
    /** External purchase URLs per country (iOS 15.4+) */
    links?: Record<string, string>;
    /** Multiple external purchase URLs per country (iOS 17.5+, up to 5 per country) */
    multiLinks?: Record<string, string[]>;
    /** Custom link regions (iOS 18.1+) */
    customLinkRegions?: string[];
    /** Streaming link regions for music apps (iOS 18.2+) */
    streamingLinkRegions?: string[];
    /** Enable external purchase link entitlement */
    enableExternalPurchaseLink?: boolean;
    /** Enable external purchase link streaming entitlement (music apps only) */
    enableExternalPurchaseLinkStreaming?: boolean;
}
/** Add external purchase entitlements and Info.plist configuration */
declare const withIosAlternativeBilling: ConfigPlugin<IosAlternativeBillingConfig | undefined>;
type IapPluginProps = {
    ios?: {
        'with-folly-no-coroutines'?: boolean;
        'with-folly-no-couroutines'?: boolean;
    };
    /**
     * iOS Alternative Billing configuration.
     * Configure external purchase countries, links, and entitlements.
     * Requires approval from Apple.
     * @platform ios
     */
    iosAlternativeBilling?: IosAlternativeBillingConfig;
    /**
     * IAPKit API key for purchase verification.
     * This key will be added to AndroidManifest.xml (as meta-data) and Info.plist.
     * Get your API key from https://iapkit.com
     */
    iapkitApiKey?: string;
};
type IapPluginCallable = {
    (config: ExpoConfig): ExpoConfig;
    (config: ExpoConfig, props?: IapPluginProps): ExpoConfig;
};
declare const pluginExport: IapPluginCallable;
export { withIosAlternativeBilling };
export { pluginExport as default };
//# sourceMappingURL=withIAP.d.ts.map