import plugin from '../src/withIAP';

// Mock config-plugins with simple pass-through helpers that immediately run mods
jest.mock('expo/config-plugins', () => ({
  createRunOncePlugin: (fn: any) => fn,
  withAndroidManifest: (config: any, action: any) => {
    const original = config.modResults;
    const cfg = {...config, modResults: original.manifest ?? {}};
    const result = action(cfg);
    const updated = {...original, manifest: result.modResults};
    return {...config, modResults: updated};
  },
  withAppBuildGradle: (config: any, action: any) => {
    const original = config.modResults;
    const cfg = {...config, modResults: {contents: original.contents}};
    const result = action(cfg);
    const updated = {...original, contents: result.modResults.contents};
    return {...config, modResults: updated};
  },
  withInfoPlist: (config: any, action: any) => {
    const original = config.modResults;
    const cfg = {...config, modResults: original.plist ?? {}};
    const result = action(cfg);
    const updated = {...original, plist: result.modResults};
    return {...config, modResults: updated};
  },
  withEntitlementsPlist: (config: any, action: any) => {
    const original = config.modResults;
    const cfg = {...config, modResults: original.entitlements ?? {}};
    const result = action(cfg);
    const updated = {...original, entitlements: result.modResults};
    return {...config, modResults: updated};
  },
  withPodfile: (config: any, action: any) => {
    const original = config.modResults;
    const cfg = {...config, modResults: {contents: original.podfile ?? ''}};
    const result = action(cfg);
    const updated = {...original, podfile: result.modResults.contents};
    return {...config, modResults: updated};
  },
  WarningAggregator: {
    addWarningAndroid: jest.fn(),
    addWarningIOS: jest.fn(),
  },
}));

describe('withIAP config plugin (iOS)', () => {
  const originalLog = console.log;
  const originalWarn = console.warn;

  beforeEach(() => {
    jest.resetModules();
    console.log = jest.fn();
    console.warn = jest.fn();
  });

  afterEach(() => {
    console.log = originalLog;
    console.warn = originalWarn;
  });

  function makeConfig(options?: {
    gradle?: string;
    manifest?: any;
    plist?: any;
    entitlements?: any;
    podfile?: string;
  }) {
    return {
      modResults: {
        contents: options?.gradle ?? 'dependencies {\n}',
        manifest: options?.manifest ?? {manifest: {application: [{}]}},
        plist: options?.plist ?? {},
        entitlements: options?.entitlements ?? {},
        podfile: options?.podfile ?? '',
      },
    } as any;
  }

  it('adds IAPKit API key to Info.plist when provided', () => {
    const config = makeConfig();
    const res: any = plugin(config as any, {iapkitApiKey: 'test-ios-api-key'});
    expect(res.modResults.plist.IAPKitAPIKey).toBe('test-ios-api-key');
  });

  it('does not add IAPKit API key to Info.plist when not provided', () => {
    const config = makeConfig();
    const res: any = plugin(config as any);
    expect(res.modResults.plist.IAPKitAPIKey).toBeUndefined();
  });

  it('does not overwrite existing IAPKit API key in Info.plist', () => {
    const config = makeConfig({plist: {IAPKitAPIKey: 'existing-key'}});
    const res: any = plugin(config as any, {iapkitApiKey: 'new-key'});
    expect(res.modResults.plist.IAPKitAPIKey).toBe('existing-key');
  });
});
